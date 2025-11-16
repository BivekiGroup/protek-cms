-- Очистка невалидных legalEntityId в таблице orders
-- Устанавливаем NULL для legalEntityId, которые не существуют в client_legal_entities

UPDATE orders
SET "legalEntityId" = NULL
WHERE "legalEntityId" IS NOT NULL
  AND "legalEntityId" NOT IN (SELECT id FROM client_legal_entities);

-- Показываем количество очищенных записей
SELECT COUNT(*) as cleaned_records
FROM orders
WHERE "legalEntityId" IS NULL
  AND "comment" LIKE '%ЮЛ ID:%';
