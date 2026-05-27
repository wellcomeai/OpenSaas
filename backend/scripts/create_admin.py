"""Создаёт админа из ADMIN_EMAIL/ADMIN_PASSWORD при первом запуске.

Идемпотентен — если админ уже существует, не делает ничего.
Также создаёт дефолтные планы и UserProfile для админа.
"""
from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from config import settings  # noqa: E402
from database import AsyncSessionLocal  # noqa: E402
from modules.auth.models import User, UserProfile, UserRole  # noqa: E402
from modules.auth.utils import hash_password  # noqa: E402
from modules.billing.models import (  # noqa: E402
    Plan,
    PlanInterval,
    Subscription,
    SubscriptionStatus,
)


DEFAULT_PLANS = [
    {
        "name": settings.plan_basic_name,
        "price": settings.plan_basic_price,
        "currency": "RUB",
        "interval": PlanInterval(settings.plan_basic_interval),
        "features": settings.plan_basic_features_list,
        "sort_order": 1,
    },
    {
        "name": settings.plan_pro_name,
        "price": settings.plan_pro_price,
        "currency": "RUB",
        "interval": PlanInterval(settings.plan_pro_interval),
        "features": settings.plan_pro_features_list,
        "sort_order": 2,
    },
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # Планы (идемпотентно: апдейтим существующие, создаём отсутствующие)
        existing_plans = (await db.scalars(select(Plan))).all()
        existing = {p.name: p for p in existing_plans}
        created = 0
        updated = 0
        for plan_data in DEFAULT_PLANS:
            if plan_data["name"] in existing:
                plan = existing[plan_data["name"]]
                plan.price = plan_data["price"]
                plan.features = plan_data["features"]
                updated += 1
            else:
                db.add(Plan(**plan_data))
                created += 1
        await db.commit()
        print(f"[create_admin] Plans: created={created}, updated={updated}")

        # Админ
        admin = await db.scalar(
            select(User).where(User.email == settings.admin_email)
        )
        if admin:
            print(f"[create_admin] Admin {settings.admin_email} already exists")
            return

        admin = User(
            email=settings.admin_email,
            hashed_password=hash_password(settings.admin_password),
            role=UserRole.ADMIN,
            is_active=True,
            is_email_verified=True,
            trial_ends_at=datetime.now(timezone.utc)
            + timedelta(days=365 * 100),
        )
        db.add(admin)
        await db.flush()
        db.add(UserProfile(user_id=admin.id, first_name="Admin"))
        db.add(
            Subscription(
                user_id=admin.id,
                status=SubscriptionStatus.ACTIVE,
                current_period_start=datetime.now(timezone.utc),
                current_period_end=datetime.now(timezone.utc)
                + timedelta(days=365 * 100),
            )
        )
        await db.commit()
        print(f"[create_admin] Admin {settings.admin_email} created")


if __name__ == "__main__":
    asyncio.run(main())
