Title: Удаление интеграций PartsAPI/PartsIndex и очистка БД
Date: 2025-08-19

Кратко
- Полностью удалены зависимости админки и фронта от PartsAPI/PartsIndex.
- UI‑разделы, связанные с этими интеграциями, убраны из CMS.
- Backend резолверы переведены на безопасные заглушки (возвращают пустые данные), чтобы не ломать сборку.
- Переменные окружения и Docker‑аргументы для PartsAPI/PartsIndex удалены.
- Ранее произведён жёсткий сброс БД по Prisma (force-reset).

Что изменено (CMS)
- Удалены файлы:
  - `src/lib/translation-service.ts`
  - `src/lib/partsapi-service.ts`
  - `src/lib/partsindex-service.ts`
  - `src/app/api/debug-partsindex/route.ts`
- Удалены разделы UI:
  - `src/app/dashboard/kraja/page.tsx`
  - `src/components/kraja/*`
  - `src/app/dashboard/navigation/page.tsx`
  - `src/components/navigation/*`
- Обновлён сайдбар: удалены пункты «Навигация сайта» и «Кража» в `src/components/ui/sidebar.tsx`.
- GraphQL:
  - В `src/lib/graphql/resolvers.ts` удалены импорты PartsAPI/PartsIndex.
  - Добавлены no‑op заглушки для методов partsIndex/partsAPI (возвращают пустые массивы/значения).
- Конфиги/ENV/Docker:
  - `.env`, `docker-compose.yml`, `Dockerfile`, `Dockerfile.optimized`, `stack.env`, `scripts/update-env.sh` — вычищены переменные/аргументы `PARTSAPI_*`, `PARTSINDEX_*` и упоминания их использования.

Что изменено (Frontend)
- Удалены/обновлены зависимости от PartsAPI/PartsIndex:
  - Файл `src/lib/partsindex-service.ts` удалён.
  - Страница `src/pages/catalog.tsx` удалена (полностью завязана на PartsAPI/PartsIndex).
  - Хук `src/hooks/useArticleImage.ts` теперь no‑op (возвращает fallback без GraphQL).
  - Хуки `src/hooks/usePartsIndex.ts` заменены на no‑op (пустые данные без сетевых вызовов).
  - `next.config.ts` — удалены домены изображений PartsAPI.
  - `docker-compose.yml`, `stack.env` — удалены переменные `PARTSAPI_URL`.

База данных
- Выполнен сброс БД Prisma (force-reset) по `protekauto-cms/.env`:
  - Команда: `npm run db:push -- --force-reset`
  - Итог: схема `public` сброшена и развернута заново по `schema.prisma`.

Что оставлено сознательно
- Модель Prisma `NavigationCategory` и слой GraphQL типов пока не удалены, чтобы избежать ненужной миграции/ломки контрактов. Сейчас они не используются в UI и не вызывают внешние API. При необходимости можно:
  - Удалить модель из `prisma/schema.prisma`,
  - Очистить GraphQL типы/резолверы,
  - Прокатить миграцию и `db push`.

Замечания по сборке
- В среде без сети Next.js может падать на загрузке Google Fonts. Это не связано с данными изменениями. Для проверки сборки:
  - Отключите сетевые шрифты или используйте локальные,
  - Либо соберите в окружении с доступом к `fonts.googleapis.com`.

Дальнейшие шаги (по желанию)
- Полное удаление `NavigationCategory` из Prisma + GraphQL и миграция БД.
- Очистка оставшихся неиспользуемых компонентов фронта, которые ссылались на PartsIndex (например, экспериментальные меню).
- Удаление связанных GraphQL‑запросов из `frontend/src/lib/graphql.ts`, если они больше не будут использоваться.

