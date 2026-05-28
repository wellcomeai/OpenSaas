"""Conversational CodeAI agent — tool-calling loop."""
from __future__ import annotations

import asyncio
import difflib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import AsyncSessionLocal
from modules.codeai import github_app, indexer, openrouter, tools
from modules.codeai.models import (
    CodeAIMessage,
    CodeAIMessageRole,
    CodeAIMessageType,
    CodeAIProject,
    CodeAISession,
    CodeAISessionStatus,
    CodeAISettings,
)

logger = logging.getLogger("codeai.agent")


# === In-memory SSE event broker ===

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
        if event.get("type") in ("done", "error", "assistant"):
            break


# === System prompt ===

SYSTEM_PROMPT = """Ты AI-агент для работы с кодом. У тебя есть доступ к \
GitHub репозиторию пользователя через инструменты.

Правила:
- Если вопрос общий или нужны уточнения — отвечай текстом, не лезь в код.
- Для конкретной задачи: сначала list_files, потом read_file нужных файлов, \
потом edit_file. Всегда читай файл перед тем как его менять.
- Когда все изменения готовы — вызови create_pr (один раз).
- Если чего-то не понимаешь — спроси текстом без инструментов.

Репозиторий: {repo_full_name}
Ветка по умолчанию: {default_branch}
"""


# === History reconstruction ===

async def _load_history(
    db: AsyncSession, session_id: UUID
) -> list[CodeAIMessage]:
    rows = await db.scalars(
        select(CodeAIMessage)
        .where(CodeAIMessage.session_id == session_id)
        .order_by(CodeAIMessage.created_at.asc())
    )
    return list(rows.all())


def _build_llm_history(
    messages: list[CodeAIMessage], system_prompt: str
) -> list[dict[str, Any]]:
    """Convert persisted messages into OpenAI-style chat messages.

    Past tool calls are intentionally NOT replayed: the workspace from the
    previous turn is gone, so re-issuing the same tool_call_ids would be
    meaningless. Instead we keep the dialogue text: user requests +
    assistant chat replies. The agent can re-`list_files`/`read_file`
    whenever it needs fresh state.
    """
    out: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
    for m in messages:
        if m.role == CodeAIMessageRole.USER:
            out.append({"role": "user", "content": m.content})
        elif (
            m.role == CodeAIMessageRole.ASSISTANT
            and m.message_type == CodeAIMessageType.CHAT
            and m.content.strip()
        ):
            out.append({"role": "assistant", "content": m.content})
    return out


# === Persistence helpers ===

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


# === Tool execution ===

def _safe_relpath(repo_path: str, path: str) -> Path:
    rel = (path or "").lstrip("/")
    full = (Path(repo_path) / rel).resolve()
    root = Path(repo_path).resolve()
    if not str(full).startswith(str(root) + "/") and full != root:
        raise ValueError(f"Path escapes repo root: {path}")
    return full


def _list_files(repo_path: str, sub: str | None = None) -> list[str]:
    root = Path(repo_path)
    base = root if not sub else (root / sub.lstrip("/")).resolve()
    if not base.exists():
        return []
    out: list[str] = []
    for p in base.rglob("*"):
        if not p.is_file():
            continue
        rel_parts = p.relative_to(root).parts
        if any(part in indexer.SKIP_DIRS for part in rel_parts):
            continue
        out.append(str(p.relative_to(root)))
        if len(out) >= 2000:
            break
    out.sort()
    return out


def _make_unified_diff(rel_path: str, before: str, after: str) -> str:
    return "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=f"a/{rel_path}",
            tofile=f"b/{rel_path}",
        )
    )


class AgentState:
    """Per-run mutable state — repo workspace, install token, edited files."""

    def __init__(self, session: CodeAISession, project: CodeAIProject) -> None:
        self.session = session
        self.project = project
        self.workspace = Path(settings.codeai_workspace_dir) / str(session.id)
        self.repo_path: str | None = None
        self.install_token: str | None = None
        self.edited_files: list[str] = []
        self.pr_url: str | None = None

    async def ensure_repo(self) -> str:
        if self.repo_path is not None:
            return self.repo_path
        self.install_token = await github_app.get_installation_token(
            self.project.github_installation_id
        )
        self.repo_path = github_app.clone_repo(
            self.project.repo_full_name,
            self.install_token,
            str(self.workspace),
        )
        return self.repo_path

    def cleanup(self) -> None:
        github_app.cleanup_workspace(str(self.workspace))


async def _execute_tool(
    db: AsyncSession,
    state: AgentState,
    tool_name: str,
    args: dict[str, Any],
) -> str:
    session_id = state.session.id

    if tool_name == "list_files":
        repo_path = await state.ensure_repo()
        files = _list_files(repo_path, args.get("path"))
        return "\n".join(files) if files else "(no files)"

    if tool_name == "read_file":
        repo_path = await state.ensure_repo()
        rel = args.get("path") or ""
        full = _safe_relpath(repo_path, rel)
        if not full.is_file():
            return f"ERROR: file not found: {rel}"
        max_bytes = settings.codeai_max_file_size_kb * 1024
        if full.stat().st_size > max_bytes:
            return f"ERROR: file too large (> {settings.codeai_max_file_size_kb} kB)"
        return full.read_text(encoding="utf-8", errors="replace")

    if tool_name == "edit_file":
        repo_path = await state.ensure_repo()
        rel = args.get("path") or ""
        new_content = args.get("content") or ""
        full = _safe_relpath(repo_path, rel)
        before = ""
        if full.is_file():
            try:
                before = full.read_text(encoding="utf-8", errors="replace")
            except OSError:
                before = ""
        full.parent.mkdir(parents=True, exist_ok=True)
        full.write_text(new_content, encoding="utf-8")
        if rel not in state.edited_files:
            state.edited_files.append(rel)
        diff = _make_unified_diff(rel, before, new_content)
        await publish_event(
            session_id,
            {
                "type": "diff",
                "path": rel,
                "action": "create" if not before else "modify",
                "diff": diff,
            },
        )
        await _log_message(
            db,
            session_id,
            diff,
            CodeAIMessageType.DIFF,
            metadata={
                "path": rel,
                "action": "create" if not before else "modify",
            },
        )
        return f"OK: wrote {rel} ({len(new_content)} bytes)"

    if tool_name == "delete_file":
        repo_path = await state.ensure_repo()
        rel = args.get("path") or ""
        full = _safe_relpath(repo_path, rel)
        if not full.is_file():
            return f"ERROR: file not found: {rel}"
        before = ""
        try:
            before = full.read_text(encoding="utf-8", errors="replace")
        except OSError:
            before = ""
        full.unlink()
        if rel not in state.edited_files:
            state.edited_files.append(rel)
        diff = _make_unified_diff(rel, before, "")
        await publish_event(
            session_id,
            {"type": "diff", "path": rel, "action": "delete", "diff": diff},
        )
        await _log_message(
            db,
            session_id,
            diff,
            CodeAIMessageType.DIFF,
            metadata={"path": rel, "action": "delete"},
        )
        return f"OK: deleted {rel}"

    if tool_name == "create_pr":
        repo_path = await state.ensure_repo()
        if not state.edited_files:
            return "ERROR: no files were changed yet — nothing to commit"
        branch_name = args.get("branch_name") or f"ai/session-{state.session.id.hex[:8]}"
        title = args.get("title") or state.session.task[:72]
        body = args.get("description") or state.session.task

        github_app.create_branch(repo_path, branch_name)
        github_app.commit_and_push(
            repo_path, state.edited_files, title, branch_name
        )
        pr_url = await github_app.create_pull_request(
            state.install_token or "",
            state.project.repo_full_name,
            branch_name,
            state.project.repo_default_branch or "main",
            title,
            body,
        )
        state.pr_url = pr_url
        state.session.pr_url = pr_url
        state.session.branch_name = branch_name
        state.session.updated_at = datetime.now(timezone.utc)
        await db.commit()
        return f"OK: PR created: {pr_url}"

    return f"ERROR: unknown tool {tool_name}"


# === Agent loop ===

MAX_ITERATIONS = 30


async def run_agent(session_id: UUID) -> None:
    """Background task: drive the conversational loop until the agent
    produces a final text reply (no tool calls)."""
    async with AsyncSessionLocal() as db:
        await _run_agent_inner(db, session_id)


async def _run_agent_inner(db: AsyncSession, session_id: UUID) -> None:
    session = await db.get(CodeAISession, session_id)
    if session is None:
        return
    project = await db.get(CodeAIProject, session.project_id)
    if project is None:
        return

    user_settings = await db.scalar(
        select(CodeAISettings).where(CodeAISettings.user_id == session.user_id)
    )
    model = (
        user_settings.model
        if user_settings
        else settings.codeai_default_planning_model
    )

    system_prompt = SYSTEM_PROMPT.format(
        repo_full_name=project.repo_full_name,
        default_branch=project.repo_default_branch or "main",
    )

    history = await _load_history(db, session_id)
    msgs = _build_llm_history(history, system_prompt)
    openai_tools = tools.openai_tools()

    state = AgentState(session, project)

    try:
        session.status = CodeAISessionStatus.EXECUTING
        await db.commit()

        for iteration in range(MAX_ITERATIONS):
            # Refresh status to detect cancel.
            await db.refresh(session)
            if session.status == CodeAISessionStatus.ERROR:
                await publish_event(
                    session_id,
                    {"type": "status", "message": "Сессия отменена"},
                )
                return

            await publish_event(
                session_id, {"type": "status", "message": "Агент думает..."}
            )

            message = await openrouter.chat_completion_message(
                model, msgs, tools=openai_tools
            )
            content = message.get("content") or ""
            tool_calls = message.get("tool_calls") or []

            if not tool_calls:
                final = content.strip() or "Готово."
                await _log_message(
                    db, session_id, final, CodeAIMessageType.CHAT
                )
                session.status = CodeAISessionStatus.DONE
                session.updated_at = datetime.now(timezone.utc)
                await db.commit()
                await publish_event(
                    session_id, {"type": "assistant", "content": final}
                )
                await publish_event(
                    session_id,
                    {
                        "type": "done",
                        "pr_url": state.pr_url,
                        "branch_name": session.branch_name,
                    },
                )
                return

            # Append assistant turn (with tool_calls) to in-memory msgs only.
            msgs.append(
                {
                    "role": "assistant",
                    "content": content or None,
                    "tool_calls": tool_calls,
                }
            )

            for tc in tool_calls:
                tool_id = tc.get("id") or ""
                fn = tc.get("function") or {}
                tool_name = fn.get("name") or ""
                try:
                    args = json.loads(fn.get("arguments") or "{}")
                except json.JSONDecodeError:
                    args = {}

                await publish_event(
                    session_id,
                    {
                        "type": "tool_use",
                        "id": tool_id,
                        "tool": tool_name,
                        "input": args,
                    },
                )
                await _log_message(
                    db,
                    session_id,
                    json.dumps(args, ensure_ascii=False),
                    CodeAIMessageType.TOOL_USE,
                    metadata={"tool": tool_name, "input": args, "id": tool_id},
                )

                try:
                    result = await _execute_tool(db, state, tool_name, args)
                except Exception as e:  # noqa: BLE001
                    logger.exception("Tool %s failed", tool_name)
                    result = f"ERROR: {e}"

                preview = result.splitlines()[:5]
                preview_text = "\n".join(preview)
                await publish_event(
                    session_id,
                    {
                        "type": "tool_result",
                        "id": tool_id,
                        "tool": tool_name,
                        "preview": preview_text[:500],
                    },
                )
                await _log_message(
                    db,
                    session_id,
                    result,
                    CodeAIMessageType.TOOL_RESULT,
                    metadata={"tool": tool_name, "id": tool_id},
                )

                msgs.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "content": result[:50_000],
                    }
                )

        # Hit the iteration cap.
        raise RuntimeError("agent: max iterations exceeded")

    except Exception as e:  # noqa: BLE001
        logger.exception("agent loop failed for session %s", session_id)
        session.status = CodeAISessionStatus.ERROR
        await db.commit()
        await _log_message(
            db, session_id, f"Ошибка: {e}", CodeAIMessageType.STATUS
        )
        await publish_event(session_id, {"type": "error", "message": str(e)})
    finally:
        state.cleanup()
