"""Pydantic схемы для referrals."""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ReferralStats(BaseModel):
    total_referred: int
    converted: int
    total_earned: Decimal
    pending_payout: Decimal


class MyReferralCode(BaseModel):
    code: str
    url: str
    stats: ReferralStats


class ReferralPayoutPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    amount: Decimal
    status: str
    paid_at: datetime | None = None
    created_at: datetime


class AdminReferralPayoutPublic(ReferralPayoutPublic):
    referrer_id: UUID
    referred_user_id: UUID
    payment_id: UUID


class ReferralUserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: str
    first_name: str | None = None
    last_name: str | None = None
    status: str
    created_at: datetime
