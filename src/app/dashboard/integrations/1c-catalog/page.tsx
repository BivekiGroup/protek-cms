"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Terminal, Shield, Network, CheckCircle, TriangleAlert } from 'lucide-react'

function CodeBlock({ title, code }: { title?: string; code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative border rounded-lg bg-black text-gray-100">
      {title && (
        <div className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">{title}</div>
      )}
      <pre className="p-4 overflow-x-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        variant="outline"
        size="sm"
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
        className="absolute top-2 right-2 h-8 px-2 text-xs"
      >
        <Copy className="h-3.5 w-3.5 mr-1" /> {copied ? 'Скопировано' : 'Копировать'}
      </Button>
    </div>
  )
}

export default function OneCCatalogDocs() {
  const curlHealth = `curl -sS "${typeof window === 'undefined' ? 'http://localhost:3000' : ''}/api/1c/catalog/health?debug=1" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" | jq`

  const curlUpsert = `curl -X POST "${typeof window === 'undefined' ? 'http://localhost:3000' : ''}/api/1c/catalog/products" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" \\
  -H "Idempotency-Key: demo-001" \\
  -d '{
  "items": [
    {
      "externalId": "941024_dayco", // если не передать — сформируется автоматически: article+"_"+brand (в нижнем регистре)
      "article": "941024",
      "brand": "DAYCO",
      "name": "Тестовый товар",
      "price": 1290,
      "stock": 15,
      "images": ["https://example.com/img1.jpg"],
      "category_code": "001254",
      "characteristics": {"Длина": "500 мм"},
      "isVisible": true
    }
  ]
}'`

  const itemSchema = `{
  externalId?: string,       // если не передан — будет article+"_"+brand (нижний регистр)
  article: string,           // очистка пробелов/дефисов, UPPERCASE
  brand: string,             // UPPERCASE
  name: string,
  description?: string,
  price?: number,            // продажная цена (retail)
  stock?: number,
  weight?: number,
  dimensions?: string,
  images?: string[],         // URL
  category_code: string,     // ОБЯЗАТЕЛЬНО: код категории из справочника
  characteristics?: { [key: string]: string },
  isVisible?: boolean
}`

  const curlCategories = `curl -X POST "${typeof window === 'undefined' ? 'http://localhost:3000' : ''}/api/1c/catalog/categories" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" \\
  -d '{
  "category_code": "001254",
  "category_name": "Ремни ГРМ",
  "category_head_code": "151554",
  "category_head_name": "ГРМ, рем. комплекты и тд"
}'`

  const curlPrices = `curl -X POST "${typeof window === 'undefined' ? 'http://localhost:3000' : ''}/api/1c/catalog/prices" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" \\
  -d '{
  "items": [
    { "sku": "941024", "price": "1290,00" }
  ]
}'`

  const curlStocks = `curl -X POST "${typeof window === 'undefined' ? 'http://localhost:3000' : ''}/api/1c/catalog/stocks" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" \\
  -d '{
  "items": [
    { "sku": "941024", "stock": 15 }
  ]
}'`

  const curlVisits = `curl -sS "${typeof window === 'undefined' ? 'http://localhost:3000' : ''}/api/1c/catalog/visits?limit=100" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" | jq`

  const curlClients = `curl -sS "${typeof window === 'undefined' ? 'http://localhost:3000' : ''}/api/1c/catalog/clients" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" | jq`

  return (
    <div className="p-6 space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">Интеграция 1С — Каталог (Upsert)</h1>
        <p className="text-gray-600 mt-1">Безопасный пакетный импорт каталога с идемпотентностью, валидацией и частичным успехом.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4"/> Аутентификация</CardTitle></CardHeader>
          <CardContent className="text-sm text-gray-700">
            Заголовок <Badge variant="secondary">X-API-Key</Badge> = <span className="font-mono">ONEC_API_TOKEN</span> из окружения CMS.
            <div className="mt-2">Опционально: <span className="font-mono">ONEC_IP_ALLOWLIST</span> (через запятую).</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Network className="h-4 w-4"/> Эндпоинты</CardTitle></CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-1">
            <div><Badge>GET</Badge> <span className="font-mono">/api/1c/catalog/health</span></div>
            <div><Badge>POST</Badge> <span className="font-mono">/api/1c/catalog/products</span></div>
            <div><Badge>POST</Badge> <span className="font-mono">/api/1c/catalog/categories</span></div>
            <div><Badge>POST</Badge> <span className="font-mono">/api/1c/catalog/prices</span></div>
            <div><Badge>POST</Badge> <span className="font-mono">/api/1c/catalog/stocks</span></div>
            <div><Badge>GET</Badge> <span className="font-mono">/api/1c/catalog/visits</span></div>
            <div><Badge>GET</Badge> <span className="font-mono">/api/1c/catalog/clients</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4"/> Идемпотентность</CardTitle></CardHeader>
          <CardContent className="text-sm text-gray-700">
            Ключ товара: <span className="font-mono">externalId</span> или пара <span className="font-mono">article+brand</span> (нормализация).<br/>
            Заголовок <Badge variant="secondary">Idempotency-Key</Badge> — возвращает сохранённый результат (~10 мин).
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Health (проверка доступа)</CardTitle>
          <CardDescription>Проверяет ключ, возвращает версию/лимиты. Добавь <span className="font-mono">?debug=1</span> для отладки ключа/IP.</CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock title="curl" code={curlHealth} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Upsert товаров (batch)</CardTitle>
          <CardDescription>Частичный успех возвращает HTTP 207. Отсутствующие поля не затирают существующие значения.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs uppercase text-gray-500 mb-2">Схема item</div>
            <CodeBlock code={itemSchema} />
          </div>
          <div>
            <div className="text-xs uppercase text-gray-500 mb-2">Пример запроса (curl)</div>
            <CodeBlock code={curlUpsert} />
          </div>
          <div className="text-sm text-gray-700">
            Правила:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><b>Категория</b>: передаётся код <span className="font-mono">category_code</span> (обяз.), справочник заполняется отдельным запросом.</li>
              <li><b>Изображения</b>: синхронизация полного набора (удаление отсутствующих, порядок по индексу).</li>
              <li><b>Характеристики</b>: создаются ключи; upsert по паре (productId, characteristicId).</li>
              <li><b>Нормализация</b>: brand → UPPERCASE; article → без пробелов/дефисов, UPPERCASE; <b>externalId</b> по умолчанию = <span className="font-mono">article+"_"+brand</span> в нижнем регистре.</li>
            </ul>
            <div className="mt-3 flex items-center text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-sm">
              <TriangleAlert className="h-4 w-4 mr-2"/> При дублях <span className="font-mono">(article, brand)</span> в БД — сначала почистите данные для успешного применения уникального индекса.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Отправка структуры категорий</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock title="curl" code={curlCategories} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Отправка цен товаров</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock title="curl" code={curlPrices} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Отправка остатков товаров</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock title="curl" code={curlStocks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Получение истории посещений</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock title="curl" code={curlVisits} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Получение новых контрагентов</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock title="curl" code={curlClients} />
        </CardContent>
      </Card>
    </div>
  )
}
