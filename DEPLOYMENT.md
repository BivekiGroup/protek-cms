## Деплой ProtekAuto CMS

Ниже — проверенный сценарий деплоя в Docker с учетом нашей модели переменных (`stack.env` для сервера, `.env` — только для локальной разработки).

### Почему `stack.env` не в Git
- В `stack.env` хранятся прод‑секреты (ключи OpenAI, S3, платежи и т.п.).
- GitHub заблокировал пуш из‑за найденного ключа в этом файле (Push Protection). Поэтому:
  - `stack.env` добавлен в `.gitignore` и не коммитится,
  - для примера используется безопасный `stack.example.env`.

### Минимальные требования
- Docker и Docker Compose
- Внешняя PostgreSQL БД (`DATABASE_URL`)
- S3-совместимое хранилище для файлов (или AWS S3)

### 1) Подготовка переменных окружения
1. Скопировать пример и заполнить значениями:
   - `cp stack.example.env stack.env`
   - Обязательно задать: `DATABASE_URL`, `NEXTAUTH_SECRET`, `JWT_SECRET`, S3 (`AWS_*`, `S3_ENDPOINT`), платежи (`YOOKASSA_*` при необходимости), Логины API (LAXIMO, AUTOEURO, OZON, Яндекс), OpenAI.
2. Для локальной разработки используйте `.env` (не обязательен в Docker):
   - `cp .env.example .env`

Примечания:
- Публичные ключи Next начинаются с `NEXT_PUBLIC_` (например, `NEXT_PUBLIC_FRONTEND_ORIGIN`).
- Для работы Zzap‑скриншотов (опционально) нужны `ZZAP_EMAIL`/`ZZAP_PASSWORD`.
- Для DaData используйте `DADATA_API_KEY`.

### 2) Первый деплой
В корне `protekauto-cms`:

```bash
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
**Где хранить секреты?** — Только в `stack.env` на сервере (и секрет‑хранилищах CI). В репозиторий не коммитим.

**Зачем `.env`?** — Удобство локальной разработки. В Docker‑деплое используется `stack.env` и `docker-compose.yml`.

**Как понять, что переменные применились?** — `npm run update:env` перезапустит сервис и выведет используемые значения (частично) и статусы.

