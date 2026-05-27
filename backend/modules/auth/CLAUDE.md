# auth — контекст

## Назначение

Регистрация, логин, JWT-токены, подтверждение email, сброс пароля.

## Файлы

- `models.py` — User, UserProfile, EmailVerificationToken, PasswordResetToken
- `schemas.py` — Pydantic схемы для запросов/ответов
- `service.py` — бизнес-логика
- `utils.py` — `hash_password`, `verify_password`, `create_access_token`, ...

## Модели

- **User**: email (uniq), hashed_password, role, is_active, is_email_verified,
  trial_ends_at, referred_by_id (self FK)
- **UserProfile** (1:1 с User): first_name, last_name, avatar_url
- **EmailVerificationToken**: uuid hex, expires +24h, is_used
- **PasswordResetToken**: uuid hex, expires +1h, is_used

## Бизнес-логика

- При регистрации:
  1. Создаём User (is_email_verified=False)
  2. Создаём UserProfile (пустой)
  3. Создаём trial Subscription на TRIAL_DAYS дней
  4. Создаём EmailVerificationToken и шлём письмо
  5. Если есть `referral_code` — привязываем (см. modules/referrals)
- JWT: `access` короткий (30 мин), `refresh` длинный (30 дней)
- Логин не требует подтверждения email (но создание API ключей — требует)

## Endpoints

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/confirm-email
POST /api/v1/auth/resend-confirmation
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
```

## Зависимости

- `modules.billing.models.Subscription` (создаётся при регистрации)
- `modules.referrals.service.attach_referral` (опционально)
- `modules.email.service` (отправка писем)

## Как расширить

- **Соц-логин (OAuth):** добавьте `modules/auth/providers/` (google.py,
  github.py), новые роуты `/auth/oauth/{provider}/...`, поле `provider` в User.
- **2FA/OTP:** новая таблица `two_factor_secrets`, эндпоинт `/auth/2fa/...`.
- **Magic link:** аналог EmailVerificationToken с одноразовым логином.

## Нельзя менять

- Формат `access_token` (фронтенд хранит и декодирует структуру)
- Сигнатуру `/auth/login` ответа (поле `user` — стандарт)
