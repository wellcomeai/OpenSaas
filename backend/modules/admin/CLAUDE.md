# admin — контекст

## Назначение

Админские операции: статистика, управление пользователями, платежами,
выплатами.

## Файлы

- `service.py` — `stats`, `list_users`, `set_role`, `set_active`,
  `list_payments`
- Роуты: `backend/api/v1/internal/admin.py` (все защищены `AdminUser`)

## Endpoints

```
GET   /api/v1/admin/stats
GET   /api/v1/admin/users
PATCH /api/v1/admin/users/{id}/role
PATCH /api/v1/admin/users/{id}/block
PATCH /api/v1/admin/users/{id}/unblock
GET   /api/v1/admin/payments
GET   /api/v1/admin/referrals/payouts
PATCH /api/v1/admin/referrals/payouts/{id}/approve
PATCH /api/v1/admin/referrals/payouts/{id}/mark-paid
PATCH /api/v1/admin/referrals/payouts/{id}/reject
```

## Бизнес-логика

- Доступ только для `role=admin` (зависимость `AdminUser` на всём роутере).
- Outpayout-операции делегированы в `modules.referrals.service.admin_*`.

## Как расширить

- **Soft delete пользователей**: добавить `deleted_at` в User, фильтровать
  везде где нужно.
- **Audit log**: новая таблица `admin_actions` (admin_id, action, target_id,
  details, created_at). Логировать все PATCH-операции.
