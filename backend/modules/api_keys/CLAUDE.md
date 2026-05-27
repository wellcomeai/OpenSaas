# api_keys — контекст

## Назначение

Управление API-ключами для внешних интеграций (мобильные приложения,
скрипты, и т.д.).

## Файлы

- `models.py` — ApiKey, RateLimitEntry (последний — fallback rate limit'а)
- `schemas.py` — Pydantic схемы
- `service.py` — create_key, list_keys, revoke_key, authenticate_api_key
- `middleware.py` — FastAPI dependency `ApiKeyUser`

## Модель ApiKey

- `key_prefix` (`osk_live_XXXX...`) — первые 16 символов, показываем в UI
- `key_hash` — bcrypt(full_key); по нему проверяется ключ
- `scopes` (JSON) — массив строк `["read", "write"]`
- `rate_limit` — запросов в час (default 1000)
- `expires_at` — опционально

## Бизнес-логика

### Создание

1. Проверка `is_email_verified` (иначе 403)
2. Генерация: `osk_live_` + `secrets.token_urlsafe(32)`
3. Сохранение `key_prefix` и `bcrypt(full_key)`
4. **Возврат `full_key` ОДИН РАЗ** — больше нигде не доступен

### Проверка (middleware)

1. `Authorization: Bearer osk_live_...`
2. По первым 16 символам ищем кандидатов в БД (там не unique — поэтому
   может быть несколько)
3. `bcrypt.verify` каждого до совпадения
4. Проверка `is_active`, `expires_at`
5. `check_rate_limit(api_key_id, key.rate_limit)` через
   `modules.rate_limit.service`
6. Обновление `last_used_at`

## Endpoints

```
GET    /api/v1/api-keys
POST   /api/v1/api-keys           # возвращает full_key один раз
DELETE /api/v1/api-keys/{id}
PATCH  /api/v1/api-keys/{id}/revoke
```

## Зависимости

- `modules.auth.models.User`
- `modules.rate_limit.service.check_rate_limit`

## Как расширить

- **Scope-чек на эндпоинтах**: добавить зависимость `require_scope("write")`,
  читающую `request.state.api_key.scopes`.
- **Webhooks signing**: добавить поле `signing_secret` для подписи исходящих
  webhooks.

## Нельзя менять

- Префикс `osk_live_` — клиентский код может его проверять.
- Формат хранения (только `key_prefix` + `key_hash`). Никогда не храните
  полный ключ.
