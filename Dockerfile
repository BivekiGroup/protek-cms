### Stage 1: build Next.js standalone
FROM node:20-bookworm-slim AS builder

# Устанавливаем рабочую директорию
WORKDIR /app

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

# Устанавливаем зависимости c допуском legacy peer deps
RUN npm i -g npm@10 \
 && npm i --legacy-peer-deps --no-audit --no-fund

# Копируем остальные файлы
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

ENV DOCKER_BUILD=true

# Собираем приложение
RUN npm run build
RUN npm prune --omit=dev && npm cache clean --force

### Stage 2: runtime with official Puppeteer image (Chrome preinstalled)
FROM ghcr.io/puppeteer/puppeteer:latest
WORKDIR /app

ENV NODE_ENV=production \
    APP_WRITE_DIR=/tmp/appdata \
    NEXT_TELEMETRY_DISABLED=1

# Копируем результат standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
## Важно: движки Prisma нужны в рантайме
COPY --from=builder /app/node_modules/.prisma /app/.prisma

EXPOSE 3000
# ENTRYPOINT от официального образа уже включает init
CMD ["node", "server.js"]
