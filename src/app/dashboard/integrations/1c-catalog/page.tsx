"use client"

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

const CURL_BASE = typeof window === 'undefined' ? 'http://localhost:3000' : ''

export default function OneCCatalogDocs() {
  const curlHealth = `curl -sS "${CURL_BASE}/api/1c/catalog/health?debug=1" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" | jq`

  const curlUpsert = `curl -X POST "${CURL_BASE}/api/1c/catalog/products" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" \\
  -H "Idempotency-Key: demo-001" \\
  -d '{
  "items": [
    {
      "product_id": "DS00021",
      "id": "cku123example",
      "externalId": "941024_dayco",
      "article": "941024",
      "brand": "DAYCO",
      "name": "Тестовый товар",
      "price": 1290,
      "stock": 15,
      "images": ["https://example.com/img1.jpg"],
      "images_base64": [
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
        { "filename": "img2.png", "content": "iVBORw0KGgoAAAANSUhEUg...", "contentType": "image/png" }
      ],
      "category_code": "001254",
      "characteristics": {"Длина": "500 мм"},
      "isVisible": true
    }
  ]
}'`

  const itemSchema = `{
  id?: string,
  product_id?: string,
  externalId?: string,
  article: string,
  brand: string,
  name: string,
  description?: string,
  price?: number,
  stock?: number,
  weight?: number,
  dimensions?: string,
  images?: string[],
  images_base64?: (string | { filename: string, content: string, contentType?: string })[],
  category_code: string,
  characteristics?: { [key: string]: string },
  isVisible?: boolean
}`

  const curlCategories = `curl -X POST "${CURL_BASE}/api/1c/catalog/categories" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" \\
  -d '{
  "categories": [
    {
      "category_code": "001254",
      "category_name": "Ремни ГРМ",
      "category_head_code": "151554",
      "category_head_name": "ГРМ, рем. комплекты и тд"
    },
    {
      "category_code": "001255",
      "category_name": "Ролики ГРМ",
      "category_head_code": "151554",
      "category_head_name": "ГРМ, рем. комплекты и тд"
    }
  ]
}'`

  const curlPrices = `curl -X POST "${CURL_BASE}/api/1c/catalog/prices" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" \\
  -d '{
  "items": [
    { "sku": "941024", "price": "1290,00" }
  ]
}'`

  const curlStocks = `curl -X POST "${CURL_BASE}/api/1c/catalog/stocks" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" \\
  -d '{
  "items": [
    { "sku": "941024", "stock": 15 }
  ]
}'`

  const curlVisits = `curl -sS "${CURL_BASE}/api/1c/catalog/visits?limit=100" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" | jq`

  const curlClients = `curl -sS "${CURL_BASE}/api/1c/catalog/clients" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" | jq`

  const clientsResponseExample = `{
  "users": [
    {
      "code": "001254",
      "legal_entity_id": "clxyz123abc456def789",
      "name": "Ремни ГРМ ООО",
      "inn": "0123456789",
      "kpp": "123456789",
      "ogrn": "0123456789123",
      "view": "legal entity",
      "address": {
        "actual": "Республика Калмыкия, р-н Яшкульский п. яшкуль д3 кв1",
        "legal": "Республика Калмыкия, р-н Яшкульский п. микаль д140",
        "mailing": "Республика Калмыкия, р-н Яшкульский п. микаль д138"
      },
      "contact_information": {
        "telephone": "89186584172",
        "email": "test@mail.ru"
      },
      "bank_requisites": [
        {
          "bik": "004525988",
          "account_number": "40102810545370000003",
          "bank_name": "ПАО СБЕРБАНК",
          "correspondent_account": "30101810400000000225"
        },
        {
          "bik": "044525593",
          "account_number": "40702810938000012345",
          "bank_name": "ПАО \"БАНК ВТБ\"",
          "correspondent_account": "30101810700000000593"
        }
      ]
    }
  ]
}`

  const curlOrders = `curl -sS "${CURL_BASE}/api/1c/orders?since=2025-01-01&to=2025-01-31" \\
  -H "X-API-Key: <ONEC_API_TOKEN>" | jq`

  // Live Tester state
  type Endpoint = 'health' | 'products' | 'categories' | 'prices' | 'stocks' | 'visits' | 'clients' | 'orders'
  const [endpoint, setEndpoint] = useState<Endpoint>('health')
  const [apiKey, setApiKey] = useState('')
  const [idemKey, setIdemKey] = useState('demo-001')
  const [body, setBody] = useState('')
  const [resp, setResp] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [multiCount, setMultiCount] = useState<number>(3)
  const [ordersSince, setOrdersSince] = useState('')
  const [ordersTo, setOrdersTo] = useState('')

  const method: 'GET' | 'POST' = useMemo(() => (
    endpoint === 'health' || endpoint === 'visits' || endpoint === 'clients' || endpoint === 'orders' ? 'GET' : 'POST'
  ), [endpoint])

  const path = useMemo(() => {
    switch (endpoint) {
      case 'health': return '/api/1c/catalog/health?debug=1'
      case 'products': return '/api/1c/catalog/products'
      case 'categories': return '/api/1c/catalog/categories'
      case 'prices': return '/api/1c/catalog/prices'
      case 'stocks': return '/api/1c/catalog/stocks'
      case 'visits': return '/api/1c/catalog/visits?limit=50'
      case 'clients': return '/api/1c/catalog/clients'
      case 'orders': {
        const params = new URLSearchParams()
        params.set('limit', '50')
        if (ordersSince) params.set('since', ordersSince)
        if (ordersTo) params.set('to', ordersTo)
        const query = params.toString()
        return query ? `/api/1c/orders?${query}` : '/api/1c/orders'
      }
    }
  }, [endpoint, ordersSince, ordersTo])

  const exampleBody = useMemo(() => {
    switch (endpoint) {
      case 'products':
        return JSON.stringify({
          items: [
            {
              product_id: 'DS00021',
              id: 'cku123example',
              externalId: '941024_dayco',
              article: '941024',
              brand: 'DAYCO',
              name: 'Тестовый товар',
              price: 1290,
              stock: 15,
              images: ['https://example.com/img1.jpg'],
              category_code: '001254',
              characteristics: { 'Длина': '500 мм' },
              isVisible: true,
            },
          ],
        }, null, 2)
      case 'categories':
        return JSON.stringify({
          categories: [
            {
              category_code: '001254',
              category_name: 'Ремни ГРМ',
              category_head_code: '151554',
              category_head_name: 'ГРМ, рем. комплекты и тд',
            },
            {
              category_code: '001255',
              category_name: 'Ролики ГРМ',
              category_head_code: '151554',
              category_head_name: 'ГРМ, рем. комплекты и тд',
            }
          ]
        }, null, 2)
      case 'prices':
        return JSON.stringify({
          items: [ { sku: '941024', price: '1290,00' } ],
        }, null, 2)
      case 'stocks':
        return JSON.stringify({
          items: [ { sku: '941024', stock: 15 } ],
        }, null, 2)
      default:
        return ''
    }
  }, [endpoint])

  // keep body in sync when endpoint changes (only for POST)
  const resetBodyForEndpoint = () => {
    if (method === 'POST') setBody(exampleBody); else setBody('')
  }

  // initialize on mount
  useState(() => { resetBodyForEndpoint() })

  const send = async () => {
    setLoading(true)
    setResp('')
    setStatus('')
    try {
      const headers: Record<string, string> = { 'X-API-Key': apiKey }
      if (method === 'POST') headers['Content-Type'] = 'application/json'
      if (method === 'POST' && endpoint === 'products' && idemKey) headers['Idempotency-Key'] = idemKey
      const res = await fetch(path, {
        method,
        headers,
        body: method === 'POST' ? body : undefined,
      })
      setStatus(`${res.status} ${res.statusText}`)
      const text = await res.text()
      // try to pretty print json
      try {
        const obj = JSON.parse(text)
        setResp(JSON.stringify(obj, null, 2))
      } catch {
        setResp(text)
      }
    } catch (e) {
      setStatus('')
      setResp(String((e as Error)?.message || e))
    } finally {
      setLoading(false)
    }
  }

  const generateSamples = (n: number) => {
    if (endpoint !== 'products' && endpoint !== 'categories') return
    const safeN = Math.max(1, Math.min(50, Math.floor(n || 1)))
    if (endpoint === 'products') {
      const items = Array.from({ length: safeN }).map((_, i) => {
        const suffix = String.fromCharCode(65 + (i % 26)) // A, B, C ...
        const base = 941024 + i
        return {
          externalId: `${base}${suffix}_dayco`,
          article: `${base}${suffix}`,
          brand: 'DAYCO',
          name: `Тестовый товар ${i + 1}`,
          price: 1290 + i,
          stock: 10 + i,
          images: ['https://example.com/img1.jpg'],
          category_code: '001254',
          characteristics: { 'Длина': `${500 + i} мм` },
          isVisible: true,
        }
      })
      setBody(JSON.stringify({ items }, null, 2))
      return
    }
    // categories: генерируем плоский список дочерних категорий от одного head
    const head = { code: '151554', name: 'ГРМ, рем. комплекты и тд' }
    const categories = Array.from({ length: safeN }).map((_, i) => ({
      category_code: String(1254 + i).padStart(6, '0'),
      category_name: `Категория ${i + 1}`,
      category_head_code: head.code,
      category_head_name: head.name,
    }))
    setBody(JSON.stringify({ categories }, null, 2))
  }

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
            <div><Badge>GET</Badge> <span className="font-mono">/api/1c/orders</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4"/> Идемпотентность</CardTitle></CardHeader>
          <CardContent className="text-sm text-gray-700">
            Ключ товара: <span className="font-mono">product_id</span> (если передан), затем <span className="font-mono">externalId</span>, иначе пара <span className="font-mono">article+brand</span> (нормализация).<br/>
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
              <li><b>product_id</b>: основной идентификатор из 1С; сохраняется отдельно от внутреннего ID CMS.</li>
              <li><b>Категория</b>: передаётся код <span className="font-mono">category_code</span> (обяз.), справочник заполняется отдельным запросом.</li>
              <li><b>Изображения</b>: синхронизация полного набора (удаление отсутствующих, порядок по индексу).</li>
              <li><b>Картинки base64</b>: можно передавать через <span className="font-mono">images_base64</span> (data URL или {"{ filename, content, contentType }"}); CMS загрузит в S3 и подставит URL.</li>
              <li><b>Характеристики</b>: создаются ключи; upsert по паре (productId, characteristicId).</li>
              <li><b>Нормализация</b>: brand → UPPERCASE; article → без пробелов/дефисов, UPPERCASE; <b>externalId</b> по умолчанию = <span className="font-mono">article+&quot;_&quot;+brand</span> в нижнем регистре.</li>
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
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Отправка остатков</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock title="curl" code={curlStocks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Заказы (list)</CardTitle>
          <CardDescription>Получение заказов. Поддерживает `limit/offset`, `status`, `orderNumber`, `since/to` (формат YYYY-MM-DD).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock title="curl" code={curlOrders} />
          <div className="text-sm text-gray-700">
            Поля ответа:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><span className="font-mono">buyer</span> — данные покупателя (код, название, ИНН) из справочника <span className="font-mono">/api/1c/catalog/clients</span>.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> История посещений (demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock title="curl" code={curlVisits} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Контрагенты (юр. лица)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock title="curl" code={curlClients} />
          <div>
            <div className="text-xs uppercase text-gray-500 mb-2">Пример ответа</div>
            <CodeBlock code={clientsResponseExample} />
          </div>
          <div className="text-sm text-gray-700">
            Поля:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><b>code</b> соответствует полю <span className="font-mono">clientNumber</span> в CMS.</li>
              <li><b>legal_entity_id</b>: ID юридического лица (cuid) из таблицы <span className="font-mono">ClientLegalEntity</span>; используется для привязки заказов к конкретному юрлицу клиента.</li>
              <li><b>view</b>: <span className="font-mono">&quot;legal entity&quot;</span> для юр. лиц, <span className="font-mono">&quot;physical entity&quot;</span> для физ. лиц.</li>
              <li>Адреса формируются из <span className="font-mono">actualAddress</span>, <span className="font-mono">legalAddress</span> и строки «Почтовый адрес» из комментария.</li>
              <li>Контакты берутся из полей клиента (<span className="font-mono">phone</span>, <span className="font-mono">email</span>).</li>
              <li><b>bank_requisites</b>: массив всех банковских реквизитов юр. лица с полями <span className="font-mono">bik</span>, <span className="font-mono">account_number</span>, <span className="font-mono">bank_name</span>, <span className="font-mono">correspondent_account</span>; если у юрлица нет счетов, берутся из устаревших полей клиента.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Live tester */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5"/> Live-тестер (отправить запрос из админки)</CardTitle>
          <CardDescription>Введи <span className="font-mono">X-API-Key</span>, выбери эндпоинт и нажми «Отправить».</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-600">X-API-Key</label>
              <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Вставь ONEC_API_TOKEN" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Endpoint</label>
              <select
                className="w-full h-10 border rounded-md px-3 bg-white"
                value={endpoint}
                onChange={(e) => { setEndpoint(e.target.value as Endpoint); setTimeout(resetBodyForEndpoint, 0) }}
              >
                <option value="health">GET /api/1c/catalog/health</option>
                <option value="products">POST /api/1c/catalog/products</option>
                <option value="categories">POST /api/1c/catalog/categories</option>
                <option value="prices">POST /api/1c/catalog/prices</option>
                <option value="stocks">POST /api/1c/catalog/stocks</option>
                <option value="visits">GET /api/1c/catalog/visits</option>
                <option value="clients">GET /api/1c/catalog/clients</option>
                <option value="orders">GET /api/1c/orders</option>
              </select>
            </div>
            {endpoint === 'products' && (
              <div>
                <label className="text-xs text-gray-600">Idempotency-Key (опц.)</label>
                <Input value={idemKey} onChange={(e) => setIdemKey(e.target.value)} placeholder="например demo-001" />
              </div>
            )}
          </div>

          {endpoint === 'orders' && (
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-600">since (дата с)</label>
                <Input
                  type="date"
                  value={ordersSince}
                  onChange={(e) => setOrdersSince(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">to (дата по)</label>
                <Input
                  type="date"
                  value={ordersTo}
                  onChange={(e) => setOrdersTo(e.target.value)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
            </div>
          )}

          {method === 'POST' && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600">Тело запроса (JSON)</label>
                <div className="flex items-center gap-2">
                  {(endpoint === 'products' || endpoint === 'categories') && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600">Количество</label>
                      <Input
                        type="number"
                        className="h-8 w-16"
                        value={multiCount}
                        min={1}
                        max={50}
                        onChange={(e) => setMultiCount(Number(e.target.value))}
                      />
                      <Button variant="outline" size="sm" onClick={() => generateSamples(multiCount)}>Сгенерировать N</Button>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setBody(exampleBody)}>Заполнить примером</Button>
                </div>
              </div>
              <Textarea className="mt-1 font-mono text-sm min-h-[180px]" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={send} disabled={loading}>
              {loading ? 'Отправка…' : 'Отправить'}
            </Button>
            <div className="text-sm text-gray-600">{method} <span className="font-mono">{path}</span></div>
            {status && <div className="text-sm text-gray-900">Статус: <span className="font-mono">{status}</span></div>}
          </div>

          {resp && (
            <div className="border rounded-md bg-gray-50">
              <pre className="p-3 overflow-x-auto text-sm"><code>{resp}</code></pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
