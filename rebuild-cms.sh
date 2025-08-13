#!/bin/bash

echo "🔄 Пересоздание CMS контейнера..."

# Останавливаем и удаляем существующий контейнер
echo "⏹️  Остановка существующего контейнера..."
docker-compose down protekauto-cms

# Удаляем образ для полной пересборки
echo "🗑️  Удаление старого образа..."
docker rmi protekauto-cms_protekauto-cms 2>/dev/null || true

# Очищаем кэш сборки
echo "🧹 Очистка кэша сборки..."
docker builder prune -f

# Собираем и запускаем заново
echo "🏗️  Сборка нового контейнера..."
docker-compose up --build -d protekauto-cms

echo "✅ Готово! CMS доступен на http://localhost:3000"

# Показываем логи
echo "📋 Логи контейнера:"
docker-compose logs -f protekauto-cms 