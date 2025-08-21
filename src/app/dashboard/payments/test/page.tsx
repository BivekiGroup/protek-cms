import PaymentTest from '@/components/payments/PaymentTest'

export default function PaymentTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Тестирование платежей</h1>
        <p className="text-gray-600 mt-2">
          Создайте тестовый заказ и проверьте интеграцию с YooKassa
        </p>
      </div>
      
      <PaymentTest />
    </div>
  )
} 