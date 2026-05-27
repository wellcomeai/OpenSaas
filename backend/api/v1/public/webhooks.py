"""Webhooks от платёжных провайдеров."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from modules.billing import service as billing_service
from modules.billing.models import Payment, PaymentStatus
from modules.email import service as email_service
from modules.referrals import service as ref_service
from modules.billing.robokassa import verify_result_signature

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/robokassa")
async def robokassa_webhook(
    bg: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    OutSum: Annotated[str, Form()],
    InvId: Annotated[str, Form()],
    SignatureValue: Annotated[str, Form()],
):
    """Робокасса Result URL.

    Робокасса присылает x-www-form-urlencoded с OutSum, InvId, SignatureValue.
    Ответ должен быть строкой `OK<InvId>` для подтверждения.
    """
    if not verify_result_signature(OutSum, InvId, SignatureValue):
        raise HTTPException(status_code=400, detail="Invalid signature")

    payment = await db.scalar(
        select(Payment).where(Payment.provider_payment_id == InvId)
    )
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status == PaymentStatus.SUCCESS:
        return f"OK{InvId}"

    payment.status = PaymentStatus.SUCCESS
    await billing_service.activate_paid_subscription(db, payment)

    payout = await ref_service.process_payment_for_referral(db, payment)

    if payout is not None:
        from modules.auth.models import User

        referrer = await db.scalar(select(User).where(User.id == payout.referrer_id))
        if referrer:
            bg.add_task(
                email_service.send_referral_payout_email,
                referrer.email,
                str(payout.amount),
            )

    await db.commit()
    return f"OK{InvId}"


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """TODO: реализовать аналогично Робокассе.

    1. body = await request.body()
    2. sig = request.headers.get("stripe-signature")
    3. event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
    4. if event.type == "checkout.session.completed":
         найти Payment по metadata.payment_id
         activate_paid_subscription(...)
         process_payment_for_referral(...)
         send_email
    """
    raise HTTPException(status_code=501, detail="Stripe webhook not implemented yet")
