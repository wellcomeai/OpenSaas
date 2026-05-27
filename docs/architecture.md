# Архитектура

## Высокоуровневая схема

```
┌─────────────┐         ┌──────────────┐         ┌────────────┐
│  Browser /  │ HTTPS   │  Next.js 14  │  REST   │  FastAPI   │
│  внеш. API  │────────▶│   Frontend   │────────▶│   Backend  │
└─────────────┘         └──────────────┘         └─────┬──────┘
                                                       │
                                          ┌────────────┼───────────┐
                                          ▼            ▼           ▼
                                     PostgreSQL    Redis*      SMTP
                                                  (опц.)
```

`*` Redis опционален. Если `REDIS_URL` пустой — rate limiting использует
PostgreSQL fallback (таблица `rate_limit_entries`).

## Backend (FastAPI)

### Слои

1. **API** (`api/v1/`) — HTTP endpoints, тонкие хендлеры
2. **Modules** (`modules/`) — бизнес-логика по доменам (auth, billing,
   referrals, ...)
3. **Models** (`modules/*/models.py`) — SQLAlchemy 2.0 async ORM
4. **Schemas** (`modules/*/schemas.py`) — Pydantic v2 для входа/выхода
5. **Services** (`modules/*/service.py`) — pure async functions с
   `db: AsyncSession` параметром

### Зависимости (DI)

- `get_db` — async-сессия SQLAlchemy на запрос
- `get_current_user` (`CurrentUser`) — JWT auth, читает заголовок
  `Authorization: Bearer <access>`
- `require_admin` (`AdminUser`) — проверка `role == "admin"`
- `require_active_subscription` (`ActiveSubscription`) — trial/active
- `get_api_key_user` (`ApiKeyUser`) — для публичного API

### Auth

- **Access token**: JWT, 30 минут, claims: `sub`, `type=access`, `exp`
- **Refresh token**: JWT, 30 дней, `type=refresh`
- Бэкенд stateless: токены не хранятся в БД (logout — клиентский)
- При истечении access токена фронтенд автоматически обновляет
  через `/auth/refresh` (см. `frontend/src/api/client.ts`)

### Биллинг flow

1. Регистрация → trial subscription на TRIAL_DAYS дней
2. `POST /billing/subscribe {plan_id, provider}` →
   создаётся `Payment(pending)` + ссылка на провайдера
3. Юзер платит → провайдер шлёт webhook
4. Webhook проверяет подпись → `Payment.status = success` →
   `activate_paid_subscription` → notification + email
5. Если есть реферер → `ReferralPayout(pending)` + уведомление

## Frontend (Next.js)

### App Router groups

- `(public)` — лендинг, /pricing, /ref/[code] — без авторизации
- `(auth)` — login/register/...  — отдельный layout без сайдбара
- `(dashboard)` — личный кабинет, защищён `AuthGuard`
- `(admin)` — админка, защищён `AuthGuard requireAdmin`

### State

- **Серверное состояние** — TanStack Query (плюс автоматический кэш +
  invalidation)
- **Клиентское** — Zustand (только `user` + `ui`)
- **Токены** — `localStorage` через `tokenStorage` в `api/client.ts`

### Refresh-token interceptor

При 401 от backend axios автоматически:

1. Делает `POST /auth/refresh` с refresh-токеном
2. Сохраняет новые токены
3. Повторяет провалившийся запрос
4. Параллельные запросы выстраиваются в очередь до успеха refresh

Если refresh тоже не удался — токены чистятся, редирект на `/login`.

## Инфраструктура

### Локально

`docker-compose.yml` — только PostgreSQL (и опционально Redis с
`--profile with-redis`). Backend/frontend запускаются с хоста для
быстрой разработки.

### Production

`docker-compose.prod.yml` — postgres + redis (опц.) + backend + frontend
+ nginx (как reverse proxy + TLS).

Backend Dockerfile запускает миграции (`alembic upgrade head`) и
`create_admin.py` перед стартом uvicorn — это безопасно и идемпотентно.

## Опциональный Redis

Все модули проверяют `settings.redis_enabled` перед обращением к Redis
и имеют PostgreSQL fallback. **Никогда** не делайте `import redis` на
верхнем уровне модуля — только лениво внутри функций.

## Безопасность

- Пароли — bcrypt
- API ключи — bcrypt от полного ключа, в БД только `key_prefix` + `key_hash`
- JWT — HS256 + SECRET_KEY (минимум 32 символа)
- CORS — `CORS_ORIGINS` из `.env`
- Webhook Robokassa — подпись через MD5(`out_sum:inv_id:password2`)
- В каждом CRUD — фильтр по `user_id` (пользователь видит только своё)

## Миграции

Alembic с async engine. Файлы: `backend/alembic/versions/0001-0007*`.
Каждая миграция атомарна и имеет downgrade.

Новые модели — добавьте импорт в `models_registry.py` и сделайте
`alembic revision --autogenerate`.
