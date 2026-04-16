"""PDF upload and extraction endpoint."""

import json
import tempfile
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent
PAPERS_FILE = DATA_DIR / "papers.jsonl"


@router.post("")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")

    try:
        import tool  # type: ignore — from scripts/tool.py via sys.path

        content = await file.read()
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # Use tool.py's extraction functions
        text = tool.extract_pdf_text(tmp_path)
        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not extract text from PDF")

        # Analyze with LLM if configured
        config = tool.load_config()
        if config:
            paper_data = tool.analyze_paper(text, config)
        else:
            paper_data = {
                "id": Path(file.filename).stem,
                "title": Path(file.filename).stem.replace("_", " ").replace("-", " ").title(),
                "authors": [],
                "raw_text": text[:5000],
            }

        # Append to papers.jsonl
        with open(PAPERS_FILE, "a") as f:
            f.write(json.dumps(paper_data, ensure_ascii=False) + "\n")

        return paper_data

    except ImportError:
        raise HTTPException(status_code=500, detail="tool.py not found. Ensure scripts/ is in path.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
