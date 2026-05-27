# rate_limit — контекст

## Назначение

Лимит запросов в час. Используется для API ключей (`middleware.py` ApiKeyUser).

## Файлы

- `service.py` — `check_rate_limit(db, identifier, limit) -> bool`

## Бизнес-логика

Single function `check_rate_limit`:

- Если `settings.redis_enabled` → счётчик в Redis (INCR + EXPIRE)
- Иначе → upsert в таблицу `rate_limit_entries` (PostgreSQL)

Возвращает `True` если запрос разрешён, `False` если лимит превышен.

Window — фиксированный час (truncated по часу UTC).

## Зависимости

- `modules.api_keys.models.RateLimitEntry` (только для PostgreSQL fallback)
- `redis.asyncio` (только если REDIS_URL задан — ленивый импорт)

## Конфигурация

`REDIS_URL` — пустая строка значит PostgreSQL fallback.

## Как расширить

- **Sliding window** вместо fixed: использовать sorted set в Redis
  с `ZREMRANGEBYSCORE`.
- **Per-IP лимит** (для login, register): добавить отдельный endpoint
  middleware с `identifier = "ip:" + request.client.host`.
- **Cleanup old entries** — функция `cleanup_old_entries` существует;
  можно навесить cron или периодически вызывать.

## Нельзя менять

- Сигнатура `check_rate_limit` — используется в `api_keys/middleware.py`.
