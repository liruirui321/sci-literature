"""Compare papers endpoint."""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent
PAPERS_FILE = DATA_DIR / "papers.jsonl"
REPORT_FILE = DATA_DIR / "compare_report.md"


@router.get("")
async def get_report():
    if REPORT_FILE.exists():
        return {"report": REPORT_FILE.read_text()}
    return {"report": ""}


@router.post("/generate")
async def generate_report():
    try:
        import tool  # type: ignore

        papers = []
        if PAPERS_FILE.exists():
            for line in PAPERS_FILE.read_text().strip().split("\n"):
                if line.strip():
                    try:
                        papers.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue

        if len(papers) < 2:
            raise HTTPException(status_code=400, detail="Need at least 2 papers")

        config = tool.load_config()
        if not config:
            raise HTTPException(status_code=500, detail="No API config found. Set up config.yaml.")

        report = tool.compare_papers(papers, config)
        REPORT_FILE.write_text(report)
        return {"report": report}

    except ImportError:
        raise HTTPException(status_code=500, detail="tool.py not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
