"""Создаёт схему БД из SQLAlchemy-моделей (без Alembic).

Идемпотентен: использует Base.metadata.create_all (checkfirst=True),
поэтому создаёт только недостающие таблицы/типы и безопасно прогоняется
на каждом старте. Перед созданием таблиц включает расширение pgvector,
которое нужно для колонок codeai (Vector).

Запускается на деплое вместо `alembic upgrade head`.
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from database import Base, engine  # noqa: E402
import models_registry  # noqa: E402,F401  # регистрирует все модели в Base.metadata


async def main() -> None:
    async with engine.begin() as conn:
        # pgvector нужен до создания таблиц с колонками Vector (codeai)
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("==> Schema ensured from models (create_all)")


if __name__ == "__main__":
    asyncio.run(main())
