"use client"

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { gql } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, UserCheck, XCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

// GraphQL Queries
const GET_UNVERIFIED_CLIENTS = gql`
  query GetUnverifiedClients($limit: Int, $offset: Int) {
    unverifiedClients(limit: $limit, offset: $offset) {
      id
      clientNumber
      name
      firstName
      lastName
      email
      phone
      companyName
      createdAt
      legalEntities {
        id
        inn
        shortName
      }
    }
    unverifiedClientsCount
  }
`

const VERIFY_CLIENT = gql`
  mutation VerifyClient($clientId: ID!) {
    verifyClient(clientId: $clientId) {
      success
      client {
        id
        clientNumber
        name
        isVerified
      }
      generatedLogin
      generatedPassword
    }
  }
`

const REJECT_CLIENT = gql`
  mutation RejectClient($clientId: ID!) {
    rejectClient(clientId: $clientId)
  }
`

// Типы данных
interface UnverifiedClient {
  id: string
  clientNumber: string
  name: string
  firstName?: string
  lastName?: string
  email?: string
  phone: string
  companyName?: string
  createdAt: string
  legalEntities?: Array<{
    id: string
    inn: string
    shortName: string
  }>
}

export const UnverifiedClientsList = () => {
  const [selectedClient, setSelectedClient] = useState<UnverifiedClient | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)

  const { data, loading, error, refetch } = useQuery(GET_UNVERIFIED_CLIENTS, {
    variables: {
      limit: 100,
      offset: 0
    }
  })

  const [verifyClient, { loading: verifying }] = useMutation(VERIFY_CLIENT, {
    onCompleted: (data) => {
      if (data.verifyClient.success) {
        toast.success(`Контрагент ${data.verifyClient.client.name} успешно подтвержден!`)
        toast.info(`Логин: ${data.verifyClient.generatedLogin}`)
        toast.info(`Пароль: ${data.verifyClient.generatedPassword}`)
        toast.success('Учетные данные отправлены на email контрагента')
        refetch()
        setIsConfirmDialogOpen(false)
        setSelectedClient(null)
      }
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`)
    }
  })

  const [rejectClient, { loading: rejecting }] = useMutation(REJECT_CLIENT, {
    onCompleted: () => {
      toast.success(`Контрагент ${selectedClient?.name} отклонен и удален`)
      refetch()
      setIsRejectDialogOpen(false)
      setSelectedClient(null)
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`)
    }
  })

  const handleVerifyClick = (client: UnverifiedClient) => {
    setSelectedClient(client)
    setIsConfirmDialogOpen(true)
  }

  const handleRejectClick = (client: UnverifiedClient) => {
    setSelectedClient(client)
    setIsRejectDialogOpen(true)
  }

  const handleConfirmVerify = () => {
    if (selectedClient) {
      verifyClient({
        variables: {
          clientId: selectedClient.id
        }
      })
    }
  }

  const handleConfirmReject = () => {
    if (selectedClient) {
      rejectClient({
        variables: {
          clientId: selectedClient.id
        }
      })
    }
  }

  const clients = data?.unverifiedClients || []
  const totalCount = data?.unverifiedClientsCount || 0

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Контрагенты, ожидающие проверки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Контрагенты, ожидающие проверки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-red-500">Ошибка загрузки: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Контрагенты, ожидающие проверки</CardTitle>
            <Badge variant="secondary">
              <UserCheck className="mr-1 h-4 w-4" />
              {totalCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет непроверенных контрагентов</h3>
              <p className="text-muted-foreground">
                Все зарегистрированные контрагенты прошли проверку
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер</TableHead>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Компания</TableHead>
                    <TableHead>ИНН</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Дата регистрации</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client: UnverifiedClient) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.clientNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{client.name}</span>
                          {client.firstName && client.lastName && (
                            <span className="text-sm text-muted-foreground">
                              {client.firstName} {client.lastName}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.companyName ||
                         client.legalEntities?.[0]?.shortName ||
                         '-'}
                      </TableCell>
                      <TableCell>
                        {client.legalEntities?.[0]?.inn || '-'}
                      </TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.email || '-'}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(client.createdAt), {
                            addSuffix: true,
                            locale: ru
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectClick(client)}
                            disabled={verifying || rejecting}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Отклонить
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleVerifyClick(client)}
                            disabled={verifying || rejecting}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Подтвердить
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение контрагента</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите подтвердить контрагента?
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-2 py-4">
              <p><strong>ФИО:</strong> {selectedClient.name}</p>
              {(selectedClient.companyName || selectedClient.legalEntities?.[0]?.shortName) && (
                <p><strong>Компания:</strong> {selectedClient.companyName || selectedClient.legalEntities?.[0]?.shortName}</p>
              )}
              {selectedClient.legalEntities?.[0]?.inn && (
                <p><strong>ИНН:</strong> {selectedClient.legalEntities[0].inn}</p>
              )}
              <p><strong>Телефон:</strong> {selectedClient.phone}</p>
              <p><strong>Email:</strong> {selectedClient.email || 'Не указан'}</p>
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-900">
                  После подтверждения система автоматически:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-900 mt-2 space-y-1">
                  <li>Сгенерирует логин и пароль</li>
                  <li>Отправит учетные данные на email контрагента</li>
                  <li>Активирует доступ к личному кабинету</li>
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              disabled={verifying}
            >
              Отмена
            </Button>
            <Button
              onClick={handleConfirmVerify}
              disabled={verifying}
            >
              {verifying ? 'Подтверждение...' : 'Подтвердить контрагента'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонение контрагента</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите отклонить контрагента?
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-2 py-4">
              <p><strong>ФИО:</strong> {selectedClient.name}</p>
              {(selectedClient.companyName || selectedClient.legalEntities?.[0]?.shortName) && (
                <p><strong>Компания:</strong> {selectedClient.companyName || selectedClient.legalEntities?.[0]?.shortName}</p>
              )}
              {selectedClient.legalEntities?.[0]?.inn && (
                <p><strong>ИНН:</strong> {selectedClient.legalEntities[0].inn}</p>
              )}
              <p><strong>Телефон:</strong> {selectedClient.phone}</p>
              <p><strong>Email:</strong> {selectedClient.email || 'Не указан'}</p>
              <div className="mt-4 p-4 bg-red-50 rounded-md">
                <p className="text-sm text-red-900 font-semibold">
                  Внимание! Это действие нельзя отменить.
                </p>
                <p className="text-sm text-red-900 mt-2">
                  Контрагент будет полностью удален из системы.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={rejecting}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejecting}
            >
              {rejecting ? 'Отклонение...' : 'Отклонить контрагента'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
