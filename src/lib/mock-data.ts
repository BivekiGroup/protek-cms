// Mock данные для демонстрации дашборда

export interface Order {
  id: string
  number: string
  date: string
  client: string
  clientId: string
  amount: number
  status: 'new' | 'processing' | 'completed'
  createdAt: Date
}

export interface VinRequest {
  id: string
  number: string
  date: string
  client: string
  clientId: string
  status: 'new' | 'processing' | 'completed'
  request: string
  createdAt: Date
}

export interface Client {
  id: string
  number: string
  name: string
  phone: string
  status: 'auth_failed' | 'type_change_pending'
  createdAt: Date
}

// Функция для проверки, прошло ли более 24 часов
const isOlderThan24Hours = (date: Date): boolean => {
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  return diffInHours > 24
}

// Mock заказы
export const mockOrders: Order[] = [
  {
    id: '1',
    number: '123453',
    date: '18.02.2025',
    client: 'Макс',
    clientId: 'client-1',
    amount: 45678,
    status: 'new',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 часа назад
  },
  {
    id: '2',
    number: '123454',
    date: '17.02.2025',
    client: 'Анна',
    clientId: 'client-2',
    amount: 23450,
    status: 'new',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 часов назад
  },
  {
    id: '3',
    number: '123455',
    date: '18.02.2025',
    client: 'Дмитрий',
    clientId: 'client-3',
    amount: 67890,
    status: 'new',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 часов назад
  },
]

// Mock VIN-запросы
export const mockVinRequests: VinRequest[] = [
  {
    id: '1',
    number: '123453',
    date: '18.02.2025',
    client: 'Макс',
    clientId: 'client-1',
    status: 'new',
    request: 'Тормозные колодки на Volkswagen Passat B8 2018 года, нужны передние и задние комплекты',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 часа назад
  },
  {
    id: '2',
    number: '123454',
    date: '17.02.2025',
    client: 'Елена',
    clientId: 'client-4',
    status: 'new',
    request: 'Масляный фильтр для BMW X5 E70 3.0d, оригинальный или аналог',
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 часов назад
  },
  {
    id: '3',
    number: '123455',
    date: '18.02.2025',
    client: 'Сергей',
    clientId: 'client-5',
    status: 'new',
    request: 'Стойки стабилизатора передние на Audi A4 B9, левая и правая',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 час назад
  },
]

// Mock клиенты
export const mockClients: Client[] = [
  {
    id: 'client-6',
    number: 'CL001',
    name: 'Александр Петров',
    phone: '+7 (999) 123-45-67',
    status: 'auth_failed',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 часов назад
  },
  {
    id: 'client-7',
    number: 'CL002',
    name: 'ООО "Автосервис Плюс"',
    phone: '+7 (495) 987-65-43',
    status: 'type_change_pending',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 часов назад
  },
  {
    id: 'client-8',
    number: 'CL003',
    name: 'Мария Сидорова',
    phone: '+7 (911) 555-44-33',
    status: 'auth_failed',
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 часов назад
  },
]

// Функции для получения данных с фильтрацией
export const getNewOrders = (): Order[] => {
  return mockOrders.filter(order => order.status === 'new')
}

export const getNewVinRequests = (): VinRequest[] => {
  return mockVinRequests.filter(request => request.status === 'new')
}

export const getProblematicClients = (): Client[] => {
  return mockClients.filter(client => 
    client.status === 'auth_failed' || client.status === 'type_change_pending'
  )
}

// Функции для определения цвета статуса
export const getOrderStatusColor = (order: Order): string => {
  if (order.status !== 'new') return 'text-gray-600'
  return isOlderThan24Hours(order.createdAt) ? 'text-red-600' : 'text-green-600'
}

export const getVinRequestStatusColor = (request: VinRequest): string => {
  if (request.status !== 'new') return 'text-gray-600'
  return isOlderThan24Hours(request.createdAt) ? 'text-red-600' : 'text-green-600'
}

export const getOrderStatusText = (order: Order): string => {
  if (order.status !== 'new') return 'Обработан'
  return isOlderThan24Hours(order.createdAt) ? 'Получен' : 'Получен'
}

export const getVinRequestStatusText = (request: VinRequest): string => {
  if (request.status !== 'new') return 'Обработан'
  return isOlderThan24Hours(request.createdAt) ? 'Не обработан' : 'Новый'
}

export const getClientStatusText = (client: Client): string => {
  switch (client.status) {
    case 'auth_failed':
      return 'Сбой авторизации'
    case 'type_change_pending':
      return 'Смена типа пользователя'
    default:
      return 'Неизвестно'
  }
}

// Функция для форматирования суммы
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(amount)
}

// Функция для обрезки текста запроса
export const truncateRequest = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
} 