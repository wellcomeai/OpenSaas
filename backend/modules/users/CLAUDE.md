# users — контекст

## Назначение

Управление профилем пользователя: чтение `me`, обновление, смена пароля,
удаление аккаунта.

## Файлы

- `models.py` — реэкспорт `User`, `UserProfile` из `modules.auth.models`
- `schemas.py` — `ProfileUpdate`, `PasswordChange`, `UserMe`
- `service.py` — `get_me`, `update_profile`, `change_password`, `delete_me`

## Модели

Используются `auth.models.User` и `auth.models.UserProfile`.

## Endpoints

```
GET    /api/v1/users/me
PUT    /api/v1/users/me           # обновление профиля
PUT    /api/v1/users/me/password  # смена пароля
DELETE /api/v1/users/me           # удаление аккаунта
```

## Бизнес-логика

- `update_profile` — создаёт `UserProfile` если его не было.
- `change_password` — проверяет текущий пароль, иначе 400.
- `delete_me` — каскадно удаляет всё (FK ON DELETE CASCADE).

## Как расширить

- Дополнительные поля профиля → добавить в `auth.models.UserProfile` +
  миграция + поле в `ProfileUpdate`.
- Аватарка через S3 → отдельный endpoint `/users/me/avatar` с upload.
