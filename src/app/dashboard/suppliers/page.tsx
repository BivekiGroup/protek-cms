"use client"

import { useState, useRef, useEffect, Fragment } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useQuery, useMutation } from '@apollo/client'
import {
  Plus,
  Building2,
  Loader2,
  Trash2,
  Edit,
  Search,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Upload,
  Download,
  FileText,
  Calendar,
  X
} from 'lucide-react'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { getCompanyByInn, getBankByBik } from '@/lib/dadata'
import { GET_SUPPLIERS, GET_PRICE_LIST_ITEMS } from '@/lib/graphql/queries'
import { CREATE_SUPPLIER, UPDATE_SUPPLIER, DELETE_SUPPLIER, CREATE_PRICE_LIST, DELETE_PRICE_LIST } from '@/lib/graphql/mutations'

// Zod схема валидации
const supplierSchema = z.object({
  inn: z
    .string()
    .min(10, 'ИНН должен содержать минимум 10 цифр')
    .max(12, 'ИНН должен содержать максимум 12 цифр')
    .regex(/^\d+$/, 'ИНН должен содержать только цифры'),
  name: z
    .string()
    .min(2, 'Название компании обязательно'),
  kpp: z.string().optional(),
  ogrn: z.string().optional(),
  address: z.string().optional(),
  bik: z
    .string()
    .length(9, 'БИК должен содержать 9 цифр')
    .regex(/^\d+$/, 'БИК должен содержать только цифры'),
  bankName: z
    .string()
    .min(2, 'Название банка обязательно'),
  correspondentAccount: z.string().optional(),
  accountNumber: z
    .string()
    .length(20, 'Номер счета должен содержать 20 цифр')
    .regex(/^\d+$/, 'Номер счета должен содержать только цифры'),
  email: z
    .string()
    .email('Введите корректный email'),
  contactPerson: z
    .string()
    .min(2, 'ФИО контактного лица обязательно'),
  phone: z
    .string()
    .min(10, 'Введите корректный номер телефона')
    .regex(/^[\d\s\+\-\(\)]+$/, 'Некорректный формат телефона'),
})

type SupplierFormData = z.infer<typeof supplierSchema>

interface PriceList {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  itemsCount: number
  status: string
  errorMessage?: string
  processingLog?: string
  createdAt: string
  updatedAt: string
}

interface Supplier {
  id: string
  supplierCode: string
  inn: string
  name: string
  bik: string
  bankName: string
  accountNumber: string
  email: string
  phone: string
  contactPerson: string
  address?: string
  correspondentAccount?: string
  ogrn?: string
  kpp?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  priceLists: PriceList[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="default" className="bg-green-500">Обработан</Badge>
    case 'processing':
      return <Badge variant="secondary">Обрабатывается</Badge>
    case 'error':
      return <Badge variant="destructive">Ошибка</Badge>
    default:
      return <Badge variant="outline">Ожидает</Badge>
  }
}

export default function SuppliersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPriceListDialogOpen, setIsPriceListDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)
  const [deletingPriceList, setDeletingPriceList] = useState<PriceList | null>(null)
  const [uploadingSupplierId, setUploadingSupplierId] = useState<string | null>(null)
  const [isLoadingInn, setIsLoadingInn] = useState(false)
  const [isLoadingBik, setIsLoadingBik] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [viewingPriceList, setViewingPriceList] = useState<PriceList | null>(null)
  const [viewingLogs, setViewingLogs] = useState<PriceList | null>(null)
  const [itemsSearchQuery, setItemsSearchQuery] = useState('')
  const [itemsPage, setItemsPage] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: itemsData, loading: itemsLoading } = useQuery(GET_PRICE_LIST_ITEMS, {
    variables: {
      priceListId: viewingPriceList?.id,
      search: itemsSearchQuery || undefined,
      limit: 100,
      offset: itemsPage * 100,
    },
    skip: !viewingPriceList,
    fetchPolicy: 'cache-and-network',
  })

  const { data, loading, refetch, startPolling, stopPolling } = useQuery(GET_SUPPLIERS, {
    variables: { search: searchQuery || undefined, limit: 100 },
    fetchPolicy: 'cache-and-network',
  })

  const suppliers: Supplier[] = data?.suppliers || []

  // Автоматический polling когда есть обрабатывающиеся прайслисты
  useEffect(() => {
    const hasProcessing = suppliers.some(s => s.priceLists?.some(p => p.status === 'processing'))
    if (hasProcessing) {
      startPolling(3000)
    } else {
      stopPolling()
    }
    return () => stopPolling()
  }, [suppliers, startPolling, stopPolling])

  const [createSupplier, { loading: creating }] = useMutation(CREATE_SUPPLIER, {
    onCompleted: () => {
      toast.success('Поставщик успешно добавлен')
      setIsDialogOpen(false)
      form.reset()
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при добавлении поставщика')
    },
  })

  const [updateSupplier, { loading: updating }] = useMutation(UPDATE_SUPPLIER, {
    onCompleted: () => {
      toast.success('Поставщик успешно обновлён')
      setIsDialogOpen(false)
      setEditingSupplier(null)
      form.reset()
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при обновлении поставщика')
    },
  })

  const [deleteSupplier, { loading: deleting }] = useMutation(DELETE_SUPPLIER, {
    onCompleted: () => {
      toast.success('Поставщик удалён')
      setDeletingSupplier(null)
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при удалении поставщика')
    },
  })

  const [createPriceList] = useMutation(CREATE_PRICE_LIST, {
    onCompleted: () => {
      toast.success('Прайслист загружен')
      setIsPriceListDialogOpen(false)
      setSelectedFile(null)
      setUploadingSupplierId(null)
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при загрузке прайслиста')
    },
  })

  const [deletePriceList, { loading: deletingPriceListLoading }] = useMutation(DELETE_PRICE_LIST, {
    onCompleted: () => {
      toast.success('Прайслист удалён')
      setDeletingPriceList(null)
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка при удалении прайслиста')
    },
  })

  const isSubmitting = creating || updating

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      inn: '',
      name: '',
      kpp: '',
      ogrn: '',
      address: '',
      bik: '',
      bankName: '',
      correspondentAccount: '',
      accountNumber: '',
      email: '',
      contactPerson: '',
      phone: '',
    },
  })

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const handleInnBlur = async (inn: string) => {
    if (!inn || inn.length < 10) return

    setIsLoadingInn(true)
    try {
      const result = await getCompanyByInn(inn)
      if (result) {
        form.setValue('name', result.name)
        if (result.kpp) form.setValue('kpp', result.kpp)
        if (result.ogrn) form.setValue('ogrn', result.ogrn)
        if (result.address) form.setValue('address', result.address)
        toast.success('Данные компании загружены')
      } else {
        toast.info('Компания не найдена. Введите название вручную.')
      }
    } catch (error) {
      console.error('Company lookup error:', error)
      toast.error('Ошибка при поиске компании. Введите название вручную.')
    } finally {
      setIsLoadingInn(false)
    }
  }

  const handleBikBlur = async (bik: string) => {
    if (!bik || bik.length !== 9) return

    setIsLoadingBik(true)
    try {
      const result = await getBankByBik(bik)
      if (result) {
        form.setValue('bankName', result.name)
        if (result.correspondentAccount) form.setValue('correspondentAccount', result.correspondentAccount)
        toast.success('Данные банка загружены')
      } else {
        toast.info('Банк не найден. Введите название вручную.')
      }
    } catch (error) {
      console.error('Bank lookup error:', error)
      toast.error('Ошибка при поиске банка. Введите название вручную.')
    } finally {
      setIsLoadingBik(false)
    }
  }

  const handleSubmit = async (data: SupplierFormData) => {
    if (editingSupplier) {
      await updateSupplier({
        variables: {
          id: editingSupplier.id,
          input: data,
        },
      })
    } else {
      await createSupplier({
        variables: {
          input: data,
        },
      })
    }
  }

  const handleOpenDialog = () => {
    setEditingSupplier(null)
    form.reset()
    setIsDialogOpen(true)
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    form.reset({
      inn: supplier.inn,
      name: supplier.name,
      kpp: supplier.kpp || '',
      ogrn: supplier.ogrn || '',
      address: supplier.address || '',
      bik: supplier.bik,
      bankName: supplier.bankName,
      correspondentAccount: supplier.correspondentAccount || '',
      accountNumber: supplier.accountNumber,
      email: supplier.email,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (supplier: Supplier) => {
    setDeletingSupplier(supplier)
  }

  const confirmDelete = async () => {
    if (deletingSupplier) {
      await deleteSupplier({
        variables: { id: deletingSupplier.id },
      })
    }
  }

  const handleOpenPriceListDialog = (supplierId: string) => {
    setUploadingSupplierId(supplierId)
    setSelectedFile(null)
    setIsPriceListDialogOpen(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
      ]
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast.error('Поддерживаются только файлы Excel (.xlsx, .xls) и CSV')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUploadPriceList = async () => {
    if (!selectedFile || !uploadingSupplierId) return

    setIsUploading(true)
    try {
      // Загружаем файл на S3
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('prefix', 'pricelists')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Ошибка загрузки файла')
      }

      const { data } = await uploadResponse.json()

      // Создаём запись прайслиста
      await createPriceList({
        variables: {
          input: {
            supplierId: uploadingSupplierId,
            fileName: selectedFile.name,
            fileUrl: data.url,
            fileSize: selectedFile.size,
          },
        },
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Ошибка при загрузке прайслиста')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeletePriceList = (priceList: PriceList) => {
    setDeletingPriceList(priceList)
  }

  const confirmDeletePriceList = async () => {
    if (deletingPriceList) {
      await deletePriceList({
        variables: { id: deletingPriceList.id },
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Поставщики</h1>
          <p className="text-muted-foreground">Управление поставщиками и их прайслистами</p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, ИНН, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading && suppliers.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Поставщики не найдены' : 'Поставщики не добавлены'}
          </p>
          {!searchQuery && (
            <Button variant="outline" onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить первого поставщика
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Код</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>ИНН</TableHead>
                <TableHead>Почта</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Контактное лицо</TableHead>
                <TableHead>Прайслисты</TableHead>
                <TableHead className="w-[100px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <Fragment key={supplier.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(supplier.id)}
                  >
                    <TableCell>
                      {expandedRows.has(supplier.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{supplier.supplierCode}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.inn}</TableCell>
                    <TableCell>{supplier.email}</TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                    <TableCell>{supplier.contactPerson}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{supplier.priceLists?.length || 0}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(supplier)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {expandedRows.has(supplier.id) && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/30 p-0">
                        <div className="p-6 space-y-6">
                          {/* Полная информация о поставщике */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Код поставщика</p>
                              <p className="font-medium font-mono">{supplier.supplierCode}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">ИНН</p>
                              <p className="font-medium">{supplier.inn}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">КПП</p>
                              <p className="font-medium">{supplier.kpp || '—'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">ОГРН</p>
                              <p className="font-medium">{supplier.ogrn || '—'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Статус</p>
                              <div className="font-medium">
                                {supplier.isActive ? (
                                  <Badge variant="default" className="bg-green-500">Активен</Badge>
                                ) : (
                                  <Badge variant="secondary">Неактивен</Badge>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">БИК</p>
                              <p className="font-medium">{supplier.bik}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Банк</p>
                              <p className="font-medium">{supplier.bankName}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Номер счёта</p>
                              <p className="font-medium">{supplier.accountNumber}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Корр. счёт</p>
                              <p className="font-medium">{supplier.correspondentAccount || '—'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-sm text-muted-foreground">Адрес</p>
                              <p className="font-medium">{supplier.address || '—'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Добавлен</p>
                              <p className="font-medium">{formatDate(supplier.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Обновлён</p>
                              <p className="font-medium">{formatDate(supplier.updatedAt)}</p>
                            </div>
                          </div>

                          {/* Прайслисты */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileSpreadsheet className="h-5 w-5" />
                                Прайслисты
                              </h3>
                              <Button
                                size="sm"
                                onClick={() => handleOpenPriceListDialog(supplier.id)}
                              >
                                <Upload className="mr-2 h-4 w-4" />
                                Загрузить прайслист
                              </Button>
                            </div>

                            {supplier.priceLists?.length > 0 ? (
                              <div className="border rounded-lg">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Файл</TableHead>
                                      <TableHead>Размер</TableHead>
                                      <TableHead>Позиций</TableHead>
                                      <TableHead>Статус</TableHead>
                                      <TableHead>Загружен</TableHead>
                                      <TableHead className="w-[100px]">Действия</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {supplier.priceLists.map((priceList) => (
                                      <TableRow key={priceList.id}>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{priceList.fileName}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell>{formatFileSize(priceList.fileSize)}</TableCell>
                                        <TableCell>{priceList.itemsCount}</TableCell>
                                        <TableCell>
                                          {getStatusBadge(priceList.status)}
                                          {priceList.errorMessage && (
                                            <p className="text-xs text-destructive mt-1">{priceList.errorMessage}</p>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(priceList.createdAt)}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex gap-2">
                                            {priceList.status === 'completed' && priceList.itemsCount > 0 && (
                                              <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => {
                                                  setViewingPriceList(priceList)
                                                  setItemsPage(0)
                                                  setItemsSearchQuery('')
                                                }}
                                              >
                                                <FileText className="h-4 w-4 mr-1" />
                                                Просмотр
                                              </Button>
                                            )}
                                            {priceList.processingLog && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setViewingLogs(priceList)}
                                              >
                                                <FileText className="h-4 w-4" />
                                              </Button>
                                            )}
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              asChild
                                            >
                                              <a href={priceList.fileUrl} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4" />
                                              </a>
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="destructive"
                                              onClick={() => handleDeletePriceList(priceList)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground">Прайслисты не загружены</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Диалог добавления/редактирования поставщика */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Редактировать поставщика' : 'Добавить поставщика'}
            </DialogTitle>
            <DialogDescription>
              Заполните информацию о поставщике. Поля отмеченные * обязательны.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="inn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ИНН *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="1234567890"
                            onBlur={(e) => {
                              field.onBlur()
                              handleInnBlur(e.target.value)
                            }}
                          />
                          {isLoadingInn && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название компании *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ООО «Название»" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bik"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>БИК *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            placeholder="044525225"
                            onBlur={(e) => {
                              field.onBlur()
                              handleBikBlur(e.target.value)
                            }}
                          />
                          {isLoadingBik && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название банка *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ПАО Сбербанк" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер счета *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="40702810000000000000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Почта *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="supplier@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Телефон *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+7 (999) 123-45-67" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ФИО контактного лица *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Иванов Иван Иванович" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : editingSupplier ? (
                    'Сохранить изменения'
                  ) : (
                    'Добавить поставщика'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Диалог загрузки прайслиста */}
      <Dialog open={isPriceListDialogOpen} onOpenChange={setIsPriceListDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Загрузить прайслист</DialogTitle>
            <DialogDescription>
              Выберите файл Excel (.xlsx, .xls) или CSV для загрузки прайслиста поставщика.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Нажмите для выбора файла или перетащите его сюда
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Поддерживаются форматы: .xlsx, .xls, .csv
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPriceListDialogOpen(false)}
              disabled={isUploading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleUploadPriceList}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Загрузить
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждение удаления поставщика */}
      <AlertDialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить поставщика?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить поставщика «{deletingSupplier?.name}»?
              Все прайслисты поставщика также будут удалены. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Подтверждение удаления прайслиста */}
      <AlertDialog open={!!deletingPriceList} onOpenChange={() => setDeletingPriceList(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить прайслист?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить прайслист «{deletingPriceList?.fileName}»?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPriceListLoading}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePriceList}
              disabled={deletingPriceListLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingPriceListLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог просмотра товаров прайслиста */}
      <Dialog open={!!viewingPriceList} onOpenChange={() => setViewingPriceList(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Товары прайслиста: {viewingPriceList?.fileName}</DialogTitle>
            <DialogDescription>
              Всего товаров: {itemsData?.priceListItems?.total || 0}
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <Input
              placeholder="Поиск по артикулу, названию или бренду..."
              value={itemsSearchQuery}
              onChange={(e) => {
                setItemsSearchQuery(e.target.value)
                setItemsPage(0)
              }}
              className="max-w-md"
            />
          </div>

          <div className="flex-1 overflow-auto border rounded-lg">
            {itemsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Артикул</TableHead>
                    <TableHead>Бренд</TableHead>
                    <TableHead>Название</TableHead>
                    <TableHead>Наличие</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead>Кратность</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsData?.priceListItems?.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.article}</TableCell>
                      <TableCell>{item.brand || '—'}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.availability || '—'}</TableCell>
                      <TableCell>
                        {item.price ? `${item.price.toFixed(2)} ₽` : '—'}
                      </TableCell>
                      <TableCell>{item.multiplicity || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Показано {itemsPage * 100 + 1} - {Math.min((itemsPage + 1) * 100, itemsData?.priceListItems?.total || 0)} из {itemsData?.priceListItems?.total || 0}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setItemsPage(p => Math.max(0, p - 1))}
                disabled={itemsPage === 0 || itemsLoading}
              >
                Назад
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setItemsPage(p => p + 1)}
                disabled={!itemsData?.priceListItems?.hasMore || itemsLoading}
              >
                Далее
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог просмотра логов обработки */}
      <Dialog open={!!viewingLogs} onOpenChange={() => setViewingLogs(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Логи обработки: {viewingLogs?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm whitespace-pre-wrap max-h-[500px] overflow-auto">
            {viewingLogs?.processingLog || 'Нет логов'}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
