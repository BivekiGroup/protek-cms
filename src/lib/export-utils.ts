interface Client {
  id: string
  clientNumber: string
  type: 'INDIVIDUAL' | 'LEGAL_ENTITY'
  name: string
  email?: string
  phone: string
  markup?: number
  isConfirmed: boolean
  profile?: {
    name: string
    baseMarkup: number
  }
  createdAt: string
}

export const exportClientsToCSV = (clients: Client[], filename = 'clients.csv') => {
  // Заголовки CSV
  const headers = [
    'Номер клиента',
    'Тип',
    'Имя',
    'Email',
    'Телефон',
    'Наценка (%)',
    'Подтвержден',
    'Профиль',
    'Базовая наценка профиля (%)',
    'Дата регистрации'
  ]

  // Преобразуем данные клиентов в строки CSV
  const csvData = clients.map(client => [
    client.clientNumber,
    client.type === 'INDIVIDUAL' ? 'Физ. лицо' : 'Юр. лицо',
    client.name,
    client.email || '',
    client.phone,
    client.markup?.toString() || '',
    client.isConfirmed ? 'Да' : 'Нет',
    client.profile?.name || '',
    client.profile?.baseMarkup?.toString() || '',
    new Date(client.createdAt).toLocaleDateString('ru-RU')
  ])

  // Объединяем заголовки и данные
  const csvContent = [headers, ...csvData]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n')

  // Добавляем BOM для корректного отображения кириллицы в Excel
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  
  // Создаем ссылку для скачивания
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportClientsToExcel = async (clients: Client[], filename = 'clients.xlsx') => {
  // Для Excel экспорта можно использовать библиотеку xlsx
  // Пока что используем CSV с расширением xlsx
  exportClientsToCSV(clients, filename.replace('.xlsx', '.csv'))
}

export const formatClientDataForExport = (clients: Client[]) => {
  return clients.map(client => ({
    'Номер клиента': client.clientNumber,
    'Тип': client.type === 'INDIVIDUAL' ? 'Физическое лицо' : 'Юридическое лицо',
    'Имя': client.name,
    'Email': client.email || '',
    'Телефон': client.phone,
    'Наценка (%)': client.markup || '',
    'Подтвержден': client.isConfirmed ? 'Да' : 'Нет',
    'Профиль': client.profile?.name || '',
    'Базовая наценка профиля (%)': client.profile?.baseMarkup || '',
    'Дата регистрации': new Date(client.createdAt).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }))
} 