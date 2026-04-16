"""Papers CRUD endpoints."""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent
PAPERS_FILE = DATA_DIR / "papers.jsonl"


def _load_papers() -> list[dict]:
    if not PAPERS_FILE.exists():
        return []
    papers = []
    for line in PAPERS_FILE.read_text().strip().split("\n"):
        if line.strip():
            try:
                papers.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return papers


def _save_papers(papers: list[dict]):
    PAPERS_FILE.write_text("\n".join(json.dumps(p, ensure_ascii=False) for p in papers) + "\n")


@router.get("")
async def list_papers():
    return _load_papers()


@router.get("/{paper_id}")
async def get_paper(paper_id: str):
    for p in _load_papers():
        if p.get("id") == paper_id or p.get("doi") == paper_id:
            return p
    raise HTTPException(status_code=404, detail="Paper not found")


@router.delete("/{paper_id}")
async def delete_paper(paper_id: str):
    papers = _load_papers()
    filtered = [p for p in papers if p.get("id") != paper_id and p.get("doi") != paper_id]
    if len(filtered) == len(papers):
        raise HTTPException(status_code=404, detail="Paper not found")
    _save_papers(filtered)
    return {"deleted": paper_id}
