"use client"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import NewsForm from '@/components/news/NewsForm'

export default function NewsCreatePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Создать новость</CardTitle>
        </CardHeader>
        <CardContent>
          <NewsForm />
        </CardContent>
      </Card>
    </div>
  )
}
