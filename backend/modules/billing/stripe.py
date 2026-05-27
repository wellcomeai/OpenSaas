"""Заготовка для Stripe.

TODO: реализовать когда понадобится Stripe в продакшене.

Минимально нужно:
1. pip install stripe
2. stripe.api_key = settings.stripe_secret_key
3. create_checkout_session(plan, user) -> возвращает URL чекаута
4. verify_webhook_signature(body, sig_header)
5. parse webhook event и обработать payment_intent.succeeded
   (вызвать ту же бизнес-логику что Робокасса: activate sub +
   создать referral payout + notification + email)

Документация: https://stripe.com/docs/api
"""
from __future__ import annotations

from decimal import Decimal

from fastapi import HTTPException

from config import settings


def _ensure_enabled() -> None:
    if not settings.stripe_enabled:
        raise HTTPException(
            status_code=503, detail="Stripe is not enabled. Set STRIPE_ENABLED=true."
        )


def build_checkout_url(
    plan_id: str, amount: Decimal, user_email: str
) -> str:
    """TODO: создать Stripe Checkout Session и вернуть session.url."""
    _ensure_enabled()
    raise HTTPException(
        status_code=501, detail="Stripe checkout not implemented yet"
    )


def verify_webhook_signature(payload: bytes, sig_header: str) -> dict:
    """TODO: использовать stripe.Webhook.construct_event."""
    _ensure_enabled()
    raise HTTPException(
        status_code=501, detail="Stripe webhook not implemented yet"
    )
