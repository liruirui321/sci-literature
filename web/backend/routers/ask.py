"""RAG Q&A endpoint."""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent
PAPERS_FILE = DATA_DIR / "papers.jsonl"


class AskRequest(BaseModel):
    question: str
    history: list[dict] = []


@router.post("")
async def ask_question(req: AskRequest):
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

        if not papers:
            raise HTTPException(status_code=400, detail="No papers loaded")

        config = tool.load_config()
        if not config:
            raise HTTPException(status_code=500, detail="No API config found")

        answer = tool.ask_question(req.question, papers, config, history=req.history)
        return {"answer": answer}

    except ImportError:
        raise HTTPException(status_code=500, detail="tool.py not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
