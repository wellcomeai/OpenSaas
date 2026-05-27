"""Billing endpoints (internal)."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import CurrentUser
from modules.billing import service as billing_service
from modules.billing.schemas import (
    PaymentPublic,
    PlanPublic,
    SubscribeRequest,
    SubscribeResponse,
    SubscriptionPublic,
)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans", response_model=list[PlanPublic])
async def list_plans(db: Annotated[AsyncSession, Depends(get_db)]):
    plans = await billing_service.list_plans(db)
    return [PlanPublic.model_validate(p) for p in plans]


@router.get("/subscription", response_model=SubscriptionPublic | None)
async def get_subscription(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    sub = await billing_service.get_user_subscription(db, user.id)
    if sub is None:
        return None
    return SubscriptionPublic.model_validate(sub)


@router.post("/subscribe", response_model=SubscribeResponse)
async def subscribe(
    payload: SubscribeRequest,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    url, payment = await billing_service.create_payment_for_plan(
        db, user, payload.plan_id, payload.provider
    )
    return SubscribeResponse(payment_url=url, payment_id=payment.id)


@router.get("/payments", response_model=list[PaymentPublic])
async def list_payments(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    payments = await billing_service.list_user_payments(db, user)
    return [PaymentPublic.model_validate(p) for p in payments]


@router.post("/cancel", response_model=SubscriptionPublic)
async def cancel(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    sub = await billing_service.cancel_subscription(db, user)
    return SubscriptionPublic.model_validate(sub)
