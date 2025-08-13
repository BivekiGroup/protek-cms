'use client'

import { useState } from 'react'
import { useMutation } from '@apollo/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { CREATE_CLIENT_LEGAL_ENTITY, UPDATE_CLIENT_LEGAL_ENTITY, DELETE_CLIENT_LEGAL_ENTITY } from '@/lib/graphql/mutations'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface LegalEntity {
  id: string
  shortName: string
  fullName?: string
  form?: string
  legalAddress?: string
  actualAddress?: string
  taxSystem?: string
  responsiblePhone?: string
  responsiblePosition?: string
  responsibleName?: string
  accountant?: string
  signatory?: string
  registrationReasonCode?: string
  ogrn?: string
  inn: string
  vatPercent: number
}

interface Client {
  id: string
  legalEntities: LegalEntity[]
}

interface LegalEntitiesProps {
  client: Client
  onUpdate: () => void
}

export const LegalEntities = ({ client, onUpdate }: LegalEntitiesProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingData, setEditingData] = useState<LegalEntity | null>(null)
  const [formData, setFormData] = useState({
    shortName: '',
    fullName: '',
    form: 'ООО',
    legalAddress: '',
    actualAddress: '',
    taxSystem: 'УСН',
    responsiblePhone: '',
    responsiblePosition: '',
    responsibleName: '',
    accountant: '',
    signatory: '',
    registrationReasonCode: '',
    ogrn: '',
    inn: '',
    vatPercent: '20'
  })

  const [createLegalEntity] = useMutation(CREATE_CLIENT_LEGAL_ENTITY, {
    onCompleted: () => {
      toast.success('Юридическое лицо добавлено')
      setIsAdding(false)
      setFormData({
        shortName: '',
        fullName: '',
        form: 'ООО',
        legalAddress: '',
        actualAddress: '',
        taxSystem: 'УСН',
        responsiblePhone: '',
        responsiblePosition: '',
        responsibleName: '',
        accountant: '',
        signatory: '',
        registrationReasonCode: '',
        ogrn: '',
        inn: '',
        vatPercent: '20'
      })
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка добавления: ${error.message}`)
    }
  })

  const [updateLegalEntity] = useMutation(UPDATE_CLIENT_LEGAL_ENTITY, {
    onCompleted: () => {
      toast.success('Юридическое лицо обновлено')
      setEditingId(null)
      setEditingData(null)
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка обновления: ${error.message}`)
    }
  })

  const [deleteLegalEntity] = useMutation(DELETE_CLIENT_LEGAL_ENTITY, {
    onCompleted: () => {
      toast.success('Юридическое лицо удалено')
      onUpdate()
    },
    onError: (error) => {
      toast.error(`Ошибка удаления: ${error.message}`)
    }
  })

  const handleSave = async () => {
    if (!formData.shortName || !formData.inn) {
      toast.error('Заполните обязательные поля (название и ИНН)')
      return
    }

    try {
      await createLegalEntity({
        variables: {
          clientId: client.id,
          input: {
            shortName: formData.shortName,
            fullName: formData.fullName || undefined,
            form: formData.form || undefined,
            legalAddress: formData.legalAddress || undefined,
            actualAddress: formData.actualAddress || undefined,
            taxSystem: formData.taxSystem || undefined,
            responsiblePhone: formData.responsiblePhone || undefined,
            responsiblePosition: formData.responsiblePosition || undefined,
            responsibleName: formData.responsibleName || undefined,
            accountant: formData.accountant || undefined,
            signatory: formData.signatory || undefined,
            registrationReasonCode: formData.registrationReasonCode || undefined,
            ogrn: formData.ogrn || undefined,
            inn: formData.inn,
            vatPercent: parseFloat(formData.vatPercent)
          }
        }
      })
    } catch (error) {
      console.error('Ошибка сохранения:', error)
    }
  }

  const handleUpdate = async () => {
    if (!editingData || !editingData.shortName || !editingData.inn) {
      toast.error('Заполните обязательные поля (название и ИНН)')
      return
    }

    try {
      await updateLegalEntity({
        variables: {
          id: editingData.id,
          input: {
            shortName: editingData.shortName,
            fullName: editingData.fullName || editingData.shortName,
            form: editingData.form || 'ООО',
            legalAddress: editingData.legalAddress,
            actualAddress: editingData.actualAddress || undefined,
            taxSystem: editingData.taxSystem || undefined,
            responsiblePhone: editingData.responsiblePhone || undefined,
            responsiblePosition: editingData.responsiblePosition || undefined,
            responsibleName: editingData.responsibleName || undefined,
            accountant: editingData.accountant || undefined,
            signatory: editingData.signatory || undefined,
            registrationReasonCode: editingData.registrationReasonCode || undefined,
            ogrn: editingData.ogrn || undefined,
            inn: editingData.inn,
            vatPercent: editingData.vatPercent
          }
        }
      })
    } catch (error) {
      console.error('Ошибка обновления:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены, что хотите удалить это юридическое лицо?')) {
      try {
        await deleteLegalEntity({
          variables: { id }
        })
      } catch (error) {
        console.error('Ошибка удаления:', error)
      }
    }
  }

  const startEditing = (entity: LegalEntity) => {
    setEditingId(entity.id)
    setEditingData({ ...entity })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingData(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Юридические лица</CardTitle>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить юридическое лицо
        </Button>
      </CardHeader>
      <CardContent>
        {client.legalEntities.length === 0 && !isAdding ? (
          <p className="text-muted-foreground">Юридические лица не добавлены</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Форма</TableHead>
                <TableHead>ИНН</TableHead>
                <TableHead>ОГРН</TableHead>
                <TableHead>НДС</TableHead>
                <TableHead>Ответственный</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.legalEntities.map((entity) => (
                <TableRow key={entity.id}>
                  <TableCell>
                    {editingId === entity.id ? (
                      <div className="space-y-1">
                        <Input
                          value={editingData?.shortName || ''}
                          onChange={(e) => setEditingData(prev => prev ? { ...prev, shortName: e.target.value } : null)}
                          placeholder="Краткое название"
                        />
                        <Input
                          value={editingData?.fullName || ''}
                          onChange={(e) => setEditingData(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                          placeholder="Полное название"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">{entity.shortName}</div>
                        {entity.fullName && <div className="text-sm text-muted-foreground">{entity.fullName}</div>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entity.id ? (
                      <Select
                        value={editingData?.form || 'ООО'}
                        onValueChange={(value) => setEditingData(prev => prev ? { ...prev, form: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ООО">ООО</SelectItem>
                          <SelectItem value="ОАО">ОАО</SelectItem>
                          <SelectItem value="ЗАО">ЗАО</SelectItem>
                          <SelectItem value="ИП">ИП</SelectItem>
                          <SelectItem value="ПАО">ПАО</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      entity.form || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entity.id ? (
                      <Input
                        value={editingData?.inn || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, inn: e.target.value } : null)}
                        placeholder="ИНН"
                      />
                    ) : (
                      entity.inn
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entity.id ? (
                      <Input
                        value={editingData?.ogrn || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, ogrn: e.target.value } : null)}
                        placeholder="ОГРН"
                      />
                    ) : (
                      entity.ogrn || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entity.id ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editingData?.vatPercent || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, vatPercent: parseFloat(e.target.value) } : null)}
                        placeholder="НДС %"
                      />
                    ) : (
                      `${entity.vatPercent}%`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entity.id ? (
                      <div className="space-y-1">
                        <Input
                          value={editingData?.responsibleName || ''}
                          onChange={(e) => setEditingData(prev => prev ? { ...prev, responsibleName: e.target.value } : null)}
                          placeholder="ФИО ответственного"
                        />
                        <Input
                          value={editingData?.responsiblePosition || ''}
                          onChange={(e) => setEditingData(prev => prev ? { ...prev, responsiblePosition: e.target.value } : null)}
                          placeholder="Должность"
                        />
                        <Input
                          value={editingData?.responsiblePhone || ''}
                          onChange={(e) => setEditingData(prev => prev ? { ...prev, responsiblePhone: e.target.value } : null)}
                          placeholder="Телефон"
                        />
                      </div>
                    ) : (
                      <div>
                        {entity.responsibleName && <div>{entity.responsibleName}</div>}
                        {entity.responsiblePosition && <div className="text-sm text-muted-foreground">{entity.responsiblePosition}</div>}
                        {entity.responsiblePhone && <div className="text-sm">{entity.responsiblePhone}</div>}
                        {!entity.responsibleName && !entity.responsiblePosition && !entity.responsiblePhone && '-'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === entity.id ? (
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
                        <Button size="sm" variant="outline" onClick={() => startEditing(entity)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(entity.id)}>
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
                    <div className="space-y-1">
                      <Input
                        value={formData.shortName}
                        onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
                        placeholder="Краткое название"
                      />
                      <Input
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Полное название"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={formData.form}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, form: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ООО">ООО</SelectItem>
                        <SelectItem value="ОАО">ОАО</SelectItem>
                        <SelectItem value="ЗАО">ЗАО</SelectItem>
                        <SelectItem value="ИП">ИП</SelectItem>
                        <SelectItem value="ПАО">ПАО</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.inn}
                      onChange={(e) => setFormData(prev => ({ ...prev, inn: e.target.value }))}
                      placeholder="ИНН"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={formData.ogrn}
                      onChange={(e) => setFormData(prev => ({ ...prev, ogrn: e.target.value }))}
                      placeholder="ОГРН"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.vatPercent}
                      onChange={(e) => setFormData(prev => ({ ...prev, vatPercent: e.target.value }))}
                      placeholder="НДС %"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Input
                        value={formData.responsibleName}
                        onChange={(e) => setFormData(prev => ({ ...prev, responsibleName: e.target.value }))}
                        placeholder="ФИО ответственного"
                      />
                      <Input
                        value={formData.responsiblePosition}
                        onChange={(e) => setFormData(prev => ({ ...prev, responsiblePosition: e.target.value }))}
                        placeholder="Должность"
                      />
                      <Input
                        value={formData.responsiblePhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, responsiblePhone: e.target.value }))}
                        placeholder="Телефон"
                      />
                    </div>
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