#!/bin/bash
set -e

echo "==> Running migrations..."
cd /app/backend
gosu app alembic upgrade head
gosu app python scripts/create_admin.py

echo "==> Starting services (supervisord)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf
