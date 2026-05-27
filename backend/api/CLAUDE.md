# API — контекст

## Назначение

HTTP-роуты приложения. Версионируется через `v1/`.

## Структура

```
api/v1/
├── router.py        # сборка всех роутов в один APIRouter
├── internal/        # JWT auth → используется фронтендом
│   ├── auth.py      # /api/v1/auth/*
│   ├── users.py     # /api/v1/users/me
│   ├── billing.py   # /api/v1/billing/*
│   ├── referrals.py # /api/v1/referrals/*
│   ├── api_keys.py  # /api/v1/api-keys
│   ├── notifications.py
│   ├── demo_notes.py # /api/v1/demo/notes (demo)
│   └── admin.py     # /api/v1/admin/* (role=admin)
└── public/          # API key auth → для внешних интеграций
    ├── me.py        # /api/v1/public/me
    └── webhooks.py  # /api/v1/webhooks/{robokassa,stripe}
```

## Различие internal vs public

- **internal** — фронтенд login → JWT. Зависимость `CurrentUser`.
- **public** — внешние сервисы → API ключ (Bearer osk_live_...).
  Зависимость `ApiKeyUser` (с rate limit'ом).

## Как добавить новый роут

1. Создать файл в `internal/<name>.py` (или `public/`).
2. Зарегистрировать `router = APIRouter(prefix="/<name>", tags=["<name>"])`.
3. Внутри роутов использовать зависимости из `dependencies.py`.
4. Подключить в `api/v1/router.py`.

## Соглашения

- Pydantic схемы хранятся **в модуле** (`modules/<name>/schemas.py`),
  а не в роутерах.
- Бизнес-логика — **в `service.py`**, роутеры тонкие.
- Все списочные эндпоинты поддерживают `limit` и `offset`.
- Ошибки — через `HTTPException`. Не возвращайте 500 для ожидаемых случаев.
