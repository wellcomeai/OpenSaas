# Деплой через Docker Compose

## Локальная разработка

```bash
# 1. Подготовить .env
cp .env.example .env

# 2. Запустить PostgreSQL (и опционально Redis)
docker-compose up -d
# или с Redis:
docker-compose --profile with-redis up -d

# 3. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/create_admin.py
uvicorn main:app --reload --port 8000

# 4. Frontend (новый терминал)
cd frontend
npm install
npm run dev
```

## Production на VPS (Ubuntu 22.04+)

### Подготовка сервера

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Compose plugin
sudo apt-get install -y docker-compose-plugin
```

### Клонировать и настроить

```bash
git clone https://github.com/YOUR_USERNAME/opensaas.git
cd opensaas

cp .env.example .env
nano .env
```

Заполните `.env`. Обязательно:

- `ENVIRONMENT=production`
- сильные `SECRET_KEY`, `ADMIN_PASSWORD`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (для контейнера БД)
- `DATABASE_URL=postgresql+asyncpg://opensaas:<password>@postgres:5432/opensaas_db`
- если Redis: `REDIS_URL=redis://redis:6379`
- `APP_URL`, `API_URL` — внешние URL
- `CORS_ORIGINS` — список фронтенд-доменов через запятую

### Запуск

```bash
# Без Redis
docker-compose -f docker-compose.prod.yml up -d --build

# С Redis
docker-compose -f docker-compose.prod.yml --profile with-redis up -d --build

# Проверить статус
docker-compose -f docker-compose.prod.yml ps
```

Ожидаемый результат:

```
NAME                STATUS
opensaas-backend    Up
opensaas-frontend   Up
opensaas-postgres   Up (healthy)
opensaas-nginx      Up
```

## Полезные команды

```bash
# Логи
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Войти в backend
docker exec -it opensaas-backend bash

# Миграции вручную
docker exec opensaas-backend alembic upgrade head
docker exec opensaas-backend alembic revision --autogenerate -m "..."
docker exec opensaas-backend alembic downgrade -1

# Перезапуск
docker-compose -f docker-compose.prod.yml restart backend

# Обновление после git pull
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build backend frontend
docker exec opensaas-backend alembic upgrade head

# Остановка
docker-compose -f docker-compose.prod.yml down

# ВНИМАНИЕ: удалит данные БД!
docker-compose -f docker-compose.prod.yml down -v
```

## SSL через Let's Encrypt

```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

mkdir -p nginx/certs
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/certs/

# Обновить nginx/nginx.conf — раскомментировать TLS секцию
docker-compose -f docker-compose.prod.yml restart nginx
```

Автообновление сертификата:

```cron
0 12 * * * certbot renew --quiet && docker restart opensaas-nginx
```

## Резервные копии БД

```bash
# Бэкап
docker exec opensaas-postgres pg_dump -U opensaas opensaas_db > backup.sql

# Восстановление
docker exec -i opensaas-postgres psql -U opensaas opensaas_db < backup.sql
```

Настройте регулярные бэкапы через cron + копирование в S3/B2.
