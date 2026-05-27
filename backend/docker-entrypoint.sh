#!/bin/sh
set -e

echo "==> Running database migrations..."
alembic upgrade head

echo "==> Ensuring admin user / default plans..."
python scripts/create_admin.py

echo "==> Starting gunicorn (uvicorn workers)..."
exec gunicorn main:app \
    -k uvicorn.workers.UvicornWorker \
    -w "${GUNICORN_WORKERS:-4}" \
    -b "0.0.0.0:${PORT:-8000}" \
    --access-logfile - \
    --error-logfile -
