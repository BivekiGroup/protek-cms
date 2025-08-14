"use client"

import Link from 'next/link'
import { useQuery, useMutation } from '@apollo/client'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { gql } from '@apollo/client'

const GET_SEO_LIST = gql`
  query SeoPageConfigs($search: String, $skip: Int, $take: Int) {
    seoPageConfigs(search: $search, skip: $skip, take: $take) {
      id
      pattern
      matchType
      title
      noIndex
      noFollow
      updatedAt
    }
    seoPageConfigsCount(search: $search)
  }
`

const DELETE_SEO = gql`
  mutation DeleteSeo($id: ID!) {
    deleteSeoPageConfig(id: $id)
  }
`

export default function SeoListPage() {
  const [search, setSearch] = useState('')
  const { data, loading, refetch } = useQuery(GET_SEO_LIST, { variables: { search, skip: 0, take: 50 } })
  const [deleteSeo] = useMutation(DELETE_SEO, { onCompleted: () => refetch() })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">SEO-конфигурации</h1>
        <Button asChild>
          <Link href="/dashboard/seo/new">Новая запись</Link>
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Input placeholder="Поиск по пути/тайтлу..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant="secondary" onClick={() => refetch({ search, skip: 0, take: 50 })}>Искать</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Путь/шаблон</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>noindex/nofollow</TableHead>
            <TableHead className="w-40">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!loading && data?.seoPageConfigs?.map((row: any) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-sm">{row.pattern}</TableCell>
              <TableCell>{row.matchType}</TableCell>
              <TableCell className="truncate max-w-[360px]">{row.title || '-'}</TableCell>
              <TableCell>{row.noIndex ? 'noindex' : 'index'} / {row.noFollow ? 'nofollow' : 'follow'}</TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="secondary" asChild><Link href={`/dashboard/seo/${row.id}`}>Редактировать</Link></Button>
                <Button size="sm" variant="destructive" onClick={() => deleteSeo({ variables: { id: row.id } })}>Удалить</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

