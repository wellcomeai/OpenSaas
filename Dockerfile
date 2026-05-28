# =========================================================
# Stage 1: Build frontend
# =========================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY frontend/package*.json ./

RUN if [ -f package-lock.json ]; then \
        npm ci; \
    else \
        npm install; \
    fi

COPY frontend/ .

ENV NEXT_PUBLIC_API_URL=""

RUN npm run build


# =========================================================
# Stage 2: Runtime
# Multi-process:
# - nginx
# - gunicorn
# - nextjs standalone server
# managed by supervisord
# =========================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------
# System packages
# ---------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        curl \
        ca-certificates \
        gosu \
        postgresql-client \
        git \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get purge -y --auto-remove \
    && rm -rf /var/lib/apt/lists/* /var/cache/apt/* \
    && groupadd --system --gid 1001 app \
    && useradd  --system \
        --uid 1001 \
        --gid app \
        --home-dir /app \
        --shell /usr/sbin/nologin \
        app \
    && mkdir -p \
        /var/lib/nginx/body \
        /var/lib/nginx/proxy \
        /var/lib/nginx/fastcgi \
        /var/lib/nginx/uwsgi \
        /var/lib/nginx/scgi \
        /var/log/nginx \
    && chown -R app:app /var/lib/nginx /var/log/nginx


# =========================================================
# Backend
# =========================================================
WORKDIR /app/backend

COPY --chown=app:app backend/requirements.txt .

RUN pip install -r requirements.txt

COPY --chown=app:app backend/ .


# =========================================================
# Frontend (Next.js standalone)
# =========================================================
WORKDIR /app/frontend

COPY --from=frontend-builder --chown=app:app /app/.next/standalone ./

COPY --from=frontend-builder --chown=app:app /app/.next/static ./.next/static

COPY --from=frontend-builder --chown=app:app /app/public ./public


# =========================================================
# Configs
# =========================================================
COPY nginx-single.conf /etc/nginx/sites-available/default

COPY supervisord.conf /etc/supervisor/conf.d/app.conf

COPY start.sh /start.sh

RUN sed -i 's/\r//' /start.sh \
    && chmod +x /start.sh \
    && rm -f /etc/nginx/sites-enabled/default \
    && ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default


# =========================================================
# Runtime
# =========================================================
EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://127.0.0.1:10000/health || exit 1

CMD ["/start.sh"]
