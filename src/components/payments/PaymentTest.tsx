'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CREATE_ORDER, CREATE_PAYMENT } from '@/lib/graphql/mutations'

interface OrderItem {
  name: string
  article: string
  brand: string
  price: number
  quantity: number
}

const PaymentTest = () => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    {
      name: 'Тестовый товар',
      article: 'TEST123',
      brand: 'TestBrand',
      price: 1000,
      quantity: 1
    }
  ])
  
  const [clientInfo, setClientInfo] = useState({
    clientEmail: 'test@example.com',
    clientPhone: '+7 (999) 123-45-67',
    clientName: 'Тестовый клиент'
  })

  const [createOrder, { loading: orderLoading }] = useMutation(CREATE_ORDER)
  const [createPayment, { loading: paymentLoading }] = useMutation(CREATE_PAYMENT)

  const handleCreateOrder = async () => {
    try {
      const result = await createOrder({
        variables: {
          input: {
            clientEmail: clientInfo.clientEmail,
            clientPhone: clientInfo.clientPhone,
            clientName: clientInfo.clientName,
            items: orderItems,
            deliveryAddress: 'Тестовый адрес доставки',
            comment: 'Тестовый заказ для проверки интеграции с YooKassa'
          }
        }
      })

      const order = result.data.createOrder
      toast.success(`Заказ ${order.orderNumber} создан успешно!`)
      
      // Автоматически создаем платеж
      await handleCreatePayment(order.id)
      
    } catch (error) {
      console.error('Ошибка создания заказа:', error)
      toast.error('Не удалось создать заказ')
    }
  }

  const handleCreatePayment = async (orderId: string) => {
    try {
      const result = await createPayment({
        variables: {
          input: {
            orderId,
            returnUrl: `${window.location.origin}/payment/success`,
            description: 'Тестовый платеж'
          }
        }
      })

      const { payment, confirmationUrl } = result.data.createPayment
      toast.success('Платеж создан успешно!')
      
      // Перенаправляем на страницу оплаты
      if (confirmationUrl) {
        window.open(confirmationUrl, '_blank')
      }
      
    } catch (error) {
      console.error('Ошибка создания платежа:', error)
      toast.error('Не удалось создать платеж')
    }
  }

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...orderItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setOrderItems(newItems)
  }

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      name: '',
      article: '',
      brand: '',
      price: 0,
      quantity: 1
    }])
  }

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Тестирование платежей YooKassa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Информация о клиенте */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Информация о клиенте</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="clientName">Имя клиента</Label>
              <Input
                id="clientName"
                value={clientInfo.clientName}
                onChange={(e) => setClientInfo({ ...clientInfo, clientName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientInfo.clientEmail}
                onChange={(e) => setClientInfo({ ...clientInfo, clientEmail: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Телефон</Label>
              <Input
                id="clientPhone"
                value={clientInfo.clientPhone}
                onChange={(e) => setClientInfo({ ...clientInfo, clientPhone: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Товары в заказе */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Товары в заказе</h3>
            <Button onClick={addOrderItem} variant="outline" size="sm">
              Добавить товар
            </Button>
          </div>
          
          {orderItems.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
              <div>
                <Label>Название</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateOrderItem(index, 'name', e.target.value)}
                  placeholder="Название товара"
                />
              </div>
              <div>
                <Label>Артикул</Label>
                <Input
                  value={item.article}
                  onChange={(e) => updateOrderItem(index, 'article', e.target.value)}
                  placeholder="Артикул"
                />
              </div>
              <div>
                <Label>Бренд</Label>
                <Input
                  value={item.brand}
                  onChange={(e) => updateOrderItem(index, 'brand', e.target.value)}
                  placeholder="Бренд"
                />
              </div>
              <div>
                <Label>Цена</Label>
                <Input
                  type="number"
                  value={item.price}
                  onChange={(e) => updateOrderItem(index, 'price', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Количество</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => removeOrderItem(index)}
                  variant="destructive"
                  size="sm"
                  disabled={orderItems.length === 1}
                >
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Итого */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <span className="text-lg font-semibold">Итого:</span>
          <span className="text-xl font-bold">{totalAmount.toLocaleString('ru-RU')} ₽</span>
        </div>

        {/* Кнопка создания заказа и платежа */}
        <Button
          onClick={handleCreateOrder}
          disabled={orderLoading || paymentLoading || totalAmount === 0}
          className="w-full"
          size="lg"
        >
          {orderLoading || paymentLoading ? 'Создание...' : 'Создать заказ и оплатить'}
        </Button>
      </CardContent>
    </Card>
  )
}

export default PaymentTest 