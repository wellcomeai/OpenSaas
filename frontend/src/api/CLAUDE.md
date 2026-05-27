# API клиенты — контекст

## Назначение

Тонкие обёртки над axios для вызова backend API. Используются в
React-компонентах через TanStack Query.

## Файлы

- `client.ts` — настроенный axios:
  - читает `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)
  - добавляет `Authorization: Bearer <access>` из localStorage
  - **interceptor**: при 401 пытается обновить токен через
    `/auth/refresh`, ставит в очередь параллельные запросы, при провале
    очищает токены и редиректит на `/login`
  - `tokenStorage.{access,refresh,set,clear}` — единственное место
    работы с `localStorage`
- `auth.ts` — register / login / refresh / logout / confirm-email / ...
- `users.ts` — `/users/me`
- `billing.ts` — планы, подписка, платежи
- `referrals.ts` — мой код, статистика, выплаты
- `apiKeys.ts` — управление API ключами
- `notifications.ts` — список, mark read
- `admin.ts` — админские эндпоинты

## Соглашения

- Все методы возвращают **`.data`** axios-ответа (типизированные).
- Никакого state — только сетевые вызовы.
- Имена методов = action verb (`list`, `create`, `delete`, `revoke`, ...).
- Импорт типов из `@/types`.

## Как добавить новый API клиент

1. Создать `<name>.ts` со структурой `export const <name>Api = { ... }`.
2. Каждый метод async, возвращает `.data`.
3. Если есть новые сущности — добавить интерфейсы в `@/types/index.ts`.
4. Использовать в компонентах через `useQuery` / `useMutation` из
   TanStack Query.

## Пример

```ts
import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/api/billing";

const { data: plans } = useQuery({
  queryKey: ["plans"],
  queryFn: () => billingApi.listPlans(),
});
```

## Никогда

- **Не храните токены в state/Zustand** — только в `tokenStorage`
  (localStorage). State хранит только `user`.
- **Не дублируйте refresh-логику** — она в `client.ts`.
