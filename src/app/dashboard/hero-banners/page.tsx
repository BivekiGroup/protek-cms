"use client"

import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileUpload } from '@/components/ui/file-upload'
import { Plus, Edit, Trash2, Image, ExternalLink } from 'lucide-react'
import { GET_HERO_BANNERS } from '@/lib/graphql/queries'
import { CREATE_HERO_BANNER, UPDATE_HERO_BANNER, DELETE_HERO_BANNER } from '@/lib/graphql/mutations'
import { toast } from 'sonner'

interface HeroBanner {
  id: string
  title: string
  subtitle?: string
  imageUrl: string
  linkUrl?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface BannerFormData {
  title: string
  subtitle: string
  imageUrl: string
  linkUrl: string
  isActive: boolean
  sortOrder: number
}

const defaultFormData: BannerFormData = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  isActive: true,
  sortOrder: 0
}

export default function HeroBannersPage() {
  const [showDialog, setShowDialog] = useState(false)
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null)
  const [formData, setFormData] = useState<BannerFormData>(defaultFormData)
  const [uploading, setUploading] = useState(false)

  const { data, loading, error, refetch } = useQuery(GET_HERO_BANNERS, {
    fetchPolicy: 'cache-and-network'
  })

  const [createBanner] = useMutation(CREATE_HERO_BANNER, {
    onCompleted: () => {
      toast.success('Баннер успешно создан')
      setShowDialog(false)
      setFormData(defaultFormData)
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка создания баннера')
    }
  })

  const [updateBanner] = useMutation(UPDATE_HERO_BANNER, {
    onCompleted: () => {
      toast.success('Баннер успешно обновлен')
      setShowDialog(false)
      setEditingBanner(null)
      setFormData(defaultFormData)
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка обновления баннера')
    }
  })

  const [deleteBanner] = useMutation(DELETE_HERO_BANNER, {
    onCompleted: () => {
      toast.success('Баннер успешно удален')
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || 'Ошибка удаления баннера')
    }
  })

  const banners: HeroBanner[] = data?.heroBanners || []

  const handleOpenDialog = (banner?: HeroBanner) => {
    if (banner) {
      setEditingBanner(banner)
      setFormData({
        title: banner.title,
        subtitle: banner.subtitle || '',
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl || '',
        isActive: banner.isActive,
        sortOrder: banner.sortOrder
      })
    } else {
      setEditingBanner(null)
      setFormData(defaultFormData)
    }
    setShowDialog(true)
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditingBanner(null)
    setFormData(defaultFormData)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Заголовок обязателен')
      return
    }

    if (!formData.imageUrl.trim()) {
      toast.error('Изображение обязательно')
      return
    }

    if (editingBanner) {
      updateBanner({
        variables: {
          id: editingBanner.id,
          input: formData
        }
      })
    } else {
      createBanner({
        variables: {
          input: formData
        }
      })
    }
  }

  const handleDelete = (banner: HeroBanner) => {
    if (confirm(`Вы уверены, что хотите удалить баннер "${banner.title}"?`)) {
      deleteBanner({
        variables: { id: banner.id }
      })
    }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Баннеры героя</h1>
          <p className="text-gray-600">
            Управление баннерами на главной странице
          </p>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить баннер
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? 'Редактировать баннер' : 'Создать баннер'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Заголовок *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Введите заголовок баннера"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Порядок сортировки</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Подзаголовок</Label>
                <Textarea
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Введите подзаголовок баннера (необязательно)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkUrl">Ссылка</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                  placeholder="https://example.com (необязательно)"
                />
              </div>

              <div className="space-y-2">
                <Label>Изображение *</Label>
                <div className="space-y-2">
                  {formData.imageUrl && (
                    <div className="relative">
                      <img 
                        src={formData.imageUrl} 
                        alt="Превью" 
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  <FileUpload
                    onUpload={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                    accept="image/*"
                    maxSize={5 * 1024 * 1024}
                    disabled={uploading}
                  />
                  {uploading && (
                    <div className="text-sm text-gray-500">Загрузка изображения...</div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Активен</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Отмена
                </Button>
                <Button type="submit" disabled={uploading}>
                  {editingBanner ? 'Обновить' : 'Создать'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего баннеров</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{banners.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {banners.filter(b => b.isActive).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Неактивные</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {banners.filter(b => !b.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Таблица баннеров */}
      <Card>
        <CardHeader>
          <CardTitle>Список баннеров ({banners.length})</CardTitle>
          <CardDescription>
            Управление баннерами на главной странице сайта
          </CardDescription>
        </CardHeader>
        <CardContent>
          {banners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Image className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Нет созданных баннеров</p>
              <Button 
                className="mt-4" 
                onClick={() => handleOpenDialog()}
              >
                Создать первый баннер
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Изображение</TableHead>
                  <TableHead>Заголовок</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Порядок</TableHead>
                  <TableHead>Ссылка</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...banners]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((banner) => (
                    <TableRow key={banner.id}>
                      <TableCell>
                        <img 
                          src={banner.imageUrl} 
                          alt={banner.title}
                          className="w-16 h-10 object-cover rounded border"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{banner.title}</div>
                          {banner.subtitle && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {banner.subtitle}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={banner.isActive ? 'default' : 'secondary'}>
                          {banner.isActive ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </TableCell>
                      <TableCell>{banner.sortOrder}</TableCell>
                      <TableCell>
                        {banner.linkUrl ? (
                          <div className="flex items-center">
                            <ExternalLink className="w-4 h-4 mr-1 text-gray-400" />
                            <span className="text-sm text-blue-600 truncate max-w-xs">
                              {banner.linkUrl}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(banner.createdAt).toLocaleDateString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(banner)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(banner)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 