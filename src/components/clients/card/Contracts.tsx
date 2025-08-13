'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CREATE_CLIENT_CONTRACT, UPDATE_CLIENT_CONTRACT, DELETE_CLIENT_CONTRACT, UPDATE_CONTRACT_BALANCE } from '@/lib/graphql/mutations'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface Contract {
  id: string
  contractNumber: string
  contractDate: string
  name: string
  ourLegalEntity?: string
  clientLegalEntity?: string
  balance?: number
  currency?: string
  isActive: boolean
  isDefault?: boolean
  contractType?: string
  relationship?: string
  paymentDelay?: number
  creditLimit?: number
  delayDays?: number
  fileUrl?: string
}

interface Client {
  id: string
  contracts: Contract[]
}

interface ContractsProps {
  client: Client
  onUpdate: () => void
}

export const Contracts = ({ client, onUpdate }: ContractsProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingData, setEditingData] = useState<Contract | null>(null)
  const [formData, setFormData] = useState({
    contractNumber: '',
    contractDate: '',
    name: '',
    ourLegalEntity: '',
    clientLegalEntity: '',
    balance: '',
    currency: 'RUB',
    isActive: true,
    isDefault: false,
    contractType: 'STANDARD',
    relationship: 'DIRECT',
    paymentDelay: '',
    creditLimit: '',
    delayDays: '',
    fileUrl: ''
  })

  const [createContract] = useMutation(CREATE_CLIENT_CONTRACT, {
    onCompleted: () => {
      toast.success('Договор добавлен')
      setIsAdding(false)
      setFormData({
        contractNumber: '',
        contractDate: '',
        name: '',
        ourLegalEntity: '',
        clientLegalEntity: '',
        balance: '',
        currency: 'RUB',
        isActive: true,
        isDefault: false,
        contractType: 'STANDARD',
        relationship: 'DIRECT',
        paymentDelay: '',
        creditLimit: '',
        delayDays: '',
        fileUrl: ''
      })
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка добавления: ${error.message}`)
    }
  })

  const [updateContract] = useMutation(UPDATE_CLIENT_CONTRACT, {
    onCompleted: () => {
      toast.success('Договор обновлен')
      setEditingId(null)
      setEditingData(null)
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления: ${error.message}`)
    }
  })

  const [deleteContract] = useMutation(DELETE_CLIENT_CONTRACT, {
    onCompleted: () => {
      toast.success('Договор удален')
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка удаления: ${error.message}`)
    }
  })

  const [updateContractBalance] = useMutation(UPDATE_CONTRACT_BALANCE, {
    onCompleted: () => {
      toast.success('Баланс договора обновлен')
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления баланса: ${error.message}`)
    }
  })

  const handleSave = async () => {
    if (!formData.contractNumber || !formData.name) {
      toast.error('Заполните обязательные поля (номер и название договора)')
      return
    }

    try {
      await createContract({
        variables: {
          clientId: client.id,
          input: {
            contractNumber: formData.contractNumber,
            contractDate: formData.contractDate || undefined,
            name: formData.name,
            ourLegalEntity: formData.ourLegalEntity || undefined,
            clientLegalEntity: formData.clientLegalEntity || undefined,
            balance: formData.balance ? parseFloat(formData.balance) : undefined,
            currency: formData.currency || undefined,
            isActive: formData.isActive,
            isDefault: formData.isDefault,
            contractType: formData.contractType || undefined,
            relationship: formData.relationship || undefined,
            paymentDelay: formData.paymentDelay ? parseInt(formData.paymentDelay) : undefined,
            creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
            delayDays: formData.delayDays ? parseInt(formData.delayDays) : undefined,
            fileUrl: formData.fileUrl || undefined
          }
        }
      })
    } catch (error) {
      console.error('Ошибка сохранения:', error)
    }
  }

  const handleUpdate = async () => {
    if (!editingData || !editingData.contractNumber || !editingData.name) {
      toast.error('Заполните обязательные поля (номер и название договора)')
      return
    }

    try {
      await updateContract({
        variables: {
          id: editingData.id,
          input: {
            contractNumber: editingData.contractNumber,
            contractDate: editingData.contractDate || undefined,
            name: editingData.name,
            ourLegalEntity: editingData.ourLegalEntity || undefined,
            clientLegalEntity: editingData.clientLegalEntity || undefined,
            balance: editingData.balance || undefined,
            currency: editingData.currency || undefined,
            isActive: editingData.isActive,
            isDefault: editingData.isDefault,
            contractType: editingData.contractType || 'STANDARD',
            relationship: editingData.relationship || 'DIRECT',
            paymentDelay: editingData.paymentDelay || undefined,
            creditLimit: editingData.creditLimit || undefined,
            delayDays: editingData.delayDays || undefined,
            fileUrl: editingData.fileUrl || undefined
          }
        }
      })
    } catch (error) {
      console.error('Ошибка обновления:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот договор?')) {
      try {
        await deleteContract({
          variables: { id }
        })
      } catch (error) {
        console.error('Ошибка удаления:', error)
      }
    }
  }

  const startEditing = (contract: Contract) => {
    setEditingId(contract.id)
    setEditingData({ ...contract })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingData(null)
  }

  const handleTopUpBalance = async (contractId: string, amount: number) => {
    try {
      await updateContractBalance({
        variables: {
          contractId,
          amount,
          comment: `Пополнение баланса на ${amount} ₽ через админку`
        }
      })
    } catch (error) {
      console.error('Ошибка пополнения баланса:', error)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Договоры</CardTitle>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить договор
        </Button>
      </CardHeader>
      <CardContent>
        {client.contracts.length === 0 && !isAdding ? (
          <p className="text-muted-foreground">Договоры не добавлены</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Номер</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead>Лимит отсрочки</TableHead>
                <TableHead>Дни отсрочки</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    {editingId === contract.id ? (
                      <Input
                        value={editingData?.contractNumber || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, contractNumber: e.target.value } : null)}
                        placeholder="Номер договора"
                      />
                    ) : (
                      contract.contractNumber
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contract.id ? (
                      <Input
                        value={editingData?.name || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, name: e.target.value } : null)}
                        placeholder="Название договора"
                      />
                    ) : (
                      contract.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contract.id ? (
                      <Input
                        type="date"
                        value={editingData?.contractDate || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, contractDate: e.target.value } : null)}
                      />
                    ) : (
                      contract.contractDate ? new Date(contract.contractDate).toLocaleDateString('ru-RU') : '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contract.id ? (
                      <div className="space-y-1">
                        <Select
                          value={editingData?.isActive ? 'true' : 'false'}
                          onValueChange={(value) => setEditingData(prev => prev ? { ...prev, isActive: value === 'true' } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Активен</SelectItem>
                            <SelectItem value="false">Неактивен</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant={contract.isActive ? 'default' : 'secondary'}>
                          {contract.isActive ? 'Активен' : 'Неактивен'}
                        </Badge>
                        {contract.isDefault && <Badge variant="outline">По умолчанию</Badge>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contract.id ? (
                      <div className="space-y-1">
                        <Input
                          type="number"
                          step="0.01"
                          value={editingData?.balance || ''}
                          onChange={(e) => setEditingData(prev => prev ? { ...prev, balance: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                          placeholder="Баланс"
                        />
                        <Select
                          value={editingData?.currency || 'RUB'}
                          onValueChange={(value) => setEditingData(prev => prev ? { ...prev, currency: value } : null)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RUB">RUB</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className={`font-medium ${(contract.balance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {contract.balance !== undefined ? `${contract.balance.toLocaleString()} ${contract.currency || 'RUB'}` : '0 RUB'}
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleTopUpBalance(contract.id, 1000)}
                            className="text-xs px-2 py-1 h-6"
                          >
                            +1000
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleTopUpBalance(contract.id, 5000)}
                            className="text-xs px-2 py-1 h-6"
                          >
                            +5000
                          </Button>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contract.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editingData?.creditLimit || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, creditLimit: e.target.value ? parseFloat(e.target.value) : undefined } : null)}
                        placeholder="Лимит отсрочки"
                      />
                    ) : (
                      <div className="font-medium">
                        {contract.creditLimit !== undefined && contract.creditLimit !== null 
                          ? `${contract.creditLimit.toLocaleString()} ₽` 
                          : 'Не установлен'
                        }
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contract.id ? (
                      <Input
                        type="number"
                        value={editingData?.delayDays || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, delayDays: e.target.value ? parseInt(e.target.value) : undefined } : null)}
                        placeholder="Дни отсрочки"
                      />
                    ) : (
                      <div className="font-medium">
                        {contract.delayDays !== undefined && contract.delayDays !== null 
                          ? `${contract.delayDays} дней` 
                          : 'Не установлено'
                        }
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === contract.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdate}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditing(contract)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(contract.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
              {isAdding && (
                <TableRow>
                  <TableCell>
                    <Input
                      value={formData.contractNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
                      placeholder="Номер договора"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Название договора"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={formData.contractDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, contractDate: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={formData.isActive ? 'true' : 'false'}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value === 'true' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Активен</SelectItem>
                        <SelectItem value="false">Неактивен</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.balance}
                        onChange={(e) => setFormData(prev => ({ ...prev, balance: e.target.value }))}
                        placeholder="Баланс"
                      />
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RUB">RUB</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, creditLimit: e.target.value }))}
                      placeholder="Лимит отсрочки"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={formData.delayDays}
                      onChange={(e) => setFormData(prev => ({ ...prev, delayDays: e.target.value }))}
                      placeholder="Дни отсрочки"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSave}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
} 