"""Индексация репо: chunking + embeddings → pgvector."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from modules.codeai import openrouter
from modules.codeai.models import CodeAIChunk, CodeAIProject

logger = logging.getLogger("codeai.indexer")

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".java", ".md",
}

SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", "dist", "build",
    ".next", ".venv", "venv", ".pytest_cache", ".mypy_cache",
}


def _iter_files(repo_path: str) -> Iterable[Path]:
    root = Path(repo_path)
    max_bytes = settings.codeai_max_file_size_kb * 1024
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(part in SKIP_DIRS for part in p.relative_to(root).parts):
            continue
        if p.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        try:
            if p.stat().st_size > max_bytes:
                continue
        except OSError:
            continue
        yield p


def _chunk_file(path: Path, repo_root: Path) -> list[dict]:
    """Sliding window: chunk_size строк с overlap."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    lines = text.splitlines()
    if not lines:
        return []

    size = max(1, settings.codeai_chunk_size)
    overlap = max(0, min(settings.codeai_chunk_overlap, size - 1))
    step = size - overlap

    rel_path = str(path.relative_to(repo_root))
    chunks: list[dict] = []
    i = 0
    while i < len(lines):
        block = lines[i : i + size]
        if not block:
            break
        chunks.append(
            {
                "file_path": rel_path,
                "start_line": i + 1,
                "end_line": i + len(block),
                "content": "\n".join(block),
            }
        )
        if i + size >= len(lines):
            break
        i += step
    return chunks


async def index_repo(
    db: AsyncSession, project_id: UUID, repo_path: str
) -> int:
    """Полная индексация репо. Возвращает количество chunks."""
    # Очистка старых chunks (полный reindex)
    await db.execute(
        delete(CodeAIChunk).where(CodeAIChunk.project_id == project_id)
    )
    await db.commit()

    all_chunks: list[dict] = []
    for f in _iter_files(repo_path):
        all_chunks.extend(_chunk_file(f, Path(repo_path)))

    if not all_chunks:
        logger.info("No files to index in %s", repo_path)
        await _mark_indexed(db, project_id)
        return 0

    # Embeddings — батчами по 32
    batch_size = 32
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i : i + batch_size]
        try:
            embeddings = await openrouter.get_embeddings_batch(
                [c["content"] for c in batch]
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("Embedding batch failed (%s/%s): %s", i, len(all_chunks), e)
            embeddings = [None] * len(batch)

        for chunk, emb in zip(batch, embeddings):
            db.add(
                CodeAIChunk(
                    project_id=project_id,
                    file_path=chunk["file_path"],
                    start_line=chunk["start_line"],
                    end_line=chunk["end_line"],
                    content=chunk["content"],
                    embedding=emb,
                )
            )
        await db.commit()

    await _mark_indexed(db, project_id)
    logger.info("Indexed %s chunks for project %s", len(all_chunks), project_id)
    return len(all_chunks)


async def _mark_indexed(db: AsyncSession, project_id: UUID) -> None:
    project = await db.get(CodeAIProject, project_id)
    if project is None:
        return
    project.is_indexed = True
    project.indexed_at = datetime.now(timezone.utc)
    await db.commit()


async def reindex_on_push(
    db: AsyncSession, project_id: UUID, repo_path: str
) -> int:
    """MVP: полный reindex после push."""
    return await index_repo(db, project_id, repo_path)
