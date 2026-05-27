"""Интеграция с Робокассой.

Документация: https://docs.robokassa.ru/

Используется два метода:
- build_payment_url: генерирует ссылку для редиректа на оплату
- verify_result_signature: проверяет подпись webhook-а
"""
from __future__ import annotations

import hashlib
from decimal import Decimal
from typing import Any
from urllib.parse import urlencode

from config import settings


_BASE_URL = "https://auth.robokassa.ru/Merchant/Index.aspx"


def _md5(data: str) -> str:
    return hashlib.md5(data.encode()).hexdigest()


def build_payment_url(
    inv_id: int | str,
    amount: Decimal,
    description: str,
    user_email: str | None = None,
) -> str:
    """Сформировать URL для редиректа клиента на оплату."""
    out_sum = f"{amount:.2f}"
    sig_str = (
        f"{settings.robokassa_merchant_login}:{out_sum}:{inv_id}:"
        f"{settings.robokassa_password1}"
    )
    signature = _md5(sig_str)

    params: dict[str, Any] = {
        "MerchantLogin": settings.robokassa_merchant_login,
        "OutSum": out_sum,
        "InvId": inv_id,
        "Description": description,
        "SignatureValue": signature,
    }
    if user_email:
        params["Email"] = user_email
    if settings.robokassa_test_mode:
        params["IsTest"] = "1"

    return f"{_BASE_URL}?{urlencode(params)}"


def verify_result_signature(out_sum: str, inv_id: str, signature: str) -> bool:
    """Проверка подписи в Result URL (webhook).

    Использует password2 — это критично.
    """
    expected = _md5(f"{out_sum}:{inv_id}:{settings.robokassa_password2}")
    return expected.lower() == signature.lower()
