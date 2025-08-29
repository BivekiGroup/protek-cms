"use client"

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GET_INTEGRATION_SETTINGS, UPDATE_INTEGRATION_SETTINGS } from '@/lib/graphql/queries'

type Provider = 'autoeuro' | 'trinity'

export default function ProvidersPage() {
  const { data, loading, error, refetch } = useQuery(GET_INTEGRATION_SETTINGS)
  const [updateSettings, { loading: saving }] = useMutation(UPDATE_INTEGRATION_SETTINGS)

  const [provider, setProvider] = useState<Provider>('autoeuro')
  const [trinityClientCode, setTrinityClientCode] = useState('')
  const [trinityOnlyStock, setTrinityOnlyStock] = useState(false)
  const [trinityOnline, setTrinityOnline] = useState<'allow' | 'disallow'>('allow')
  const [trinityCrosses, setTrinityCrosses] = useState<'allow' | 'disallow'>('disallow')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (data?.integrationSettings) {
      const s = data.integrationSettings
      setProvider((s.externalProvider as Provider) || 'autoeuro')
      setTrinityClientCode(s.trinityClientCode || '')
      setTrinityOnlyStock(!!s.trinityOnlyStock)
      setTrinityOnline((s.trinityOnline as 'allow' | 'disallow') || 'allow')
      setTrinityCrosses((s.trinityCrosses as 'allow' | 'disallow') || 'disallow')
    }
  }, [data])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateSettings({
        variables: {
          input: {
            externalProvider: provider,
            trinityClientCode,
            trinityOnlyStock,
            trinityOnline,
            trinityCrosses,
          }
        }
      })
      setMsg('Настройки сохранены')
      setTimeout(() => setMsg(null), 4000)
      refetch()
    } catch (err: any) {
      setMsg(err?.message || 'Ошибка сохранения')
      setTimeout(() => setMsg(null), 5000)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Поставщики</h1>
        <p className="text-muted-foreground">Выберите внешний API-провайдер предложений и настройте Trinity</p>
      </div>

      {error && (
        <Alert variant="destructive"><AlertDescription>Ошибка загрузки: {error.message}</AlertDescription></Alert>
      )}
      {msg && (
        <Alert><AlertDescription>{msg}</AlertDescription></Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Выбор провайдера</CardTitle>
          <CardDescription>На сайте отображаются предложения нашей БД + выбранного провайдера</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label>Провайдер</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input type="radio" name="provider" value="autoeuro" checked={provider === 'autoeuro'} onChange={() => setProvider('autoeuro')} />
                  <span>AutoEuro</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="provider" value="trinity" checked={provider === 'trinity'} onChange={() => setProvider('trinity')} />
                  <span>Trinity-Parts</span>
                </label>
              </div>
            </div>

            {provider === 'trinity' && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="tr-client">Trinity clientCode</Label>
                  <Input id="tr-client" value={trinityClientCode} onChange={(e) => setTrinityClientCode(e.target.value)} placeholder="e75d0..." />
                </div>
                <div className="flex items-center gap-2">
                  <input id="tr-stock" type="checkbox" checked={trinityOnlyStock} onChange={(e) => setTrinityOnlyStock(e.target.checked)} />
                  <Label htmlFor="tr-stock">Только свои склады (onlyStock)</Label>
                </div>
                <div className="flex gap-6">
                  <div>
                    <Label>Онлайн поставщики</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <label className="flex items-center gap-2">
                        <input type="radio" name="tr-online" checked={trinityOnline === 'allow'} onChange={() => setTrinityOnline('allow')} /> allow
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name="tr-online" checked={trinityOnline === 'disallow'} onChange={() => setTrinityOnline('disallow')} /> disallow
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label>Кроссы</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <label className="flex items-center gap-2">
                        <input type="radio" name="tr-cross" checked={trinityCrosses === 'allow'} onChange={() => setTrinityCrosses('allow')} /> allow
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name="tr-cross" checked={trinityCrosses === 'disallow'} onChange={() => setTrinityCrosses('disallow')} /> disallow
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Button type="submit" disabled={loading || saving}>{saving ? 'Сохранение...' : 'Сохранить'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

