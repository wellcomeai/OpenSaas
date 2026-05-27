# Getting Started

## Требования

- Python 3.11+
- Node.js 20+
- PostgreSQL 15 (или Docker)
- Redis 7 (опционально)

## Локальная установка

### 1. Клонировать репозиторий

```bash
git clone <repo-url> opensaas
cd opensaas
```

### 2. Подготовить .env

```bash
cp .env.example .env
```

Минимум — задайте безопасный `SECRET_KEY` (>= 32 символа) и
`ADMIN_PASSWORD`.

### 3. Запустить PostgreSQL (через Docker)

```bash
# Без Redis
docker-compose up -d

# С Redis (если хотите использовать)
docker-compose --profile with-redis up -d
```

Проверьте статус: `docker-compose ps`.

### 4. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate     # Linux/Mac
# .venv\Scripts\activate      # Windows

pip install -r requirements.txt

# Применить миграции
alembic upgrade head

# Создать админа и дефолтные планы (идемпотентно)
python scripts/create_admin.py

# Запуск
uvicorn main:app --reload --port 8000
```

Backend будет доступен:

- API: <http://localhost:8000>
- Swagger UI: <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Health: <http://localhost:8000/health>

### 5. Frontend

В новом терминале:

```bash
cd frontend
npm install
npm run dev
```

Откройте <http://localhost:3000>.

## Первые шаги

1. Откройте лендинг — <http://localhost:3000>
2. Нажмите «Зарегистрироваться» — создайте свой аккаунт
3. Проверьте логи backend — там будет письмо подтверждения (если SMTP не настроен)
4. Перейдите в `/dashboard`
5. Войдите как админ (создан скриптом `create_admin.py`) — увидите
   админ-меню в сайдбаре

## Дальше

- [Архитектура](architecture.md) — как всё устроено
- [Добавление модулей](adding-modules.md) — расширение шаблона
- [Деплой на Render](deployment-render.md)
- [Деплой Docker](deployment-docker.md)
