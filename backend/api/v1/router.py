"""Сборка всех v1 роутов."""
from __future__ import annotations

from fastapi import APIRouter

from api.v1.internal import (
    admin as admin_router,
    animations as animations_router,
    api_keys as api_keys_router,
    auth as auth_router,
    billing as billing_router,
    codeai as codeai_router,
    referrals as referrals_router,
    users as users_router,
)
from api.v1.public import me as public_me_router, webhooks as webhooks_router

api_router = APIRouter(prefix="/api/v1")

# Internal (JWT)
api_router.include_router(auth_router.router)
api_router.include_router(users_router.router)
api_router.include_router(billing_router.router)
api_router.include_router(referrals_router.router)
api_router.include_router(api_keys_router.router)
api_router.include_router(admin_router.router)
api_router.include_router(codeai_router.router)
api_router.include_router(animations_router.router)

# Public (API key)
api_router.include_router(public_me_router.router)
api_router.include_router(webhooks_router.router)
