# Добавление своего модуля

В этом руководстве — пошаговый паттерн «как добавить новый домен в
OpenSaaS». В качестве примера возьмём модуль `projects` (проекты
пользователя).

## 1. Создать backend модуль

```bash
mkdir -p backend/modules/projects
```

Создайте файлы:

### `backend/modules/projects/CLAUDE.md`

Опишите назначение, файлы, модели, endpoints, зависимости. См. примеры
в существующих модулях.

### `backend/modules/projects/models.py`

```python
from __future__ import annotations
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

### `backend/modules/projects/schemas.py`

```python
from __future__ import annotations
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ProjectPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    created_at: datetime
```

### `backend/modules/projects/service.py`

CRUD с фильтром по `user_id` — см. `modules/demo_notes/service.py` как
образец. **Всегда** проверяйте `obj.user_id == user.id`.

## 2. Зарегистрировать модель для Alembic

```python
# backend/models_registry.py
from modules.projects.models import Project  # noqa: F401
```

## 3. Создать миграцию

```bash
cd backend
alembic revision --autogenerate -m "add_projects"
```

Проверьте файл в `alembic/versions/`. Применить:

```bash
alembic upgrade head
```

## 4. Создать роутер

`backend/api/v1/internal/projects.py`:

```python
from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import CurrentUser
from modules.projects import service
from modules.projects.schemas import ProjectCreate, ProjectPublic

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectPublic])
async def list_projects(
    user: CurrentUser, db: Annotated[AsyncSession, Depends(get_db)]
):
    items = await service.list_projects(db, user)
    return [ProjectPublic.model_validate(p) for p in items]
```

## 5. Подключить в общем роутере

```python
# backend/api/v1/router.py
from api.v1.internal import projects as projects_router
api_router.include_router(projects_router.router)
```

## 6. Frontend: API клиент

`frontend/src/api/projects.ts`:

```ts
import { apiClient } from "./client";

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export const projectsApi = {
  async list(): Promise<Project[]> {
    const r = await apiClient.get("/api/v1/projects");
    return r.data;
  },

  async create(name: string): Promise<Project> {
    const r = await apiClient.post("/api/v1/projects", { name });
    return r.data;
  },
};
```

## 7. Frontend: страница

`frontend/src/app/(dashboard)/projects/page.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/api/projects";

export default function ProjectsPage() {
  const { data } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });
  return (
    <div>
      <h1 className="text-3xl font-bold">Проекты</h1>
      {data?.map((p) => <div key={p.id}>{p.name}</div>)}
    </div>
  );
}
```

## 8. Ссылка в сайдбаре

```ts
// frontend/src/components/layout/Sidebar.tsx
const userNav = [
  // ...
  { href: "/projects", label: "Проекты", icon: FolderKanban },
];
```

## Чек-лист

- [ ] `backend/modules/<name>/{CLAUDE,models,schemas,service}.{md,py}`
- [ ] `models_registry.py` обновлён
- [ ] Миграция Alembic создана и применена
- [ ] Роутер в `api/v1/internal/<name>.py`
- [ ] Подключён в `api/v1/router.py`
- [ ] Frontend API клиент в `src/api/<name>.ts`
- [ ] Типы в `src/types/index.ts`
- [ ] Страница в `src/app/(dashboard)/<name>/page.tsx`
- [ ] Ссылка в Sidebar
- [ ] Защита: в service.py везде фильтр по `user_id`

## Распространённые ошибки

- **Забыли импорт в `models_registry.py`** — autogenerate не увидит
  новую таблицу.
- **Не фильтруете по `user_id`** в service — пользователь видит чужие
  данные. Утечка!
- **Хардкодите API URL** в frontend — используйте `apiClient` (он сам
  префиксит `NEXT_PUBLIC_API_URL`).
