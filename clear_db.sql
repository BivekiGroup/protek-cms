-- Очистка БД: Заказы, счета, контрагенты
-- ВНИМАНИЕ: Это удалит все данные! Будьте осторожны!

-- Отключаем проверку внешних ключей
SET session_replication_role = 'replica';

-- Удаляем данные из связанных таблиц заказов
TRUNCATE TABLE "order_items" CASCADE;
TRUNCATE TABLE "orders" CASCADE;

-- Удаляем счета
TRUNCATE TABLE "invoices" CASCADE;

-- Удаляем данные клиентов
TRUNCATE TABLE "client_balance_history" CASCADE;
TRUNCATE TABLE "client_bank_details" CASCADE;
TRUNCATE TABLE "client_contacts" CASCADE;
TRUNCATE TABLE "client_contract_documents" CASCADE;
TRUNCATE TABLE "client_contracts" CASCADE;
TRUNCATE TABLE "client_delivery_addresses" CASCADE;
TRUNCATE TABLE "client_discounts" CASCADE;
TRUNCATE TABLE "client_legal_entities" CASCADE;
TRUNCATE TABLE "client_vehicles" CASCADE;
TRUNCATE TABLE "client_profiles" CASCADE;
TRUNCATE TABLE "clients" CASCADE;

-- Включаем проверку внешних ключей обратно
SET session_replication_role = 'origin';

-- Показываем результат
SELECT 'Заказы' as table_name, COUNT(*) as count FROM "orders"
UNION ALL
SELECT 'Позиции заказов', COUNT(*) FROM "order_items"
UNION ALL
SELECT 'Счета', COUNT(*) FROM "invoices"
UNION ALL
SELECT 'Клиенты', COUNT(*) FROM "clients"
UNION ALL
SELECT 'Юр. лица', COUNT(*) FROM "client_legal_entities"
UNION ALL
SELECT 'Договоры', COUNT(*) FROM "client_contracts"
UNION ALL
SELECT 'Адреса доставки', COUNT(*) FROM "client_delivery_addresses";
