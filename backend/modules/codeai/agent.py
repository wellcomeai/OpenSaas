"""AI Agent: semantic search → planning → execution."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from config import settings
from database import AsyncSessionLocal
from modules.codeai import github_app, indexer, openrouter
from modules.codeai.models import (
    CodeAIChunk,
    CodeAIMessage,
    CodeAIMessageRole,
    CodeAIMessageType,
    CodeAIProject,
    CodeAISession,
    CodeAISessionStatus,
    CodeAISettings,
)

logger = logging.getLogger("codeai.agent")


# In-memory event broker for SSE streaming of session statuses
_session_queues: dict[str, asyncio.Queue[dict[str, Any]]] = {}


def _get_queue(session_id: UUID) -> asyncio.Queue[dict[str, Any]]:
    key = str(session_id)
    q = _session_queues.get(key)
    if q is None:
        q = asyncio.Queue()
        _session_queues[key] = q
    return q


async def publish_event(session_id: UUID, event: dict[str, Any]) -> None:
    await _get_queue(session_id).put(event)


async def stream_events(session_id: UUID):
    q = _get_queue(session_id)
    while True:
        event = await q.get()
        yield event
        if event.get("type") == "done" or event.get("type") == "error":
            break


# === Semantic search ===

async def semantic_search(
    db: AsyncSession, project_id: UUID, query: str, top_k: int = 10
) -> list[CodeAIChunk]:
    try:
        query_emb = await openrouter.get_embedding(query)
    except Exception as e:  # noqa: BLE001
        logger.warning("Embedding for query failed, falling back to keyword search: %s", e)
        return await _keyword_search(db, project_id, query, top_k)

    stmt = (
        select(CodeAIChunk)
        .where(CodeAIChunk.project_id == project_id)
        .where(CodeAIChunk.embedding.is_not(None))
        .order_by(CodeAIChunk.embedding.cosine_distance(query_emb))
        .limit(top_k)
    )
    return list((await db.scalars(stmt)).all())


async def _keyword_search(
    db: AsyncSession, project_id: UUID, query: str, top_k: int
) -> list[CodeAIChunk]:
    pattern = f"%{query[:80]}%"
    stmt = (
        select(CodeAIChunk)
        .where(CodeAIChunk.project_id == project_id)
        .where(CodeAIChunk.content.ilike(pattern))
        .limit(top_k)
    )
    return list((await db.scalars(stmt)).all())


# === Planning ===

PLANNING_SYSTEM = """You are CodeAI, an autonomous coding agent.
Given a user task and a set of relevant code chunks from the repository,
produce a concrete plan to fulfill the task.

Respond ONLY with valid JSON matching this schema:
{
  "reasoning": "string explaining the approach",
  "files_to_change": [
    {"path": "relative/path", "action": "modify|create|delete", "description": "what to change"}
  ],
  "branch_name": "ai/short-kebab-case",
  "pr_title": "short imperative title",
  "pr_description": "markdown describing the change"
}
"""


def _build_planning_messages(
    task: str, chunks: list[CodeAIChunk], repo_structure: list[str]
) -> list[dict[str, Any]]:
    chunk_blob = "\n\n".join(
        f"# {c.file_path}:{c.start_line}-{c.end_line}\n{c.content}"
        for c in chunks
    )
    structure_blob = "\n".join(repo_structure[:200])
    return [
        {"role": "system", "content": PLANNING_SYSTEM},
        {
            "role": "user",
            "content": (
                f"Task: {task}\n\n"
                f"Repository structure (top 200 files):\n{structure_blob}\n\n"
                f"Relevant code chunks:\n{chunk_blob}"
            ),
        },
    ]


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


async def build_plan(
    task: str,
    chunks: list[CodeAIChunk],
    repo_structure: list[str],
    planning_model: str,
) -> dict[str, Any]:
    messages = _build_planning_messages(task, chunks, repo_structure)
    raw = await openrouter.chat_completion(
        planning_model,
        messages,
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    return _extract_json(raw)


# === Execution ===

EDITING_SYSTEM = """You are CodeAI, a careful code editor.
You are given the current contents of a file and a description of the
required change. Return the FULL new file contents only — no markdown
fences, no commentary. If the file should be deleted, return the exact
token <<<DELETE>>>. For new files, return the full new content.
"""


async def _edit_file_with_llm(
    editing_model: str,
    file_path: str,
    current_content: str,
    description: str,
    task: str,
) -> str:
    messages = [
        {"role": "system", "content": EDITING_SYSTEM},
        {
            "role": "user",
            "content": (
                f"Task: {task}\n\n"
                f"File: {file_path}\n"
                f"Required change: {description}\n\n"
                f"Current content:\n{current_content}"
            ),
        },
    ]
    raw = await openrouter.chat_completion(
        editing_model, messages, temperature=0.1
    )
    if raw.startswith("```"):
        raw = re.sub(r"^```[^\n]*\n", "", raw)
        raw = re.sub(r"\n```\s*$", "", raw)
    return raw


async def execute_plan(session_id: UUID) -> None:
    """Запускается как background task после confirm_plan.

    Открывает собственную DB сессию.
    """
    async with AsyncSessionLocal() as db:
        await _execute_plan_inner(db, session_id)


async def _execute_plan_inner(db: AsyncSession, session_id: UUID) -> None:
    session = await db.get(CodeAISession, session_id)
    if session is None or session.plan is None:
        return
    project = await db.get(CodeAIProject, session.project_id)
    if project is None:
        return
    user_settings = await db.scalar(
        select(CodeAISettings).where(CodeAISettings.user_id == session.user_id)
    )
    editing_model = (
        user_settings.editing_model
        if user_settings
        else settings.codeai_default_editing_model
    )

    plan = session.plan or {}
    branch_name = plan.get("branch_name") or f"ai/session-{session.id.hex[:8]}"
    pr_title = plan.get("pr_title") or session.task[:72]
    pr_description = plan.get("pr_description") or session.task

    workspace = Path(settings.codeai_workspace_dir) / str(session.id)

    try:
        await publish_event(session.id, {"type": "status", "message": "Запрашиваю installation token..."})
        await _log_message(db, session.id, "Запрашиваю installation token...", CodeAIMessageType.STATUS)

        install_token = await github_app.get_installation_token(
            project.github_installation_id
        )

        await publish_event(session.id, {"type": "status", "message": f"Клонирую {project.repo_full_name}..."})
        await _log_message(db, session.id, f"Клонирую {project.repo_full_name}...", CodeAIMessageType.STATUS)

        repo_path = github_app.clone_repo(
            project.repo_full_name, install_token, str(workspace)
        )

        await publish_event(session.id, {"type": "status", "message": f"Создаю ветку {branch_name}..."})
        github_app.create_branch(repo_path, branch_name)

        files_changed: list[str] = []
        files_to_change = plan.get("files_to_change") or []

        for entry in files_to_change:
            rel_path = entry.get("path")
            action = (entry.get("action") or "modify").lower()
            description = entry.get("description") or ""
            if not rel_path:
                continue

            full = Path(repo_path) / rel_path
            await publish_event(
                session.id,
                {"type": "status", "message": f"{action}: {rel_path}"},
            )
            await _log_message(
                db, session.id, f"{action}: {rel_path}", CodeAIMessageType.STATUS
            )

            if action == "delete":
                if full.exists():
                    full.unlink()
                    files_changed.append(rel_path)
                continue

            current = ""
            if action == "modify" and full.exists():
                try:
                    current = full.read_text(encoding="utf-8", errors="replace")
                except OSError:
                    current = ""

            new_content = await _edit_file_with_llm(
                editing_model, rel_path, current, description, session.task
            )

            if new_content.strip() == "<<<DELETE>>>":
                if full.exists():
                    full.unlink()
                    files_changed.append(rel_path)
                continue

            full.parent.mkdir(parents=True, exist_ok=True)
            full.write_text(new_content, encoding="utf-8")
            files_changed.append(rel_path)

        if not files_changed:
            raise RuntimeError("No files were changed")

        await publish_event(session.id, {"type": "status", "message": "Создаю коммит и пушу ветку..."})
        await _log_message(db, session.id, "Создаю коммит и пушу ветку...", CodeAIMessageType.STATUS)

        github_app.commit_and_push(
            repo_path, files_changed, pr_title, branch_name
        )

        await publish_event(session.id, {"type": "status", "message": "Создаю Pull Request..."})
        pr_url = await github_app.create_pull_request(
            install_token,
            project.repo_full_name,
            branch_name,
            project.repo_default_branch or "main",
            pr_title,
            pr_description,
        )

        session.pr_url = pr_url
        session.branch_name = branch_name
        session.status = CodeAISessionStatus.DONE
        session.updated_at = datetime.now(timezone.utc)
        await db.commit()

        await _log_message(
            db,
            session.id,
            f"Pull Request создан: {pr_url}",
            CodeAIMessageType.STATUS,
            metadata={"pr_url": pr_url},
        )
        await publish_event(
            session.id,
            {"type": "done", "pr_url": pr_url, "branch_name": branch_name},
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("execute_plan failed for session %s", session_id)
        session.status = CodeAISessionStatus.ERROR
        await db.commit()
        await _log_message(
            db, session.id, f"Ошибка: {e}", CodeAIMessageType.STATUS
        )
        await publish_event(session.id, {"type": "error", "message": str(e)})
    finally:
        github_app.cleanup_workspace(str(workspace))


async def _log_message(
    db: AsyncSession,
    session_id: UUID,
    content: str,
    message_type: CodeAIMessageType,
    *,
    role: CodeAIMessageRole = CodeAIMessageRole.ASSISTANT,
    metadata: dict[str, Any] | None = None,
) -> None:
    db.add(
        CodeAIMessage(
            session_id=session_id,
            role=role,
            content=content,
            message_type=message_type,
            meta=metadata,
        )
    )
    await db.commit()


def collect_repo_structure(repo_path: str, limit: int = 500) -> list[str]:
    paths: list[str] = []
    root = Path(repo_path)
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        if any(
            part in indexer.SKIP_DIRS for part in p.relative_to(root).parts
        ):
            continue
        paths.append(str(p.relative_to(root)))
        if len(paths) >= limit:
            break
    return paths


async def run_planning(session_id: UUID) -> None:
    """Background task: planning после создания сессии."""
    async with AsyncSessionLocal() as db:
        await _run_planning_inner(db, session_id)


async def _run_planning_inner(db: AsyncSession, session_id: UUID) -> None:
    session = await db.get(CodeAISession, session_id)
    if session is None:
        return
    project = await db.get(CodeAIProject, session.project_id)
    if project is None:
        return

    user_settings = await db.scalar(
        select(CodeAISettings).where(CodeAISettings.user_id == session.user_id)
    )
    planning_model = (
        user_settings.planning_model
        if user_settings
        else settings.codeai_default_planning_model
    )

    try:
        session.status = CodeAISessionStatus.PLANNING
        await db.commit()
        await publish_event(session.id, {"type": "status", "message": "Семантический поиск по коду..."})

        chunks = await semantic_search(db, project.id, session.task, top_k=10)
        repo_structure = [c.file_path for c in chunks]  # минимальная структура
        # Уникальные пути
        repo_structure = list(dict.fromkeys(repo_structure))

        await publish_event(session.id, {"type": "status", "message": "Строю план..."})
        plan = await build_plan(session.task, chunks, repo_structure, planning_model)

        session.plan = plan
        session.branch_name = plan.get("branch_name")
        session.status = CodeAISessionStatus.AWAITING_CONFIRMATION
        await db.commit()

        await _log_message(
            db,
            session.id,
            plan.get("reasoning") or "План готов",
            CodeAIMessageType.PLAN,
            metadata=plan,
        )
        await publish_event(
            session.id,
            {"type": "plan", "plan": plan},
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("planning failed for session %s", session_id)
        session.status = CodeAISessionStatus.ERROR
        await db.commit()
        await _log_message(
            db, session.id, f"Ошибка планирования: {e}", CodeAIMessageType.STATUS
        )
        await publish_event(session.id, {"type": "error", "message": str(e)})
