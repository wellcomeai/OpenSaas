# broll — контекст

## Назначение

Генерация коротких фоновых B-roll анимаций по тексту. Пользователь
вводит промпт → LLM (OpenRouter) выбирает визуальную сцену из
фиксированного реестра и параметры → ffmpeg рендерит MP4 1080×1920,
30fps, 3–5 секунд, без звука. Без лимитов по тарифным планам.

## Файлы

- `models.py` — `BrollJob` + `BrollStatus` (pending/processing/done/error)
- `schemas.py` — `BrollGenerateRequest`, `BrollJobPublic`, `SceneParams`, `SceneKey`
- `scenes.py` — реестр `SCENES` + `build_command(params, output_path) -> list[str]`
- `llm.py` — `choose_scene(prompt) -> SceneParams` через OpenRouter
- `renderer.py` — асинхронный запуск ffmpeg
- `service.py` — CRUD + оркестрация фоновой задачи

## Жёсткие архитектурные решения

1. Движок рендера — **только ffmpeg** (lavfi). Никакого Chromium,
   node-canvas, Remotion, Three.js.
2. Фон — `asyncio.create_subprocess_exec`, без Celery/Arq/Redis.
3. ffmpeg вызывается **списком аргументов**, НИКОГДА не `shell=True`.
4. Ответ LLM **всегда** валидируется через Pydantic. Невалидный ответ →
   один повтор → фоллбэк на `calm_gradient`. `choose_scene` никогда не
   бросает исключение — джоба всегда завершается готовым роликом.
5. Файлы — локальный диск `settings.broll_output_dir` (R2 — позже).
6. Модель выбора сцены: `deepseek/deepseek-chat`, ключ из
   `settings.openrouter_api_key`. Переиспользуется
   `modules/codeai/openrouter.py::chat_completion` с
   `response_format={"type": "json_object"}`, temperature 0.3.

## Сцены (реестр в scenes.py)

`data_flow`, `growth_chart`, `digital_grid`, `deep_fractal`,
`particles`, `calm_gradient` (универсальный fallback). Каждая — 1080×1920,
30fps, `-pix_fmt yuv420p`, `-y`, `-loglevel error`.

## Endpoints

```
POST   /api/v1/broll/generate        CurrentUser + ActiveSubscription → 201
GET    /api/v1/broll/jobs            CurrentUser → list[BrollJobPublic]
GET    /api/v1/broll/jobs/{id}       CurrentUser → BrollJobPublic
GET    /api/v1/broll/jobs/{id}/file  CurrentUser → FileResponse(video/mp4)
```

`/file`: если status != done или файла нет — 404. Эндпоинт защищён JWT
(не делать публичным). Фронт грузит файл как blob через apiClient.

## ENV

```
OPENROUTER_API_KEY        — системный ключ (общий с codeai)
BROLL_OUTPUT_DIR          — каталог вывода (default /app/broll_output)
BROLL_RENDER_TIMEOUT      — таймаут рендера в секундах (default 90)
```

## Защита данных

Во всех ручках/CRUD фильтр по `user_id` — чужую джобу получить нельзя.

## Известные ограничения (НЕ реализовывать сейчас)

1. Рендер — один subprocess на джобу, без очереди. При нагрузке →
   вынести в Arq/Redis.
2. Файлы на локальном диске — на Render эфемерны (теряются при
   редеплое). → перенести в Cloudflare R2.
3. Графики абстрактные, не инфографика. Для буквальных графиков нужен
   canvas-движок.
4. Нет очистки старых файлов — добавить cleanup-задачу.
