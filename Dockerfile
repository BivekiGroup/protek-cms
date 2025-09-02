# Используем Node.js LTS Alpine для минимального размера
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем зависимости для Puppeteer
RUN apk update && apk add --no-cache \
    # Chromium и зависимости
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    # Дополнительные шрифты для русского языка
    ttf-dejavu \
    ttf-liberation \
    # Инструменты для сборки нативных модулей (node-gyp)
    python3 \
    make \
    g++ \
    # Совместимость и утилиты
    libc6-compat \
    git \
    bash

# Устанавливаем переменные окружения для Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV APP_WRITE_DIR=/tmp/appdata
ENV NPM_CONFIG_FUND=false
ENV NPM_CONFIG_AUDIT=false
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# ARG переменные для передачи секретов во время сборки (опционально)
ARG DATABASE_URL
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_REGION
ARG AWS_BUCKET_NAME
ARG S3_ENDPOINT
ARG NEXTAUTH_SECRET
ARG JWT_SECRET
ARG NEXTAUTH_URL
ARG BEELINE_SMS_USER
ARG BEELINE_SMS_PASS
ARG BEELINE_SMS_SENDER
ARG LAXIMO_LOGIN
ARG LAXIMO_PASSWORD
ARG LAXIMO_DOC_LOGIN
ARG LAXIMO_DOC_PASSWORD
ARG AUTOEURO_API_KEY
ARG YOOKASSA_SHOP_ID
ARG YOOKASSA_SECRET_KEY
## PartsAPI removed
ARG YANDEX_MAPS_API_KEY
ARG YANDEX_DELIVERY_TOKEN
ARG YANDEX_GEOSUGGEST_API_KEY
ARG YANDEX_DELIVERY_SOURCE_STATION_ID

# ENV переменные для runtime (будут переопределены через docker-compose или docker run)
ENV DATABASE_URL=${DATABASE_URL}
ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV AWS_REGION=${AWS_REGION}
ENV AWS_BUCKET_NAME=${AWS_BUCKET_NAME}
ENV AWS_S3_BUCKET=${AWS_BUCKET_NAME}
ENV S3_ENDPOINT=${S3_ENDPOINT}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV JWT_SECRET=${JWT_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV BEELINE_SMS_USER=${BEELINE_SMS_USER}
ENV BEELINE_SMS_PASS=${BEELINE_SMS_PASS}
ENV BEELINE_SMS_SENDER=${BEELINE_SMS_SENDER}
ENV LAXIMO_LOGIN=${LAXIMO_LOGIN}
ENV LAXIMO_PASSWORD=${LAXIMO_PASSWORD}
ENV LAXIMO_DOC_LOGIN=${LAXIMO_DOC_LOGIN}
ENV LAXIMO_DOC_PASSWORD=${LAXIMO_DOC_PASSWORD}
ENV AUTOEURO_API_KEY=${AUTOEURO_API_KEY}
ENV YOOKASSA_SHOP_ID=${YOOKASSA_SHOP_ID}
ENV YOOKASSA_SECRET_KEY=${YOOKASSA_SECRET_KEY}
## PartsAPI removed
ENV YANDEX_MAPS_API_KEY=${YANDEX_MAPS_API_KEY}
ENV YANDEX_DELIVERY_TOKEN=${YANDEX_DELIVERY_TOKEN}
ENV YANDEX_GEOSUGGEST_API_KEY=${YANDEX_GEOSUGGEST_API_KEY}
ENV YANDEX_DELIVERY_SOURCE_STATION_ID=${YANDEX_DELIVERY_SOURCE_STATION_ID}

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем все зависимости (включая dev для сборки)
# Обновляем npm до версии, совместимой с lockfile, и ставим зависимости
RUN npm i -g npm@10 && npm ci --no-audit --no-fund

# Копируем остальные файлы
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Устанавливаем флаги для Docker сборки
ENV DOCKER_BUILD=true
ENV NEXT_TELEMETRY_DISABLED=1

# Собираем приложение с правильной обработкой CSS
RUN npm run build

# Проверяем, что стили собрались
RUN ls -la .next/static/css/ || echo "CSS files not found, but continuing..."

# Удаляем dev-зависимости без переустановки (быстрее и надёжнее в CI)
RUN npm prune --omit=dev && npm cache clean --force

# Создаем пользователя для безопасности (важно для Puppeteer)
RUN addgroup -S pptruser || true \
    && adduser -S -G pptruser -h /home/pptruser -s /bin/sh pptruser || true \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && mkdir -p /tmp/appdata \
    && chmod 777 /tmp/appdata

# Переключаемся на непривилегированного пользователя
USER pptruser

# Открываем порт
EXPOSE 3000

# Запускаем standalone-сервер Next.js (см. предупреждение next start)
CMD ["node", ".next/standalone/server.js"] 
