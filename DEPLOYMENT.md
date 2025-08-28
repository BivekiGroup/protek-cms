## Деплой ProtekAuto CMS

Ниже — проверенный сценарий деплоя в Docker с учетом нашей модели переменных (`stack.env` для сервера, `.env` — только для локальной разработки).

### Политика хранения `stack.env`
- `stack.env` хранится в репозитории как шаблон без секретов.
- В коммитах не должно быть боевых значений (ключей, паролей, токенов).
- Для справки доступен также `stack.example.env` (перечень всех ключей и формат).
- На сервере заполните `stack.env` боевыми значениями перед деплоем (или используйте секрет‑хранилище/переменные окружения CI при сборке).

### Минимальные требования
- Docker и Docker Compose
- Внешняя PostgreSQL БД (`DATABASE_URL`)
- S3-совместимое хранилище для файлов (или AWS S3)

### 1) Подготовка переменных окружения
1. Заполните `stack.env` боевыми значениями на сервере:
   - Обязательно задать: `DATABASE_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`, S3 (`AWS_*`, `S3_ENDPOINT`), платежи (`YOOKASSA_*` при необходимости), логины API (LAXIMO, AUTOEURO, OZON, Яндекс), Polza.ai (`POLZA_AI_API_KEY`, `POLZA_AI_MODEL`, `POLZA_AI_BASE_URL`), DaData.
   - При необходимости можно пересоздать файл из шаблона: `cp stack.example.env stack.env` и затем заменить плейсхолдеры.
2. Для локальной разработки используйте `.env` (не обязателен в Docker):
   - `cp .env.example .env`

Примечания:
- Публичные ключи Next начинаются с `NEXT_PUBLIC_` (например, `NEXT_PUBLIC_FRONTEND_ORIGIN`). Для CORS в API также используется `FRONTEND_ORIGIN`.
- Для работы Zzap‑скриншотов (опционально) нужны `ZZAP_EMAIL`/`ZZAP_PASSWORD`.
- Для DaData используйте `DADATA_API_KEY`.

### 2) Первый деплой
В корне `protekauto-cms`:

```bash
# Проверка и синхронизация переменных (необязательно, но полезно)
npm run env:check
# при необходимости дополнить недостающие ключи
npm run env:sync

npm run deploy
```

Скрипт `scripts/deploy.sh`:
- проверит наличие `stack.env` и базовые требования,
- пересоберёт образ (`Dockerfile.optimized`),
- поднимет сервис через `docker-compose.yml`.

После запуска:
- Приложение доступно на `http://<host>:${CMS_PORT:-3000}`.

### 3) Обновление конфигурации без пересборки
Отредактировали `stack.env` и хотим просто перезапустить контейнеры с новыми переменными:

```bash
npm run update:env
```

Скрипт `scripts/update-env.sh` перезапустит сервис и выведет статус.

### 4) Реверс‑прокси (Nginx, Caddy)
Рекомендуется проксировать `CMS_PORT` через Nginx и выдавать публичный хост (например, `admin.example.com`).

Пример для Nginx (фрагмент):
```
server {
    server_name admin.example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5) Частые вопросы
**Где хранить секреты?** — В `stack.env` на сервере или в секрет‑хранилищах CI. В репозитории держим только шаблонные/обезличенные значения (без боевых секретов).

**Зачем `.env`?** — Удобство локальной разработки. В Docker‑деплое используется `stack.env` и `docker-compose.yml`.

**Как понять, что переменные применились?** — `npm run update:env` перезапустит сервис и выведет используемые значения (частично) и статусы.

**Как синхронизировать docker-compose, stack.env и .env?**
- Используйте `npm run env:check` для отчета о пропущенных/плейсхолдерных значениях.
- Используйте `npm run env:sync`, чтобы автоматически добавить отсутствующие ключи в `stack.env` и `.env` на основе `docker-compose.yml` и `*.example.env`.
- В `docker-compose.yml` подключен `env_file: stack.env`, а для подстановки значений при деплое через репозиторий `stack.env` должен находиться в Git.

**Нет доступа к /dashboard/managers (хотя я админ)?**
- Откройте `/test-auth` и проверьте `me.role` — должна быть `ADMIN`.
- Если в БД роль `USER`, повысьте её командой:
  - `npm run make:admin -- --email=admin@example.com`
- Затем обновите `/test-auth`. Для JWT‑ролей перелогиньтесь.
