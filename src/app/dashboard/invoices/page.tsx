'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import toast from 'react-hot-toast'

const GET_BALANCE_INVOICES = gql`
  query GetBalanceInvoices {
    balanceInvoices {
      id
      invoiceNumber
      amount
      currency
      status
      createdAt
      expiresAt
      contract {
        id
        contractNumber
        client {
          id
          name
          phone
          legalEntities {
            shortName
          }
        }
      }
    }
  }
`

const UPDATE_INVOICE_STATUS = gql`
  mutation UpdateInvoiceStatus($invoiceId: String!, $status: InvoiceStatus!) {
    updateInvoiceStatus(invoiceId: $invoiceId, status: $status) {
      id
      status
    }
  }
`

const GET_INVOICE_PDF = gql`
  mutation GetInvoicePDF($invoiceId: String!) {
    getInvoicePDF(invoiceId: $invoiceId) {
      success
      pdfBase64
      filename
      error
    }
  }
`

interface BalanceInvoice {
  id: string
  invoiceNumber: string
  amount: number
  currency: string
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  createdAt: string
  expiresAt: string
  contract: {
    id: string
    contractNumber: string
    client: {
      id: string
      name: string
      phone: string
      legalEntities: Array<{
        shortName: string
      }>
    }
  }
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
}

const statusLabels = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  EXPIRED: 'Просрочен',
  CANCELLED: 'Отменен'
}

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  const { data, loading, error, refetch } = useQuery(GET_BALANCE_INVOICES, {
    fetchPolicy: 'cache-and-network'
  })

  const [updateInvoiceStatus] = useMutation(UPDATE_INVOICE_STATUS, {
    onCompleted: () => {
      refetch()
    },
    onError: (error) => {
      console.error('Ошибка обновления статуса счета:', error)
      toast.error('Ошибка обновления статуса: ' + error.message)
    }
  })

  const [getInvoicePDF] = useMutation(GET_INVOICE_PDF)

  const handleStatusUpdate = async (invoiceId: string, newStatus: string) => {
    try {
      await updateInvoiceStatus({
        variables: {
          invoiceId,
          status: newStatus
        }
      })
    } catch (error) {
      console.error('Ошибка обновления статуса:', error)
    }
  }

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const { data } = await getInvoicePDF({
        variables: {
          invoiceId
        }
      })

      if (data?.getInvoicePDF?.success) {
        const { pdfBase64, filename } = data.getInvoicePDF
        
        // Конвертируем base64 в blob и скачиваем
        const byteCharacters = atob(pdfBase64)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'application/pdf' })
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        toast.error('Ошибка получения PDF: ' + (data?.getInvoicePDF?.error || 'Неизвестная ошибка'))
      }
    } catch (error) {
      console.error('Ошибка скачивания PDF:', error)
      toast.error('Ошибка скачивания PDF: ' + (error as Error).message)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'RUB') => {
    return `${amount.toLocaleString('ru-RU')} ${currency === 'RUB' ? '₽' : currency}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <div className="text-lg font-semibold mb-2">Ошибка загрузки данных</div>
          <div className="text-sm mb-4">{error.message}</div>
          <Button onClick={() => refetch()}>Повторить</Button>
        </div>
      </div>
    )
  }

  const invoices: BalanceInvoice[] = data?.balanceInvoices || []
  
  // Фильтрация счетов
  const filteredInvoices = invoices.filter(invoice => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'expired') {
      return invoice.status === 'PENDING' && isExpired(invoice.expiresAt)
    }
    return invoice.status === statusFilter
  })

  // Сортировка по дате создания (новые сверху)
  const sortedInvoices = [...filteredInvoices].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление счетами</h1>
        
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Фильтр по статусу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все счета</SelectItem>
              <SelectItem value="PENDING">Ожидают оплаты</SelectItem>
              <SelectItem value="PAID">Оплаченные</SelectItem>
              <SelectItem value="expired">Просроченные</SelectItem>
              <SelectItem value="CANCELLED">Отмененные</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => refetch()}>Обновить</Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Номер счета</TableHead>
              <TableHead>Клиент</TableHead>
              <TableHead>Договор</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Создан</TableHead>
              <TableHead>Действует до</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvoices.map((invoice) => {
              const expired = isExpired(invoice.expiresAt)
              const actualStatus = invoice.status === 'PENDING' && expired ? 'EXPIRED' : invoice.status
              
              return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {invoice.contract.client.legalEntities[0]?.shortName || invoice.contract.client.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.contract.client.phone}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {invoice.contract.contractNumber}
                  </TableCell>
                  
                  <TableCell>
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </TableCell>
                  
                  <TableCell>
                    <Badge className={statusColors[actualStatus]}>
                      {statusLabels[actualStatus]}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {formatDate(invoice.createdAt)}
                  </TableCell>
                  
                  <TableCell>
                    <span className={expired ? 'text-red-600 font-medium' : ''}>
                      {formatDate(invoice.expiresAt)}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex gap-2">
                      {/* Кнопка скачивания PDF */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPDF(invoice.id)}
                      >
                        PDF
                      </Button>
                      
                      {/* Кнопки управления статусом */}
                      {invoice.status === 'PENDING' && !expired && (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="default">
                                Подтвердить оплату
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Подтвердить оплату</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Вы уверены, что хотите подтвердить оплату счета {invoice.invoiceNumber} 
                                  на сумму {formatCurrency(invoice.amount, invoice.currency)}?
                                  Баланс клиента будет автоматически пополнен.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleStatusUpdate(invoice.id, 'PAID')}
                                >
                                  Подтвердить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                Отменить
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Отменить счет</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Вы уверены, что хотите отменить счет {invoice.invoiceNumber}?
                                  Это действие нельзя отменить.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleStatusUpdate(invoice.id, 'CANCELLED')}
                                >
                                  Отменить счет
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        
        {sortedInvoices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {statusFilter === 'all' ? 'Счета не найдены' : 'Нет счетов с выбранным статусом'}
          </div>
        )}
      </div>
      
      {/* Статистика */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-800">
            {invoices.filter(i => i.status === 'PENDING' && !isExpired(i.expiresAt)).length}
          </div>
          <div className="text-sm text-yellow-600">Ожидают оплаты</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-800">
            {invoices.filter(i => i.status === 'PAID').length}
          </div>
          <div className="text-sm text-green-600">Оплачено</div>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-800">
            {invoices.filter(i => i.status === 'PENDING' && isExpired(i.expiresAt)).length}
          </div>
          <div className="text-sm text-red-600">Просрочено</div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-800">
            {formatCurrency(
              invoices
                .filter(i => i.status === 'PAID')
                .reduce((sum, i) => sum + i.amount, 0)
            )}
          </div>
          <div className="text-sm text-blue-600">Общая сумма оплат</div>
        </div>
      </div>
    </div>
  )
} 