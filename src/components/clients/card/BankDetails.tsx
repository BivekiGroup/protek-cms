'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CREATE_CLIENT_BANK_DETAILS, UPDATE_CLIENT_BANK_DETAILS, DELETE_CLIENT_BANK_DETAILS } from '@/lib/graphql/mutations'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface BankDetails {
  id: string
  legalEntityId?: string
  name: string
  accountNumber: string
  bankName: string
  bik: string
  correspondentAccount?: string
  legalEntity?: {
    id: string
    shortName: string
    inn: string
  }
}

interface Client {
  id: string
  bankDetails: BankDetails[]
  legalEntities: Array<{
    id: string
    shortName: string
    inn: string
  }>
}

interface BankDetailsProps {
  client: Client
  onUpdate: () => void
}

export const BankDetails = ({ client, onUpdate }: BankDetailsProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingData, setEditingData] = useState<BankDetails | null>(null)
  const [formData, setFormData] = useState({
    legalEntityId: '',
    name: '',
    accountNumber: '',
    bankName: '',
    bik: '',
    correspondentAccount: ''
  })

  const [createBankDetails] = useMutation(CREATE_CLIENT_BANK_DETAILS, {
    onCompleted: () => {
      toast.success('Банковские реквизиты добавлены')
      setIsAdding(false)
      setFormData({
        legalEntityId: '',
        name: '',
        accountNumber: '',
        bankName: '',
        bik: '',
        correspondentAccount: ''
      })
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка добавления: ${error.message}`)
    }
  })

  const [updateBankDetails] = useMutation(UPDATE_CLIENT_BANK_DETAILS, {
    onCompleted: () => {
      toast.success('Банковские реквизиты обновлены')
      setEditingId(null)
      setEditingData(null)
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления: ${error.message}`)
    }
  })

  const [deleteBankDetails] = useMutation(DELETE_CLIENT_BANK_DETAILS, {
    onCompleted: () => {
      toast.success('Банковские реквизиты удалены')
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка удаления: ${error.message}`)
    }
  })

  const handleSave = async () => {
    if (!formData.name || !formData.accountNumber || !formData.bankName || !formData.bik || !formData.legalEntityId) {
      toast.error('Заполните обязательные поля (название, номер счета, банк, БИК и юридическое лицо)')
      return
    }

    try {
      await createBankDetails({
        variables: {
          legalEntityId: formData.legalEntityId,
          input: {
            name: formData.name,
            accountNumber: formData.accountNumber,
            bankName: formData.bankName,
            bik: formData.bik,
            correspondentAccount: formData.correspondentAccount || undefined
          }
        }
      })
    } catch (error) {
      console.error('Ошибка сохранения:', error)
    }
  }

  const handleUpdate = async () => {
    if (!editingData || !editingData.name || !editingData.accountNumber || !editingData.bankName || !editingData.bik) {
      toast.error('Заполните обязательные поля (название, номер счета, банк, БИК)')
      return
    }

    try {
      await updateBankDetails({
        variables: {
          id: editingData.id,
          input: {
            legalEntityId: editingData.legalEntityId || undefined,
            name: editingData.name,
            accountNumber: editingData.accountNumber,
            bankName: editingData.bankName,
            bik: editingData.bik,
            correspondentAccount: editingData.correspondentAccount || undefined
          }
        }
      })
    } catch (error) {
      console.error('Ошибка обновления:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить эти банковские реквизиты?')) {
      try {
        await deleteBankDetails({
          variables: { id }
        })
      } catch (error) {
        console.error('Ошибка удаления:', error)
      }
    }
  }

  const startEditing = (details: BankDetails) => {
    setEditingId(details.id)
    setEditingData({ ...details })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingData(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Банковские реквизиты</CardTitle>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить реквизиты
        </Button>
      </CardHeader>
      <CardContent>
        {client.bankDetails.length === 0 && !isAdding ? (
          <p className="text-muted-foreground">Банковские реквизиты не добавлены</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Номер счета</TableHead>
                <TableHead>Банк</TableHead>
                <TableHead>БИК</TableHead>
                <TableHead>Корр. счет</TableHead>
                <TableHead>Юр. лицо</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.bankDetails.map((details) => (
                <TableRow key={details.id}>
                  <TableCell>
                    {editingId === details.id ? (
                      <Input
                        value={editingData?.name || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, name: e.target.value } : null)}
                        placeholder="Название реквизитов"
                      />
                    ) : (
                      details.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === details.id ? (
                      <Input
                        value={editingData?.accountNumber || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, accountNumber: e.target.value } : null)}
                        placeholder="Номер счета"
                      />
                    ) : (
                      details.accountNumber
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === details.id ? (
                      <Input
                        value={editingData?.bankName || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, bankName: e.target.value } : null)}
                        placeholder="Название банка"
                      />
                    ) : (
                      details.bankName
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === details.id ? (
                      <Input
                        value={editingData?.bik || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, bik: e.target.value } : null)}
                        placeholder="БИК"
                      />
                    ) : (
                      details.bik
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === details.id ? (
                      <Input
                        value={editingData?.correspondentAccount || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, correspondentAccount: e.target.value } : null)}
                        placeholder="Корреспондентский счет"
                      />
                    ) : (
                      details.correspondentAccount || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === details.id ? (
                      <Select
                        value={editingData?.legalEntityId || 'none'}
                        onValueChange={(value) => setEditingData(prev => prev ? { ...prev, legalEntityId: value === 'none' ? undefined : value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите юр. лицо" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не выбрано</SelectItem>
                          {client.legalEntities.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.shortName} (ИНН: {entity.inn})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      details.legalEntity ? `${details.legalEntity.shortName} (ИНН: ${details.legalEntity.inn})` : '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === details.id ? (
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
                        <Button size="sm" variant="outline" onClick={() => startEditing(details)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(details.id)}>
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
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Название реквизитов"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.accountNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="Номер счета"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.bankName}
                      onChange={(e) => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                      placeholder="Название банка"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.bik}
                      onChange={(e) => setFormData(prev => ({ ...prev, bik: e.target.value }))}
                      placeholder="БИК"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.correspondentAccount}
                      onChange={(e) => setFormData(prev => ({ ...prev, correspondentAccount: e.target.value }))}
                      placeholder="Корреспондентский счет"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={formData.legalEntityId || 'none'}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, legalEntityId: value === 'none' ? '' : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите юр. лицо" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Не выбрано</SelectItem>
                        {client.legalEntities.map((entity) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            {entity.shortName} (ИНН: {entity.inn})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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