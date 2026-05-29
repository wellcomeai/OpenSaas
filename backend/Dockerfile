# Официальный образ Playwright: Chromium и все его системные зависимости
# (включая шрифты) уже вшиты — `playwright install --with-deps` НЕ нужен.
# ВАЖНО: тег образа синхронизировать с версией playwright в requirements.txt.
FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

# ffmpeg — для склейки кадров в mp4 (модуль animations).
# Браузер и его либы уже в образе; делаем /ms-playwright читаемым для app.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 app \
    && useradd  --system --uid 1001 --gid app --home-dir /app --shell /usr/sbin/nologin app \
    && chmod -R a+rX /ms-playwright

COPY --chown=app:app requirements.txt .
RUN pip install -r requirements.txt

COPY --chown=app:app . .
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

USER app

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
