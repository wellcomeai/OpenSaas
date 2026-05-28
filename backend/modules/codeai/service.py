"""Сервис CodeAI: бизнес-логика."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException
from jose import JWTError, jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import AsyncSessionLocal
from modules.auth.models import User
from modules.codeai import agent, github_app, indexer, openrouter
from modules.codeai.models import (
    CodeAIChunk,
    CodeAIInstallation,
    CodeAIMessage,
    CodeAIProject,
    CodeAISession,
    CodeAISessionStatus,
    CodeAISettings,
)

INSTALL_STATE_TOKEN_TYPE = "github_install_state"
INSTALL_STATE_TTL_MINUTES = 10
from modules.codeai.schemas import (
    CodeAIProjectCreate,
    CodeAIRepoPublic,
    CodeAISessionCreate,
    CodeAISettingsUpdate,
)

logger = logging.getLogger("codeai.service")


# === Projects ===

async def create_project(
    db: AsyncSession, user: User, payload: CodeAIProjectCreate
) -> CodeAIProject:
    existing = await db.scalar(
        select(CodeAIProject).where(
            CodeAIProject.user_id == user.id,
            CodeAIProject.repo_full_name == payload.repo_full_name,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Project already exists")

    project = CodeAIProject(
        user_id=user.id,
        github_installation_id=payload.github_installation_id,
        repo_full_name=payload.repo_full_name,
        repo_default_branch=payload.repo_default_branch or "main",
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def list_projects(db: AsyncSession, user: User) -> Sequence[CodeAIProject]:
    return (
        await db.scalars(
            select(CodeAIProject)
            .where(CodeAIProject.user_id == user.id)
            .order_by(CodeAIProject.created_at.desc())
        )
    ).all()


async def get_project(
    db: AsyncSession, user: User, project_id: UUID
) -> CodeAIProject:
    project = await db.get(CodeAIProject, project_id)
    if project is None or project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def delete_project(
    db: AsyncSession, user: User, project_id: UUID
) -> None:
    project = await get_project(db, user, project_id)
    await db.delete(project)
    await db.commit()


async def get_project_status(
    db: AsyncSession, user: User, project_id: UUID
) -> dict:
    project = await get_project(db, user, project_id)
    chunks_count = await db.scalar(
        select(func.count(CodeAIChunk.id)).where(
            CodeAIChunk.project_id == project.id
        )
    )
    return {
        "is_indexed": project.is_indexed,
        "indexed_at": project.indexed_at,
        "chunks_count": int(chunks_count or 0),
    }


async def start_indexing(
    db: AsyncSession, user: User, project_id: UUID
) -> None:
    project = await get_project(db, user, project_id)
    project.is_indexed = False
    project.indexed_at = None
    await db.commit()
    asyncio.create_task(_run_indexing(project.id, project.repo_full_name, project.github_installation_id))


async def _run_indexing(
    project_id: UUID, repo_full_name: str, installation_id: str
) -> None:
    print(f"[CODEAI] _run_indexing START: project={project_id} repo={repo_full_name}", flush=True)
    workspace = Path(settings.codeai_workspace_dir) / f"index-{project_id}"
    try:
        print(f"[CODEAI] Getting installation token for {installation_id}", flush=True)
        token = await github_app.get_installation_token(installation_id)
        print(f"[CODEAI] Got token, cloning {repo_full_name} to {workspace}", flush=True)
        repo_path = github_app.clone_repo(repo_full_name, token, str(workspace))
        print(f"[CODEAI] Cloned successfully, starting indexing", flush=True)
        async with AsyncSessionLocal() as db:
            count = await indexer.index_repo(db, project_id, repo_path)
        print(f"[CODEAI] Indexing DONE: {count} chunks for project {project_id}", flush=True)
    except Exception as e:  # noqa: BLE001
        print(f"[CODEAI] _run_indexing FAILED: {type(e).__name__}: {e}", flush=True)
        logger.exception("Indexing failed for project %s", project_id)
    finally:
        print(f"[CODEAI] Cleanup workspace {workspace}", flush=True)
        github_app.cleanup_workspace(str(workspace))


# === Sessions ===

async def create_session(
    db: AsyncSession, user: User, payload: CodeAISessionCreate
) -> CodeAISession:
    project = await get_project(db, user, payload.project_id)

    session = CodeAISession(
        project_id=project.id,
        user_id=user.id,
        status=CodeAISessionStatus.IDLE,
        task=payload.task,
    )
    db.add(session)
    await db.flush()

    db.add(
        CodeAIMessage(
            session_id=session.id,
            role="user",
            content=payload.task,
            message_type="chat",
        )
    )
    await db.commit()
    await db.refresh(session)

    asyncio.create_task(agent.run_planning(session.id))
    return session


async def get_session(
    db: AsyncSession, user: User, session_id: UUID
) -> CodeAISession:
    session = await db.get(CodeAISession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


async def list_sessions(
    db: AsyncSession, user: User, project_id: UUID
) -> Sequence[CodeAISession]:
    await get_project(db, user, project_id)
    return (
        await db.scalars(
            select(CodeAISession)
            .where(CodeAISession.project_id == project_id)
            .order_by(CodeAISession.created_at.desc())
        )
    ).all()


async def get_messages(
    db: AsyncSession, user: User, session_id: UUID
) -> Sequence[CodeAIMessage]:
    session = await get_session(db, user, session_id)
    return (
        await db.scalars(
            select(CodeAIMessage)
            .where(CodeAIMessage.session_id == session.id)
            .order_by(CodeAIMessage.created_at.asc())
        )
    ).all()


async def confirm_plan(
    db: AsyncSession, user: User, session_id: UUID
) -> CodeAISession:
    session = await get_session(db, user, session_id)
    if session.status != CodeAISessionStatus.AWAITING_CONFIRMATION:
        raise HTTPException(
            status_code=400, detail="Session is not awaiting confirmation"
        )
    if not session.plan:
        raise HTTPException(status_code=400, detail="Session has no plan")
    session.status = CodeAISessionStatus.EXECUTING
    await db.commit()
    await db.refresh(session)

    asyncio.create_task(agent.execute_plan(session.id))
    return session


async def cancel_session(
    db: AsyncSession, user: User, session_id: UUID
) -> CodeAISession:
    session = await get_session(db, user, session_id)
    if session.status in (
        CodeAISessionStatus.DONE,
        CodeAISessionStatus.ERROR,
    ):
        return session
    session.status = CodeAISessionStatus.ERROR
    await db.commit()
    await db.refresh(session)
    return session


# === Repos via GitHub App ===

async def _user_installation_ids(db: AsyncSession, user: User) -> list[str]:
    """Все installation_id, привязанные к юзеру.

    Источник истины — таблица CodeAIInstallation; дополнительно
    включаем installation_id из проектов юзера на случай, если запись
    в таблице установок ещё не появилась (бэкомпат / расхождения).
    """
    install_rows = (
        await db.scalars(
            select(CodeAIInstallation.installation_id).where(
                CodeAIInstallation.user_id == user.id
            )
        )
    ).all()
    project_rows = (
        await db.scalars(
            select(CodeAIProject.github_installation_id).where(
                CodeAIProject.user_id == user.id
            )
        )
    ).all()
    return sorted({*install_rows, *project_rows})


async def list_user_repos(
    db: AsyncSession, user: User
) -> list[CodeAIRepoPublic]:
    """Репо доступные юзеру через все его GitHub-installations."""
    installation_ids = await _user_installation_ids(db, user)

    seen: set[str] = set()
    out: list[CodeAIRepoPublic] = []
    for install_id in installation_ids:
        try:
            token = await github_app.get_installation_token(install_id)
            repos = await github_app.list_installation_repos(token)
        except Exception:  # noqa: BLE001
            logger.exception("Failed to list repos for installation %s", install_id)
            continue
        for r in repos:
            full = r.get("full_name")
            if not full or full in seen:
                continue
            seen.add(full)
            out.append(
                CodeAIRepoPublic(
                    full_name=full,
                    default_branch=r.get("default_branch") or "main",
                    description=r.get("description"),
                )
            )
    return out


# === GitHub install state (JWT с user_id для OAuth-style flow) ===

def create_install_state(user_id: UUID) -> str:
    """JWT, который пересылаем в `state` параметре GitHub App install URL.

    GitHub вернёт его в callback — так бэкенд узнаёт, какому юзеру
    привязать installation.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": INSTALL_STATE_TOKEN_TYPE,
        "iat": now,
        "exp": now + timedelta(minutes=INSTALL_STATE_TTL_MINUTES),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_install_state(state: str) -> UUID:
    """Валидирует state и возвращает user_id."""
    try:
        payload = jwt.decode(
            state, settings.secret_key, algorithms=[settings.algorithm]
        )
    except JWTError as exc:
        raise HTTPException(status_code=400, detail="Invalid state token") from exc

    if payload.get("type") != INSTALL_STATE_TOKEN_TYPE:
        raise HTTPException(status_code=400, detail="Invalid state token type")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=400, detail="Invalid state token payload")
    try:
        return UUID(str(sub))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid user id in state") from exc


def build_install_url(user_id: UUID) -> str:
    """Возвращает GitHub App install URL с `state` JWT.

    Если базовый URL не настроен — возвращает пустую строку (фронтенд
    покажет соответствующую ошибку).
    """
    base = (settings.github_app_installation_url or "").strip()
    if not base:
        return ""
    state = create_install_state(user_id)
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}state={state}"


async def save_installation(
    db: AsyncSession,
    user_id: UUID,
    installation_id: str,
    account_login: str | None = None,
) -> CodeAIInstallation:
    """Upsert: привязывает installation к юзеру.

    Если installation уже привязан к другому юзеру — переписывает на
    нового (юзер мог переустановить App для своей учётки).
    """
    existing = await db.scalar(
        select(CodeAIInstallation).where(
            CodeAIInstallation.installation_id == installation_id
        )
    )
    if existing is not None:
        existing.user_id = user_id
        if account_login is not None:
            existing.account_login = account_login
        await db.commit()
        await db.refresh(existing)
        return existing

    row = CodeAIInstallation(
        user_id=user_id,
        installation_id=installation_id,
        account_login=account_login,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


# === Settings ===

async def get_or_create_settings(
    db: AsyncSession, user: User
) -> CodeAISettings:
    obj = await db.scalar(
        select(CodeAISettings).where(CodeAISettings.user_id == user.id)
    )
    if obj is None:
        obj = CodeAISettings(
            user_id=user.id,
            planning_model=settings.codeai_default_planning_model,
            editing_model=settings.codeai_default_editing_model,
        )
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
    return obj


async def update_settings(
    db: AsyncSession, user: User, payload: CodeAISettingsUpdate
) -> CodeAISettings:
    obj = await get_or_create_settings(db, user)
    if payload.planning_model is not None:
        obj.planning_model = payload.planning_model
    if payload.editing_model is not None:
        obj.editing_model = payload.editing_model
    await db.commit()
    await db.refresh(obj)
    return obj


# === Models list ===

async def get_available_models() -> list[dict]:
    return await openrouter.get_available_models()
