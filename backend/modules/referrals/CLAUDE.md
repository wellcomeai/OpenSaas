# referrals — контекст

## Назначение

Реферальная программа: коды, ссылки, выплаты (20% от платежа).

## Файлы

- `models.py` — ReferralCode, ReferralLink, ReferralPayout
- `schemas.py` — Pydantic схемы
- `service.py` — get_or_create_code, attach_referral,
  process_payment_for_referral, calculate_stats, admin_*

## Модели

- **ReferralCode** (1:1 с User): уникальный код, активен/неактивен
- **ReferralLink**: code → referred_user, статус (registered/trial/converted)
- **ReferralPayout**: payment_id, amount (20%), status
  (pending/approved/paid/rejected)

## Бизнес-логика

### Привязка

1. `/ref/CODE` (frontend) → сохраняет cookie `referral_code=CODE` (30 дней)
2. Регистрация → передать `referral_code` в `/auth/register`
3. `attach_referral`: ставит `user.referred_by_id` и создаёт ReferralLink

### Выплаты

- При успешном webhook платежа `process_payment_for_referral`:
  - Создаёт `ReferralPayout(status=pending, amount=20% от payment.amount)`
  - Обновляет `ReferralLink.status → converted`
  - Notification + email рефереру

### Админ-флоу

- `/admin/referrals` — список pending выплат
- Approve → `status=approved`
- Mark paid → `status=paid`, `paid_at=now`
- Reject → `status=rejected`

## Endpoints

```
GET   /api/v1/referrals/my-code
GET   /api/v1/referrals/stats
GET   /api/v1/referrals/payouts
GET   /api/v1/admin/referrals/payouts
PATCH /api/v1/admin/referrals/payouts/{id}/approve|mark-paid|reject
```

## Зависимости

- `modules.auth.models.User`
- `modules.billing.models.Payment` (FK в ReferralPayout)

## Как расширить

- **Двухуровневая реферальная программа**: добавить `level` в ReferralPayout,
  при платеже создавать payout не только прямому рефереру, но и его рефереру
  (например 5%).
- **Промо-баланс**: новая таблица `user_balance` где зачисляются выплаты,
  и эндпоинт вывода.

## Конфигурация

- `REFERRAL_COMMISSION_PERCENT` (default 20) — процент комиссии.
