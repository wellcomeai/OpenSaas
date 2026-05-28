"""CodeAI: проекты, сессии, настройки моделей, GitHub webhooks."""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
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
from modules.codeai.schemas import (
    CodeAIMessagePublic,
    CodeAIModelPublic,
    CodeAIProjectCreate,
    CodeAIProjectPublic,
    CodeAIProjectStatus,
    CodeAIRepoPublic,
    CodeAISessionCreate,
    CodeAISessionMessageCreate,
    CodeAISessionPublic,
    CodeAISettingsPublic,
    CodeAISettingsUpdate,
)

logger = logging.getLogger("codeai.api")

router = APIRouter(prefix="/codeai", tags=["codeai"])


# === GitHub ===

@router.get("/github/install-url")
async def github_install_url(user: CurrentUser):
    """URL установки GitHub App с `state`-JWT, привязывающим к юзеру.

    Фронтенд получает URL отсюда, чтобы:
      1. Не зависеть от `NEXT_PUBLIC_*` переменных (вшиваются в билд).
      2. Передать в `state` подписанный user_id — это позволит callback'у
         знать, какому юзеру привязать installation_id.
    """
    return {"url": service.build_install_url(user.id)}


@router.get("/github/callback")
async def github_callback(
    db: Annotated[AsyncSession, Depends(get_db)],
    installation_id: str | None = None,
    setup_action: str | None = None,
    state: str | None = None,
    code: str | None = None,
):
    """GitHub App setup callback.

    GitHub redirects сюда после установки App. Параметры:
      - installation_id: id новой installation
      - setup_action: install | update | request
      - state: подписанный JWT с user_id (создан в `/github/install-url`)
      - code: опционально, если включена OAuth-during-install

    Сохраняем связку user_id ↔ installation_id и редиректим юзера обратно.
    """
    target = f"{settings.app_url.rstrip('/')}/codeai"
    params: list[str] = []

    if installation_id and state:
        try:
            user_id = service.decode_install_state(state)
            await service.save_installation(db, user_id, installation_id)
            params.append("installed=true")
            params.append(f"installation_id={installation_id}")
        except HTTPException as exc:
            logger.warning("GitHub callback: invalid state: %s", exc.detail)
            params.append("install_error=invalid_state")
    elif installation_id:
        # Старые ссылки без state — тоже передадим installation_id, но
        # юзеру придётся быть залогиненным, и list_user_repos не увидит
        # эту installation, пока он не создаст проект.
        params.append(f"installation_id={installation_id}")

    if setup_action:
        params.append(f"setup_action={setup_action}")

    if params:
        target += "?" + "&".join(params)
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


@router.post("/sessions/{session_id}/message", response_model=CodeAISessionPublic)
async def send_message(
    session_id: UUID,
    payload: CodeAISessionMessageCreate,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    obj = await service.send_message(db, user, session_id, payload.content)
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
    x_github_event: Annotated[str | None, Header()] = None,
    x_hub_signature_256: Annotated[str | None, Header()] = None,
):
    body = await request.body()
    _verify_webhook_signature(body, x_hub_signature_256)
    logger.info("GitHub webhook: event=%s", (x_github_event or "").lower())
    # We accept and log; nothing to do — the agent reads the repo on demand.
    return {"ok": True}
