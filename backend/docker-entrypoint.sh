#!/bin/sh
set -e

echo "==> Ensuring database schema (create_all from models, no Alembic)..."
python scripts/init_db.py

echo "==> Ensuring admin user / default plans..."
python scripts/create_admin.py

echo "==> Starting gunicorn (uvicorn workers)..."
exec gunicorn main:app \
    -k uvicorn.workers.UvicornWorker \
    -w "${GUNICORN_WORKERS:-4}" \
    -b "0.0.0.0:${PORT:-8000}" \
    --access-logfile - \
    --error-logfile -
