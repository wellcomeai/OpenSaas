# Деплой на Render + Vercel

Минимально требуется PostgreSQL + Backend (Render) + Frontend (Vercel
или Render).

## 1. Подготовить репозиторий

```bash
git init
git add .
git commit -m "feat: initial OpenSaaS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/opensaas.git
git push -u origin main
```

## 2. PostgreSQL на Render

1. Render Dashboard → **+ New** → **PostgreSQL**
2. Заполнить:
   - Name: `opensaas-db`
   - Database: `opensaas_db`
   - User: `opensaas`
   - Region: ближайший к пользователям
   - Plan: Free (для старта)
3. После создания скопируйте **Internal Database URL**.

## 3. Redis на Render (опционально)

1. **+ New** → **Key Value (Redis)**
2. Name: `opensaas-redis`, Plan: Free
3. Скопируйте **Internal Redis URL**.

Пропустите этот шаг если не нужен Redis — PostgreSQL fallback работает
из коробки.

## 4. Backend Web Service

1. **+ New** → **Web Service**
2. Connect GitHub → выбрать репозиторий
3. Настройки:
   - Name: `opensaas-api`
   - Region: тот же, что у БД
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command:
     `alembic upgrade head && python scripts/create_admin.py && uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables** (заполните):

```
DATABASE_URL          # Internal Database URL из шага 2
REDIS_URL             # Internal Redis URL из шага 3 (или оставьте пустым)
SECRET_KEY            # python -c "import secrets; print(secrets.token_hex(32))"
ALGORITHM             HS256
ACCESS_TOKEN_EXPIRE_MINUTES   30
REFRESH_TOKEN_EXPIRE_DAYS     30
ADMIN_EMAIL           your@email.com
ADMIN_PASSWORD        <strong>

SMTP_HOST             smtp.gmail.com
SMTP_PORT             587
SMTP_USER             your@gmail.com
SMTP_PASSWORD         <gmail app password>
SMTP_FROM_EMAIL       noreply@yourdomain.com
SMTP_FROM_NAME        OpenSaaS
SMTP_USE_TLS          true

ROBOKASSA_MERCHANT_LOGIN  <login>
ROBOKASSA_PASSWORD1       <password1>
ROBOKASSA_PASSWORD2       <password2>
ROBOKASSA_TEST_MODE       false

STRIPE_ENABLED        false

APP_NAME              OpenSaaS
APP_URL               https://YOUR-FRONTEND.vercel.app
API_URL               https://opensaas-api.onrender.com
ENVIRONMENT           production
CORS_ORIGINS          https://YOUR-FRONTEND.vercel.app

TRIAL_DAYS                    3
REFERRAL_COMMISSION_PERCENT   20
```

5. **Create Web Service**. Дождитесь деплоя (3–5 минут).

> **Важно**: `DATABASE_URL` от Render имеет схему `postgres://`. SQLAlchemy
> async требует `postgresql+asyncpg://`. Render обычно даёт правильный
> формат для Python-сервисов; если нет — замените префикс вручную.

## 5. Frontend на Vercel

Через UI (рекомендуется):

1. <https://vercel.com> → **Add New Project**
2. Import GitHub репозиторий
3. Configure Project:
   - Framework Preset: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next` (по умолчанию)
4. Environment Variables:
   - `NEXT_PUBLIC_API_URL = https://opensaas-api.onrender.com`
5. **Deploy**

После деплоя обновите backend `CORS_ORIGINS` и `APP_URL` на реальный
URL фронтенда (если он отличается от того, что задали изначально).

## 6. Проверка

```bash
curl https://opensaas-api.onrender.com/health
# {"status":"ok","env":"production"}

curl https://opensaas-api.onrender.com/api/v1/billing/plans
# [{"name":"Basic", ...}]
```

Откройте frontend, зарегистрируйтесь, проверьте /dashboard.

## 7. Настройка Робокассы

В личном кабинете Робокассы → **Технические настройки**:

- Result URL: `https://opensaas-api.onrender.com/api/v1/webhooks/robokassa`
- Success URL: `https://YOUR-FRONTEND.vercel.app/billing?status=success`
- Fail URL: `https://YOUR-FRONTEND.vercel.app/billing?status=failed`
- Метод подписи: MD5

## Известные особенности Render Free Plan

- Сервис «засыпает» через 15 минут бездействия — первый запрос после
  паузы занимает 30–60 секунд.
- БД на Free плане сбрасывается через 90 дней — для прода обязательно
  Paid plan.
