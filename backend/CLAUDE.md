# Backend — контекст

## Стек

- **Python 3.11**
- **FastAPI 0.111** (async, lifespan, dependency injection)
- **SQLAlchemy 2.0** в async-режиме (типизированные модели через `Mapped[...]`)
- **PostgreSQL 15** (asyncpg drvier)
- **Alembic** для миграций
- **Pydantic v2** + `pydantic-settings`
- **python-jose** + **passlib[bcrypt]** для JWT/паролей
- **aiosmtplib** + **Jinja2** для писем
- **Redis (опционально)** — для rate limiting; при отсутствии используется PostgreSQL fallback

## Структура

```
backend/
├── main.py              # FastAPI app, lifespan, CORS, /health
├── config.py            # pydantic-settings (читает .env)
├── database.py          # async engine, Base, get_db
├── dependencies.py      # CurrentUser, AdminUser, ActiveSubscription
├── models_registry.py   # импорт всех моделей для Alembic
│
├── alembic/             # миграции 0001-0007
│
├── api/v1/
│   ├── router.py        # сборка всех роутов
│   ├── internal/        # JWT auth (/api/v1/auth, /users, /billing, ...)
│   └── public/          # API-key auth (/api/v1/public/me, /webhooks)
│
├── modules/
│   ├── auth/            # регистрация, логин, JWT, email-токены
│   ├── users/           # профиль, смена пароля
│   ├── email/           # SMTP + Jinja2 шаблоны
│   ├── billing/         # планы, подписки, платежи, Robokassa/Stripe
│   ├── referrals/       # коды, ссылки, выплаты
│   ├── api_keys/        # генерация/проверка + middleware
│   ├── notifications/   # in-app уведомления
│   ├── admin/           # админские операции
│   ├── rate_limit/      # Redis или PostgreSQL fallback
│   └── demo_notes/      # пример пользовательского модуля
│
└── scripts/create_admin.py   # idempotent: создаёт админа и дефолтные планы
```

## Паттерны кода

### Async + SQLAlchemy 2.0

```python
async def get_user(db: AsyncSession, user_id: UUID) -> User | None:
    return await db.scalar(select(User).where(User.id == user_id))
```

### Зависимости (DI)

- `CurrentUser` — текущий пользователь по JWT
- `AdminUser` — то же, но требует `role == "admin"`
- `ActiveSubscription` — проверяет, что trial/active не истёк
- `ApiKeyUser` — для public API (по заголовку Authorization: Bearer osk_...)

### Роуты

```python
@router.post("/...", response_model=Schema)
async def handler(
    payload: InputSchema,
    user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    ...
```

## Роли

- `user` — обычный пользователь (по умолчанию)
- `admin` — доступ к `/api/v1/admin/*` (создаётся `scripts/create_admin.py`)

## Опциональный Redis

В `config.py`: `redis_url` — пустая строка значит "не используется".
Везде где нужен Redis (только `modules/rate_limit/service.py`) проверяется
`settings.redis_enabled` и при `False` идёт fallback на таблицу
`rate_limit_entries`. **Никогда не импортируйте `redis` на уровне модуля** —
только внутри функций после проверки `settings.redis_enabled`.

## Правила безопасности

1. **Никогда не возвращайте `hashed_password`** наружу — нет в Pydantic схемах.
2. **API ключи**: возвращаем полный ключ ОДИН РАЗ при создании. В БД храним
   только `key_prefix` + `bcrypt(key_hash)`.
3. **JWT secret** — минимум 32 символа, обязательно перегенерить в продакшене.
4. **Webhook Robokassa** — проверка подписи на `password2`. Никогда не верить
   входным данным без проверки подписи.
5. **Защита данных пользователя** — в каждом списке/CRUD фильтр по `user_id`.
   См. `modules/demo_notes/service.py` как пример.
6. **Email подтверждение** — без него заблокировано создание API ключей.

## Как добавить новый модуль

См. `docs/adding-modules.md`. Кратко:

1. `backend/modules/<name>/{models,schemas,service}.py` + `CLAUDE.md`
2. Импорт модели в `backend/models_registry.py`
3. `alembic revision --autogenerate -m "add_<name>"`
4. Роутер в `backend/api/v1/internal/<name>.py`, подключить в `router.py`

## Команды

```bash
# Миграции
alembic upgrade head
alembic revision --autogenerate -m "..."
alembic downgrade -1

# Запуск
uvicorn main:app --reload --port 8000

# Создать админа и дефолтные планы
python scripts/create_admin.py
```
