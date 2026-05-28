"""CodeAI: проекты, сессии, настройки моделей, GitHub webhooks."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Header,
    HTTPException,
    Request,
    status,
)
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from dependencies import CurrentUser
from modules.codeai import agent, service
from modules.codeai.models import CodeAIProject
from sqlalchemy import select
from modules.codeai.schemas import (
    CodeAIMessagePublic,
    CodeAIModelPublic,
    CodeAIProjectCreate,
    CodeAIProjectPublic,
    CodeAIProjectStatus,
    CodeAIRepoPublic,
    CodeAISessionCreate,
    CodeAISessionPublic,
    CodeAISettingsPublic,
    CodeAISettingsUpdate,
)

logger = logging.getLogger("codeai.api")

router = APIRouter(prefix="/codeai", tags=["codeai"])


# === GitHub ===

@router.get("/github/install-url")
async def github_install_url(user: CurrentUser):
    """Возвращает URL установки GitHub App.

    Фронтенд получает URL отсюда, чтобы не зависеть от
    `NEXT_PUBLIC_*` переменных, которые вшиваются в билд.
    """
    return {"url": settings.github_app_installation_url}


@router.get("/github/callback")
async def github_callback(
    installation_id: str | None = None,
    setup_action: str | None = None,
):
    """GitHub App OAuth/setup callback.

    GitHub redirects to this URL after the user installs the App.
    We just bounce the user back to the frontend with the installation_id.
    """
    target = f"{settings.app_url.rstrip('/')}/codeai"
    if installation_id:
        target += f"?installation_id={installation_id}"
        if setup_action:
            target += f"&setup_action={setup_action}"
    return RedirectResponse(url=target)


@router.get("/repos", response_model=list[CodeAIRepoPublic])
async def list_repos(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await service.list_user_repos(db, user)


# === Projects ===

@router.post(
    "/projects",
    response_model=CodeAIProjectPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    payload: CodeAIProjectCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    obj = await service.create_project(db, user, payload)
    return CodeAIProjectPublic.model_validate(obj)


@router.get("/projects", response_model=list[CodeAIProjectPublic])
async def list_projects(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    items = await service.list_projects(db, user)
    return [CodeAIProjectPublic.model_validate(p) for p in items]


@router.delete(
    "/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_project(
    project_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await service.delete_project(db, user, project_id)
    return None


@router.post(
    "/projects/{project_id}/index", status_code=status.HTTP_202_ACCEPTED
)
async def start_indexing(
    project_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await service.start_indexing(db, user, project_id)
    return {"status": "indexing_started"}


@router.get("/projects/{project_id}/status", response_model=CodeAIProjectStatus)
async def project_status(
    project_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    data = await service.get_project_status(db, user, project_id)
    return CodeAIProjectStatus(**data)


# === Sessions ===

@router.post(
    "/sessions",
    response_model=CodeAISessionPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    payload: CodeAISessionCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    obj = await service.create_session(db, user, payload)
    return CodeAISessionPublic.model_validate(obj)


@router.get("/sessions/{session_id}", response_model=CodeAISessionPublic)
async def get_session(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    obj = await service.get_session(db, user, session_id)
    return CodeAISessionPublic.model_validate(obj)


@router.get("/projects/{project_id}/sessions", response_model=list[CodeAISessionPublic])
async def list_project_sessions(
    project_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    items = await service.list_sessions(db, user, project_id)
    return [CodeAISessionPublic.model_validate(s) for s in items]


@router.get(
    "/sessions/{session_id}/messages", response_model=list[CodeAIMessagePublic]
)
async def list_messages(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    items = await service.get_messages(db, user, session_id)
    return [CodeAIMessagePublic.model_validate(m) for m in items]


@router.post("/sessions/{session_id}/confirm", response_model=CodeAISessionPublic)
async def confirm_plan(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    obj = await service.confirm_plan(db, user, session_id)
    return CodeAISessionPublic.model_validate(obj)


@router.post("/sessions/{session_id}/cancel", response_model=CodeAISessionPublic)
async def cancel_session(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    obj = await service.cancel_session(db, user, session_id)
    return CodeAISessionPublic.model_validate(obj)


@router.get("/sessions/{session_id}/stream")
async def stream_session(
    session_id: UUID,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # validate ownership
    await service.get_session(db, user, session_id)

    async def event_gen():
        async for event in agent.stream_events(session_id):
            payload = json.dumps(event, default=str)
            yield f"event: {event.get('type', 'message')}\ndata: {payload}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")


# === Settings & Models ===

@router.get("/settings", response_model=CodeAISettingsPublic)
async def get_settings(
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    obj = await service.get_or_create_settings(db, user)
    return CodeAISettingsPublic.model_validate(obj)


@router.put("/settings", response_model=CodeAISettingsPublic)
async def update_settings(
    payload: CodeAISettingsUpdate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    obj = await service.update_settings(db, user, payload)
    return CodeAISettingsPublic.model_validate(obj)


@router.get("/models", response_model=list[CodeAIModelPublic])
async def list_models(user: CurrentUser):
    items = await service.get_available_models()
    return [CodeAIModelPublic.model_validate(m) for m in items]


# === Webhooks ===

def _verify_webhook_signature(body: bytes, signature: str | None) -> None:
    secret = settings.github_app_webhook_secret
    if not secret:
        return  # неконфигурировано → пропускаем
    if not signature or not signature.startswith("sha256="):
        raise HTTPException(status_code=401, detail="Missing signature")
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    expected = f"sha256={digest}"
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")


@router.post("/webhooks/github")
async def github_webhook(
    request: Request,
    background: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    x_github_event: Annotated[str | None, Header()] = None,
    x_hub_signature_256: Annotated[str | None, Header()] = None,
):
    body = await request.body()
    _verify_webhook_signature(body, x_hub_signature_256)

    try:
        payload = json.loads(body or b"{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = (x_github_event or "").lower()
    logger.info("GitHub webhook: event=%s", event)

    if event == "installation":
        # Installation создана / удалена — пока просто логируем
        return {"ok": True}

    if event == "push":
        repo = (payload.get("repository") or {}).get("full_name")
        if repo:
            projects = (
                await db.scalars(
                    select(CodeAIProject).where(
                        CodeAIProject.repo_full_name == repo
                    )
                )
            ).all()
            for project in projects:
                background.add_task(
                    service._run_indexing,
                    project.id,
                    project.repo_full_name,
                    project.github_installation_id,
                )

    return {"ok": True}
