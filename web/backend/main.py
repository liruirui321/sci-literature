"""
SCI Literature Web Backend — Optional local FastAPI server.

Wraps scripts/tool.py functionality as REST endpoints.
Run: uvicorn main:app --reload
"""

import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add project root to path so we can import tool.py
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from routers import papers, upload, kg, compare, ask

app = FastAPI(
    title="SCI Literature API",
    version="1.0.0",
    description="Optional backend for SCI Literature web app — PDF extraction & LLM analysis",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(papers.router, prefix="/api/papers", tags=["papers"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(kg.router, prefix="/api/kg", tags=["knowledge-graph"])
app.include_router(compare.router, prefix="/api/compare", tags=["compare"])
app.include_router(ask.router, prefix="/api/ask", tags=["ask"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
