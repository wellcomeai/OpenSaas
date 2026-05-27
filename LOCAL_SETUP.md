# Локальный запуск OpenSaaS

## Требования

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## Первый запуск

### 1. Настрой Docker Desktop

Открой Docker Desktop → ⚙️ Settings → Docker Engine и убедись что в `registry-mirrors` **нет** `https://mirror.gcr.io`:

```json
{
  "registry-mirrors": [
    "https://dockerhub.timeweb.cloud",
    "https://huecker.io"
  ]
}
```

Нажми **Apply & Restart**.

---

### 2. Клонируй репозиторий

```powershell
git clone https://github.com/wellcomeai/realtime_saas.git
cd realtime_saas
git checkout claude/sharp-bardeen-LcnqF
```

---

### 3. Создай файл настроек

```powershell
cp .env.example .env
```

> Менять ничего не нужно — всё настроено для локального запуска.

---

### 4. Запусти проект

```powershell
docker-compose -f docker-compose.local.yml up --build
```

Первый запуск занимает **10-15 минут** — скачиваются зависимости и собирается frontend.

---

### 5. Открывай в браузере

```
http://localhost:3000
```

Войти как админ:
- Email: `admin@example.com`
- Пароль: `change_in_production`

---

## Последующие запуски

```powershell
cd realtime_saas
docker-compose -f docker-compose.local.yml up
```

Без `--build` — запускается быстро, образ уже собран.

---

## Получить обновления

```powershell
cd realtime_saas
git pull
docker-compose -f docker-compose.local.yml up --build
```

---

## Полезные команды

```powershell
# Остановить
docker-compose -f docker-compose.local.yml down

# Посмотреть логи
docker-compose -f docker-compose.local.yml logs -f

# Остановить и удалить базу данных
docker-compose -f docker-compose.local.yml down -v
```

---

## Возможные проблемы

### Ошибка EOF при сборке

```
failed to do request: Head "https://mirror.gcr.io/...": EOF
```

**Решение:** Docker Desktop → Settings → Docker Engine → убери `https://mirror.gcr.io` из `registry-mirrors` → Apply & Restart.

---

### Ошибка "already exists"

```
fatal: destination path 'realtime_saas' already exists
```

**Решение:** папка уже есть, просто перейди в неё:

```powershell
cd realtime_saas
docker-compose -f docker-compose.local.yml up --build
```
