"""Auth endpoints (internal)."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from modules.auth import service as auth_service
from modules.auth.models import User
from config import settings
from modules.auth.schemas import (
    AuthResponse,
    ConfirmEmailRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResendCodeRequest,
    ResendConfirmationRequest,
    ResetPasswordRequest,
    TokenPair,
    UserPublic,
    VerifyEmailCodeRequest,
)
from modules.auth.utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from modules.email import service as email_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
async def register(
    payload: RegisterRequest,
    bg: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user, access, refresh, code = await auth_service.register_user(db, payload)
    bg.add_task(email_service.send_verification_code_email, user.email, code)
    return AuthResponse(
        access_token=access,
        refresh_token=refresh,
        user=UserPublic.model_validate(user),
        pending_verification=True,
        dev_code=(
            code
            if not settings.smtp_user and settings.environment.lower() != "production"
            else None
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await auth_service.authenticate(db, payload.email, payload.password)
    return AuthResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserPublic.model_validate(user),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    payload: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = UUID(data["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc

    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    # JWT stateless — реальный logout делается на клиенте удалением токенов
    return None


@router.post("/confirm-email", response_model=UserPublic)
async def confirm_email(
    payload: ConfirmEmailRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await auth_service.confirm_email(db, payload.token)
    return UserPublic.model_validate(user)


@router.post("/verify-email-code", response_model=UserPublic)
async def verify_email_code(
    payload: VerifyEmailCodeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await auth_service.verify_email_code(db, payload.user_id, payload.code)
    return UserPublic.model_validate(user)


@router.post("/resend-code", status_code=status.HTTP_202_ACCEPTED)
async def resend_code(
    payload: ResendCodeRequest,
    bg: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await db.scalar(select(User).where(User.id == payload.user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email уже подтверждён")
    code = await auth_service.create_verification_code(db, user)
    bg.add_task(email_service.send_verification_code_email, user.email, code)
    return {"detail": "Код отправлен"}


@router.post("/resend-confirmation", status_code=status.HTTP_202_ACCEPTED)
async def resend_confirmation(
    payload: ResendConfirmationRequest,
    bg: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user and not user.is_email_verified:
        token = await auth_service.create_email_token(db, user)
        bg.add_task(email_service.send_confirmation_email, user.email, token)
    return {"detail": "If the email exists, a confirmation has been sent"}


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    payload: ForgotPasswordRequest,
    bg: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user:
        token = await auth_service.create_reset_token(db, user)
        bg.add_task(email_service.send_reset_password_email, user.email, token)
    return {"detail": "If the email exists, a reset link has been sent"}


@router.post("/reset-password", response_model=UserPublic)
async def reset_password(
    payload: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    user = await auth_service.reset_password(db, payload.token, payload.new_password)
    return UserPublic.model_validate(user)
