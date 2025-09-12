"use client"

import Link from 'next/link'
import { useMutation, useQuery } from '@apollo/client'
import { GET_NEWS_LIST } from '@/lib/graphql/queries'
import { DELETE_NEWS } from '@/lib/graphql/mutations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function NewsListPage() {
  const { data, loading, error, refetch } = useQuery(GET_NEWS_LIST, {
    variables: { limit: 50, offset: 0, publishedOnly: false },
    fetchPolicy: 'cache-and-network'
  })

  const [deleteNews] = useMutation(DELETE_NEWS, {
    onCompleted: () => {
      toast.success('Новость удалена')
      refetch()
    },
    onError: (e) => toast.error(e.message || 'Ошибка удаления')
  })

  const items = data?.newsList || []

  const onDelete = (id: string, title: string) => {
    if (confirm(`Удалить новость «${title}»?`)) {
      deleteNews({ variables: { id } })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error.message}</div>
        <Button onClick={() => refetch()}>Повторить</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Новости</h1>
          <p className="text-gray-600">Управляйте новостями и акциями на сайте</p>
        </div>
        <Link href="/dashboard/news/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Создать новость
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список новостей ({items.length})</CardTitle>
          <CardDescription>Последние добавленные новости</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Пока нет новостей</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заголовок</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Опубликовано</TableHead>
                  <TableHead>Создано</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...items].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((n: any) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <div className="font-medium">{n.title}</div>
                      <div className="text-xs text-gray-500">/{n.slug}</div>
                    </TableCell>
                    <TableCell>{n.category}</TableCell>
                    <TableCell>
                      <Badge variant={n.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                        {n.status === 'PUBLISHED' ? 'Опубликовано' : 'Черновик'}
                      </Badge>
                    </TableCell>
                    <TableCell>{n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('ru-RU') : '—'}</TableCell>
                    <TableCell>{new Date(n.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/news/${n.id}`}>
                          <Button size="sm" variant="outline"><Edit className="w-4 h-4" /></Button>
                        </Link>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => onDelete(n.id, n.title)}>
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

