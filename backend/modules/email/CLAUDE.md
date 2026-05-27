# email — контекст

## Назначение

Отправка транзакционных писем через SMTP (aiosmtplib) с шаблонами Jinja2.

## Файлы

- `service.py` — `send_email`, `render`, `send_confirmation_email`,
  `send_welcome_email`, `send_reset_password_email`,
  `send_referral_payout_email`
- `templates/base.html` — общий layout
- `templates/confirm_email.html`, `welcome.html`, `reset_password.html`,
  `referral_payout.html`

## Бизнес-логика

- Если `SMTP_USER` пустой — письма НЕ отправляются, пишутся в лог.
  Удобно для разработки и тестов.
- Все шаблоны автоматически получают `app_name` и `app_url`.
- Письма отправляются в `BackgroundTasks` — роут не блокируется.

## Зависимости

- `aiosmtplib`, `jinja2`
- Настройки SMTP_* из `config.settings`

## Как расширить

1. Создать HTML файл в `templates/`.
2. Добавить функцию `send_<name>_email(...)` которая зовёт `render()` и
   `send_email()`.

## Нельзя менять

- Сигнатура `send_email(to, subject, html)` — используется широко.
