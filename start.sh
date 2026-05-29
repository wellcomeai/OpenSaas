#!/bin/bash
set -e

echo "==> Running migrations..."
cd /app/backend

# Run migrations. If the revision recorded in the database's alembic_version
# table no longer exists in the codebase (e.g. an orphaned "0013" left over from
# a migration that was removed), `alembic upgrade head` fails with
# "Can't locate revision identified by '...'". In that case we re-stamp the
# database to the latest known revision (head) and retry. This only triggers on
# that specific error, so normal deploys are unaffected.
if ! gosu app alembic upgrade head 2> /tmp/alembic_err.log; then
    cat /tmp/alembic_err.log
    if grep -q "Can't locate revision" /tmp/alembic_err.log; then
        echo "==> Detected orphaned alembic revision in database; re-stamping to head..."
        gosu app alembic stamp head --purge
        gosu app alembic upgrade head
    else
        echo "==> Migrations failed."
        exit 1
    fi
fi

gosu app python scripts/create_admin.py

echo "==> Starting services (supervisord)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/app.conf
