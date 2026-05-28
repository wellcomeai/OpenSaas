"""Сервис CodeAI: бизнес-логика."""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Sequence
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import AsyncSessionLocal
from modules.auth.models import User
from modules.codeai import agent, github_app, indexer, openrouter
from modules.codeai.models import (
    CodeAIChunk,
    CodeAIMessage,
    CodeAIProject,
    CodeAISession,
    CodeAISessionStatus,
    CodeAISettings,
)
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
    workspace = Path(settings.codeai_workspace_dir) / f"index-{project_id}"
    try:
        token = await github_app.get_installation_token(installation_id)
        repo_path = github_app.clone_repo(repo_full_name, token, str(workspace))
        async with AsyncSessionLocal() as db:
            await indexer.index_repo(db, project_id, repo_path)
    except Exception:  # noqa: BLE001
        logger.exception("Indexing failed for project %s", project_id)
    finally:
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

async def list_user_repos(
    db: AsyncSession, user: User
) -> list[CodeAIRepoPublic]:
    """Возвращает репо доступные через сохранённые installations юзера.

    Берёт installation_id из существующих проектов юзера, плюс позволяет
    видеть все репо новой installation после OAuth callback.
    """
    projects = await list_projects(db, user)
    installation_ids = sorted({p.github_installation_id for p in projects})

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
