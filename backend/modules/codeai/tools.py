"""Tool definitions for the conversational CodeAI agent."""
from __future__ import annotations

from typing import Any

TOOLS: list[dict[str, Any]] = [
    {
        "name": "list_files",
        "description": "Получить список всех файлов репозитория. "
        "Используй до того как читать или менять что-либо.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Папка, по умолчанию корень репо.",
                }
            },
        },
    },
    {
        "name": "read_file",
        "description": "Прочитать содержимое файла из репозитория.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "edit_file",
        "description": "Создать новый файл или полностью переписать "
        "существующий. Передай весь новый контент целиком.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["path", "content"],
        },
    },
    {
        "name": "delete_file",
        "description": "Удалить файл из репозитория.",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
            },
            "required": ["path"],
        },
    },
    {
        "name": "create_pr",
        "description": "Закоммитить все внесённые изменения и открыть "
        "Pull Request в GitHub. Вызови ровно один раз, когда все правки "
        "готовы.",
        "input_schema": {
            "type": "object",
            "properties": {
                "branch_name": {
                    "type": "string",
                    "description": "ai/kebab-case-name",
                },
                "title": {"type": "string"},
                "description": {
                    "type": "string",
                    "description": "Markdown описание PR",
                },
            },
            "required": ["branch_name", "title", "description"],
        },
    },
]


def openai_tools() -> list[dict[str, Any]]:
    """Convert the Anthropic-style schema above into OpenAI's function calling
    format (which OpenRouter also accepts)."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            },
        }
        for t in TOOLS
    ]
