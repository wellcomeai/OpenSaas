# animations — контекст

## Назначение

AI-генерация видео-анимаций из текста (text → mp4). Пользователь описывает
анимацию словами → один запрос → готовый `.mp4` для скачивания.

## Конвейер

```
[текст] → OpenRouter (LLM) → самодостаточный HTML с window.renderFrame(t)
        → Playwright (headless Chromium): для каждого кадра renderFrame(t) + screenshot
        → ffmpeg: PNG-кадры → out.mp4
        → ссылка на скачивание
```

Ключевая идея — **детерминированная покадровая отрисовка**: экран не
записывается, время перематывается вручную через `renderFrame(t)`.

## Файлы

- `models.py` — `AnimationJob` + enum `AnimationJobStatus`
  (`queued → generating_html → rendering → encoding → done|error`)
- `schemas.py` — Pydantic запросы/ответы (валидация duration/fps/aspect)
- `config.py` — маппинг aspect→разрешение, лимиты (MAX_PROMPT_LENGTH, ALLOWED_FPS)
- `prompts.py` — system prompt (контракт HTML) + RETRY_HINT
- `openrouter.py` — генерация HTML + валидация + 1 авто-ретрай.
  Переиспользует `modules.codeai.openrouter.chat_completion`.
- `renderer.py` — Playwright `capture_frames()` + ffmpeg `encode_video()` + cleanup
- `service.py` — `process_job()`: оркестрация всего конвейера + CRUD

## Контракт HTML (что обязан вернуть LLM)

1. `window.renderFrame(t)` — чистая функция от `t` (сек), `[0, duration]`.
2. Никаких rAF / setInterval / CSS-анимаций / Date.now / Math.random без сида.
3. Сцена ровно `{WIDTH}x{HEIGHT}`, ничего не выходит за границы.
4. Полностью офлайн: всё инлайн, никаких внешних ресурсов (сеть блокируется).
5. Сплошной фон, `renderFrame(0)` на старте.

## Разрешения (aspect → w×h)

- `9:16` → 1080×1920 (Reels/Shorts)
- `1:1` → 1080×1080
- `16:9` → 1920×1080

## Background tasks

Фон через `asyncio.create_task(service.process_job(job_id))` (как в codeai).
`process_job` открывает свою `AsyncSessionLocal`. Параллелизм рендеров
ограничен `_render_semaphore` (env `ANIMATIONS_MAX_CONCURRENCY`).
Для надёжного исполнителя — вынести `process_job` в Celery/arq (интерфейс
уже независим от способа запуска).

## Endpoints (`/api/v1/animations`)

```
POST /generate              -- создать задачу, вернуть job_id (202)
GET  /jobs                  -- список задач юзера
GET  /jobs/{job_id}         -- статус + progress + download_url
GET  /jobs/{job_id}/download -- mp4 (FileResponse, attachment)
```

## ENV (см. .env.example)

```
OPENROUTER_API_KEY            (общий с codeai)
ANIMATIONS_MODEL             (дефолт anthropic/claude-3.7-sonnet)
ANIMATIONS_MAX_DURATION      (дефолт 30 сек)
ANIMATIONS_DEFAULT_FPS       (дефолт 30; разрешены 24/30)
ANIMATIONS_OUTPUT_DIR        (дефолт ./tmp/animations)
ANIMATIONS_MAX_CONCURRENCY   (дефолт 1)
```

## Инфраструктура

Требуются **Chromium** (Playwright) и **ffmpeg** в рантайме — оба ставятся
в `Dockerfile` (корневой и backend/): `apt-get install ffmpeg` +
`playwright install --with-deps chromium` в `/ms-playwright`
(`PLAYWRIGHT_BROWSERS_PATH`). Chromium запускается с
`--no-sandbox --disable-dev-shm-usage --disable-gpu`. Нужно ≥2 ГБ RAM.

## Безопасность / краевые случаи

- Сеть страницы блокируется (`page.route` → abort всё кроме file/data/about/blob).
- Валидация HTML до рендера: есть `renderFrame`, нет внешних ресурсов.
- `page.on("pageerror")` → прерывание рендера со статусом `error`.
- ffmpeg ненулевой код → stderr в `error_message`.
- Временные кадры всегда чистятся в `finally` (`cleanup_frames`).
- `prompt` ограничен 2000 символами; 1 активная задача на пользователя.

## Нельзя

- Не блокировать event loop CPU-работой (ffmpeg — через
  `asyncio.create_subprocess_exec`, Playwright async API уже неблокирующий).
- Не оставлять папку с кадрами (тяжёлая) после задачи.
