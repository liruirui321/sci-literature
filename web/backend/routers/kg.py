"""Knowledge graph endpoints."""

import json
from pathlib import Path
from fastapi import APIRouter

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent
KG_FILE = DATA_DIR / "knowledge_graph.json"
PAPERS_FILE = DATA_DIR / "papers.jsonl"


@router.get("")
async def get_kg():
    if KG_FILE.exists():
        return json.loads(KG_FILE.read_text())
    return {"nodes": [], "edges": []}


@router.post("/rebuild")
async def rebuild_kg():
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
            return {"nodes": [], "edges": []}

        config = tool.load_config()
        kg = tool.build_knowledge_graph(papers, config)
        KG_FILE.write_text(json.dumps(kg, ensure_ascii=False, indent=2))
        return kg

    except ImportError:
        # Build simple KG without tool.py
        return _build_simple_kg()
    except Exception as e:
        return {"error": str(e)}


def _build_simple_kg():
    papers = []
    if PAPERS_FILE.exists():
        for line in PAPERS_FILE.read_text().strip().split("\n"):
            if line.strip():
                try:
                    papers.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

    nodes = []
    edges = []
    seen = set()

    for p in papers:
        pid = f"paper:{p.get('id', '')}"
        if pid not in seen:
            nodes.append({"id": pid, "label": p.get("title", ""), "type": "paper"})
            seen.add(pid)

        for author in p.get("authors", []):
            aid = f"author:{author}"
            if aid not in seen:
                nodes.append({"id": aid, "label": author, "type": "author"})
                seen.add(aid)
            edges.append({"source": aid, "target": pid, "relation": "authored"})

        for kw in p.get("keywords", []):
            kid = f"keyword:{kw.lower()}"
            if kid not in seen:
                nodes.append({"id": kid, "label": kw, "type": "keyword"})
                seen.add(kid)
            edges.append({"source": pid, "target": kid, "relation": "has_keyword"})

    result = {"nodes": nodes, "edges": edges}
    KG_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    return result
