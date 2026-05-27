"""Отправка писем через SMTP (aiosmtplib + Jinja2).

В development при пустом SMTP_USER письма пишутся в лог вместо отправки.
"""
from __future__ import annotations

import logging
from email.message import EmailMessage
from pathlib import Path
from typing import Any

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape

from config import settings

logger = logging.getLogger(__name__)

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"

env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
    enable_async=False,
)


def render(template_name: str, **context: Any) -> str:
    tpl = env.get_template(template_name)
    return tpl.render(app_name=settings.app_name, app_url=settings.app_url, **context)


async def send_email(to: str, subject: str, html: str) -> None:
    if not settings.smtp_user:
        logger.info(
            "[email:dev] To=%s Subject=%s\n%s", to, subject, html[:500]
        )
        return

    msg = EmailMessage()
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content("Используйте HTML-совместимый клиент.")
    msg.add_alternative(html, subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=settings.smtp_use_tls,
        )
    except Exception:
        logger.exception("Failed to send email to %s", to)


async def send_confirmation_email(to: str, token: str) -> None:
    url = f"{settings.app_url}/confirm-email?token={token}"
    html = render("confirm_email.html", confirm_url=url)
    await send_email(to, f"Подтверждение email — {settings.app_name}", html)


async def send_verification_code_email(to: str, code: str) -> None:
    if not settings.smtp_user:
        logger.info("[email:dev] Verification code for %s: %s", to, code)
        return
    html = render("verification_code.html", code=code)
    await send_email(to, f"Код подтверждения — {settings.app_name}", html)


async def send_welcome_email(to: str) -> None:
    html = render("welcome.html")
    await send_email(to, f"Добро пожаловать в {settings.app_name}!", html)


async def send_reset_password_email(to: str, token: str) -> None:
    url = f"{settings.app_url}/reset-password?token={token}"
    html = render("reset_password.html", reset_url=url)
    await send_email(to, f"Сброс пароля — {settings.app_name}", html)


async def send_referral_payout_email(to: str, amount: str) -> None:
    html = render("referral_payout.html", amount=amount)
    await send_email(to, f"Вы получили выплату — {settings.app_name}", html)
