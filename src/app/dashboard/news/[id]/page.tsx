"use client"

import { useParams } from 'next/navigation'
import { useQuery } from '@apollo/client'
import { GET_NEWS_BY_ID } from '@/lib/graphql/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import NewsForm from '@/components/news/NewsForm'

export default function NewsEditPage() {
  const params = useParams()
  const id = params?.id as string
  const { data, loading, error } = useQuery(GET_NEWS_BY_ID, { variables: { id }, skip: !id })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Редактировать новость</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="text-red-600">{error.message}</div>
          ) : data?.news ? (
            <NewsForm initial={{ ...data.news, publishedAt: data.news.publishedAt }} />
          ) : (
            <div>Новость не найдена</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

