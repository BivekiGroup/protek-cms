'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading')
  
  useEffect(() => {
    // Получаем параметры из URL
    const status = searchParams.get('status')
    const paymentId = searchParams.get('payment_id')
    
    console.log('Payment callback:', { status, paymentId })
    
    // Определяем статус на основе параметров
    if (status === 'succeeded') {
      setPaymentStatus('success')
    } else if (status === 'canceled') {
      setPaymentStatus('failed')
    } else if (status === 'pending') {
      setPaymentStatus('pending')
    } else {
      // Если статус не передан, считаем что платеж успешен (для тестирования)
      setPaymentStatus('success')
    }
  }, [searchParams])

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />
      case 'failed':
        return <XCircle className="w-16 h-16 text-red-500" />
      case 'pending':
        return <Clock className="w-16 h-16 text-yellow-500" />
      default:
        return <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
    }
  }

  const getStatusTitle = () => {
    switch (paymentStatus) {
      case 'success':
        return 'Платеж успешно завершен!'
      case 'failed':
        return 'Платеж отменен'
      case 'pending':
        return 'Платеж обрабатывается'
      default:
        return 'Обработка платежа...'
    }
  }

  const getStatusDescription = () => {
    switch (paymentStatus) {
      case 'success':
        return 'Ваш заказ успешно оплачен. Мы начнем его обработку в ближайшее время.'
      case 'failed':
        return 'Платеж был отменен. Вы можете попробовать оплатить заказ еще раз.'
      case 'pending':
        return 'Ваш платеж обрабатывается. Это может занять несколько минут.'
      default:
        return 'Пожалуйста, подождите...'
    }
  }

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'success':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'pending':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={`text-2xl ${getStatusColor()}`}>
            {getStatusTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {getStatusDescription()}
          </p>
          
          {searchParams.get('payment_id') && (
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="text-sm text-gray-500">ID платежа:</p>
              <p className="font-mono text-sm">{searchParams.get('payment_id')}</p>
            </div>
          )}
          
          <div className="flex flex-col gap-2 pt-4">
            <Link href="/dashboard">
              <Button className="w-full">
                Вернуться в панель управления
              </Button>
            </Link>
            
            {paymentStatus === 'failed' && (
              <Link href="/dashboard/payments/test">
                <Button variant="outline" className="w-full">
                  Попробовать еще раз
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 