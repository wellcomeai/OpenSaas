"""GitHub App integration: JWT, Installation Token, git и REST API."""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

import httpx
import jwt

from config import settings

logger = logging.getLogger("codeai.github_app")

GITHUB_API = "https://api.github.com"


def _private_key() -> str:
    """Достаёт PEM-ключ. Поддерживает многострочный env или путь к файлу."""
    raw = settings.github_app_private_key
    if not raw:
        raise RuntimeError("GITHUB_APP_PRIVATE_KEY is not configured")
    if raw.strip().startswith("-----BEGIN"):
        return raw.replace("\\n", "\n")
    p = Path(raw)
    if p.exists():
        return p.read_text()
    return raw


def generate_jwt() -> str:
    """JWT подписанный приватным ключом App. Срок жизни 10 минут."""
    if not settings.github_app_id:
        raise RuntimeError("GITHUB_APP_ID is not configured")
    now = int(time.time())
    payload = {
        "iat": now - 30,
        "exp": now + 9 * 60,
        "iss": settings.github_app_id,
    }
    return jwt.encode(payload, _private_key(), algorithm="RS256")


async def get_installation_token(installation_id: str) -> str:
    """Создаёт installation access token (живёт ~1 час)."""
    headers = {
        "Authorization": f"Bearer {generate_jwt()}",
        "Accept": "application/vnd.github+json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{GITHUB_API}/app/installations/{installation_id}/access_tokens",
            headers=headers,
        )
        r.raise_for_status()
        return r.json()["token"]


async def list_installation_repos(install_token: str) -> list[dict[str, Any]]:
    """Список репо доступных через installation token."""
    headers = {
        "Authorization": f"Bearer {install_token}",
        "Accept": "application/vnd.github+json",
    }
    repos: list[dict[str, Any]] = []
    page = 1
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            r = await client.get(
                f"{GITHUB_API}/installation/repositories",
                headers=headers,
                params={"per_page": 100, "page": page},
            )
            r.raise_for_status()
            data = r.json()
            chunk = data.get("repositories", [])
            repos.extend(chunk)
            if len(chunk) < 100:
                break
            page += 1
    return repos


async def list_user_installations(user_token: str) -> list[dict[str, Any]]:
    """Список installations конкретного юзера (использует user OAuth token)."""
    headers = {
        "Authorization": f"Bearer {user_token}",
        "Accept": "application/vnd.github+json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{GITHUB_API}/user/installations", headers=headers)
        r.raise_for_status()
        return r.json().get("installations", [])


def _run(cmd: list[str], cwd: str | None = None) -> str:
    """Тонкая обёртка над subprocess для git."""
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, check=False
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed: {' '.join(cmd)}\nstderr: {result.stderr}"
        )
    return result.stdout


def clone_repo(repo_full_name: str, install_token: str, dest_dir: str) -> str:
    """Клонирует репо во временную папку. Возвращает путь."""
    dest = Path(dest_dir)
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://x-access-token:{install_token}@github.com/{repo_full_name}.git"
    _run(["git", "clone", "--depth", "1", url, str(dest)])
    return str(dest)


def create_branch(repo_path: str, branch_name: str) -> None:
    _run(["git", "checkout", "-b", branch_name], cwd=repo_path)


def commit_and_push(
    repo_path: str,
    files_changed: list[str],
    message: str,
    branch_name: str,
    author_name: str = "CodeAI",
    author_email: str = "codeai@opensaas.local",
) -> None:
    _run(["git", "config", "user.name", author_name], cwd=repo_path)
    _run(["git", "config", "user.email", author_email], cwd=repo_path)
    if files_changed:
        _run(["git", "add", "--", *files_changed], cwd=repo_path)
    else:
        _run(["git", "add", "-A"], cwd=repo_path)
    _run(["git", "commit", "-m", message], cwd=repo_path)
    _run(["git", "push", "-u", "origin", branch_name], cwd=repo_path)


async def create_pull_request(
    install_token: str,
    repo_full_name: str,
    head_branch: str,
    base_branch: str,
    title: str,
    body: str,
) -> str:
    headers = {
        "Authorization": f"Bearer {install_token}",
        "Accept": "application/vnd.github+json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            f"{GITHUB_API}/repos/{repo_full_name}/pulls",
            headers=headers,
            json={
                "title": title,
                "body": body,
                "head": head_branch,
                "base": base_branch,
            },
        )
        r.raise_for_status()
        return r.json()["html_url"]


def cleanup_workspace(path: str) -> None:
    """Удалить временную папку репо."""
    p = Path(path)
    if p.exists():
        shutil.rmtree(p, ignore_errors=True)


def exchange_code_for_user_token(code: str) -> str:
    """OAuth callback: code → user access_token."""
    if not settings.github_app_client_id or not settings.github_app_client_secret:
        raise RuntimeError("GitHub OAuth client credentials are not configured")
    r = httpx.post(
        "https://github.com/login/oauth/access_token",
        data={
            "client_id": settings.github_app_client_id,
            "client_secret": settings.github_app_client_secret,
            "code": code,
        },
        headers={"Accept": "application/json"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["access_token"]
