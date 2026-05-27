# Components — контекст

## Структура

- `ui/` — базовые shadcn компоненты (Button, Input, Card, Badge, Dialog,
  Label, Skeleton, Textarea). Стилизуются через CSS-переменные темы.
- `layout/` — Sidebar, Header, Footer, PublicHeader.
- `landing/` — секции лендинга (Hero, Features, Pricing, Testimonials,
  FAQ, CTA).
- `billing/` — TrialBanner, PlanCard, PaymentHistory.
- `referrals/` — ReferralWidget, PayoutHistory.
- `AuthGuard.tsx` — обёртка для защищённых страниц (требует логин,
  опционально требует admin).
- `EmailBanner.tsx` — баннер «подтвердите email» (показывается только
  если `user.is_email_verified === false`).
- `Providers.tsx` — `QueryClientProvider` + `Toaster`.

## Соглашения

- Все компоненты, использующие хуки или интерактивность, помечены
  `"use client"` сверху.
- Серверные компоненты (без `"use client"`) предпочтительнее для статики
  — это уменьшает JS-бандл.
- Стили через Tailwind utility-классы и `cn(...)` из `@/lib/utils`.
- Иконки — `lucide-react`.

## Добавление shadcn-компонента

Скопируйте файл из <https://ui.shadcn.com> в `components/ui/`. Большинство
компонентов уже использует Radix UI (`@radix-ui/...`) — добавьте нужный
пакет в `package.json`.

## Тема / бренд

Цвета приходят из `globals.css` через CSS-переменные. Чтобы изменить
основной цвет — поменяйте `--primary` и `--primary-foreground`
в `:root` и `.dark`.
