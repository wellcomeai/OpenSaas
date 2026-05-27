"""Импорт всех моделей в одном месте.

Используется Alembic-ом (env.py) и тестами для гарантии что все
модели зарегистрированы в Base.metadata.
"""
from modules.auth.models import (  # noqa: F401
    EmailVerificationCode,
    EmailVerificationToken,
    PasswordResetToken,
    User,
    UserProfile,
)
from modules.billing.models import Payment, Plan, Subscription  # noqa: F401
from modules.referrals.models import (  # noqa: F401
    ReferralCode,
    ReferralLink,
    ReferralPayout,
)
from modules.api_keys.models import ApiKey, RateLimitEntry  # noqa: F401
