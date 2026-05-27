# billing — контекст

## Назначение

Планы, подписки, платежи. Интеграция с Робокассой (готово) и Stripe
(заготовка).

## Файлы

- `models.py` — Plan, Subscription, Payment + enum'ы статусов
- `schemas.py` — Pydantic схемы
- `service.py` — list_plans, create_payment_for_plan, activate_paid_subscription, ...
- `robokassa.py` — `build_payment_url`, `verify_result_signature`
- `stripe.py` — заготовка, TODO для будущей реализации

## Модели

- **Plan**: name, price, currency, interval (month/year), features (JSON),
  is_active, sort_order
- **Subscription**: user_id, plan_id, status (trial/active/cancelled/...),
  current_period_start/end
- **Payment**: user_id, subscription_id, amount, currency, status, provider,
  provider_payment_id, payment_metadata (JSON)

## Бизнес-логика

### Trial система

- При регистрации: `Subscription(status=trial, current_period_end=now + TRIAL_DAYS)`
- Зависимость `ActiveSubscription` пропускает trial если `current_period_end > now()`,
  иначе 402 + `{redirect: "/billing"}`.

### Платёж

1. Frontend → `POST /billing/subscribe {plan_id, provider}`
2. Backend создаёт `Payment(status=pending)` и возвращает `payment_url`
3. Юзер платит на стороне провайдера
4. Провайдер шлёт webhook (`/api/v1/webhooks/robokassa`)
5. Webhook: проверка подписи → `activate_paid_subscription` → notification + email
6. `referrals.process_payment_for_referral` создаёт payout если есть реферер

## Endpoints

```
GET  /api/v1/billing/plans
GET  /api/v1/billing/subscription
POST /api/v1/billing/subscribe
GET  /api/v1/billing/payments
POST /api/v1/billing/cancel
```

## Зависимости

- `modules.auth.models.User`
- `modules.referrals.service.process_payment_for_referral` (вызывается из webhook)
- `modules.notifications.service.create_notification`
- `modules.email.service.send_*`

## Как расширить

- **Реализовать Stripe**: см. TODO в `stripe.py` и `api/v1/public/webhooks.py`.
- **Скидки/промокоды**: новая таблица `coupons`, поле `coupon_id` в Payment.
- **Тарификация по использованию**: новая таблица `usage_events`,
  модель `MeteredItem`.

## Нельзя менять

- Webhook сигнатура с `OutSum/InvId/SignatureValue` — формат Робокассы.
- Поле `payment.payment_metadata['plan_id']` — используется в
  `activate_paid_subscription`.
