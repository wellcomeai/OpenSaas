#!/bin/bash
set -e

echo "==> Ensuring database schema (create_all from models, no Alembic)..."
cd /app/backend
gosu app python scripts/init_db.py
gosu app python scripts/create_admin.py

echo "==> Starting services (supervisord)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf
