"""Модуль AI-генерации видео-анимаций (text → mp4).

Конвейер: текст → LLM (OpenRouter) генерирует самодостаточный HTML с
window.renderFrame(t) → Playwright покадрово рендерит PNG → ffmpeg
склеивает в mp4.
"""
