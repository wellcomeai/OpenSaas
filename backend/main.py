"""FastAPI приложение OpenSaaS."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.v1.router import api_router
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("opensaas")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (%s)", settings.app_name, settings.environment)
    if settings.redis_enabled:
        logger.info("Redis enabled: %s", settings.redis_url)
    else:
        logger.info("Redis disabled — using PostgreSQL fallback for rate limiting")
    yield
    logger.info("Shutting down")


_is_production = settings.environment.lower() == "production"

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="OpenSaaS — open source SaaS boilerplate",
    lifespan=lifespan,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "Accept"],
)

app.include_router(api_router)


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "env": settings.environment}


@app.get("/", tags=["health"])
async def root() -> dict:
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": None if _is_production else "/docs",
    }
