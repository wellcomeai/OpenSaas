# codeai — контекст

## Назначение

AI-агент для работы с GitHub репозиториями пользователя:
индексирует код (chunks + embeddings → pgvector), принимает задачи,
планирует изменения, после подтверждения коммитит и открывает PR.

## Файлы

- `models.py` — CodeAIProject, CodeAIChunk, CodeAISession, CodeAIMessage,
  CodeAISettings, CodeAIInstallation (user_id ↔ github_installation_id)
- `schemas.py` — Pydantic схемы (НЕТ полей `api_key` нигде)
- `service.py` — бизнес-логика CRUD и оркестрация background задач
- `github_app.py` — JWT, installation token, clone/commit/push, PR API
- `openrouter.py` — список моделей, chat completion, embeddings
- `indexer.py` — sliding-window chunking + embeddings
- `agent.py` — semantic search, build_plan, execute_plan + in-memory SSE
  event broker (`_session_queues`)

## API ключ — только системный

Все запросы к OpenRouter идут с системным `OPENROUTER_API_KEY` из env.
Пользователи **не** могут добавлять свои ключи. В `schemas.py` и
`models.py` поля `api_key` нет.

## Модели

- **CodeAIProject** — связан с одним GitHub репо через
  `github_installation_id` + `repo_full_name`
- **CodeAIChunk** — `pgvector(1536)` для embedding-а
- **CodeAISession** — статусы:
  `idle → planning → awaiting_confirmation → executing → done|error`
- **CodeAIMessage** — реальная колонка `metadata` (атрибут `meta` в модели)
- **CodeAISettings** — модели юзера (planning_model, editing_model)

## Background tasks

Сейчас фон выполняется через `asyncio.create_task` с собственной
`AsyncSessionLocal()`. Если нужен надёжный исполнитель — добавьте
Celery/Arq.

## SSE стрим

`agent.publish_event(session_id, {...})` пишет в очередь,
`agent.stream_events(session_id)` отдаёт события. Это in-memory
(одиночный воркер). При деплое на несколько процессов нужен Redis pub/sub.

## Endpoints

```
GET    /api/v1/codeai/github/install-url      -- URL установки GitHub App с state-JWT
GET    /api/v1/codeai/github/callback         -- бекредирект после установки GitHub App
GET    /api/v1/codeai/repos                   -- список репо юзера
POST   /api/v1/codeai/projects                -- создать проект
GET    /api/v1/codeai/projects
DELETE /api/v1/codeai/projects/{id}
POST   /api/v1/codeai/projects/{id}/index
GET    /api/v1/codeai/projects/{id}/status
GET    /api/v1/codeai/projects/{id}/sessions
POST   /api/v1/codeai/sessions
GET    /api/v1/codeai/sessions/{id}
GET    /api/v1/codeai/sessions/{id}/messages
POST   /api/v1/codeai/sessions/{id}/confirm
POST   /api/v1/codeai/sessions/{id}/cancel
GET    /api/v1/codeai/sessions/{id}/stream    -- SSE
GET    /api/v1/codeai/settings
PUT    /api/v1/codeai/settings
GET    /api/v1/codeai/models
POST   /api/v1/codeai/webhooks/github
```

## ENV (см. .env.example)

```
GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_WEBHOOK_SECRET,
GITHUB_APP_CLIENT_ID, GITHUB_APP_CLIENT_SECRET, GITHUB_APP_INSTALLATION_URL,
OPENROUTER_API_KEY,
CODEAI_DEFAULT_PLANNING_MODEL, CODEAI_DEFAULT_EDITING_MODEL,
CODEAI_EMBEDDINGS_MODEL,
CODEAI_WORKSPACE_DIR, CODEAI_MAX_FILE_SIZE_KB,
CODEAI_CHUNK_SIZE, CODEAI_CHUNK_OVERLAP
```

## Нельзя

- Не возвращать и не хранить API ключи пользователей.
- Не пушить напрямую в default branch.
- Не делать git операции без удаления `tmp/repos/{session_id}/` в finally.
