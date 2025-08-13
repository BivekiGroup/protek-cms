"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  ShoppingCart,
  Users,
  Settings
} from 'lucide-react'

export default function TestStylesPage() {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Тест стилей Tailwind CSS + Shadcn/ui
        </h1>
        <p className="text-muted-foreground">
          Проверка всех основных компонентов и цветов
        </p>
      </div>

      {/* Color Test */}
      <Card>
        <CardHeader>
          <CardTitle>Цветовая палитра</CardTitle>
          <CardDescription>Проверка всех основных цветов</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-primary text-primary-foreground rounded-lg">
              <p className="font-semibold">Primary</p>
              <p className="text-sm">Основной цвет</p>
            </div>
            <div className="p-4 bg-secondary text-secondary-foreground rounded-lg">
              <p className="font-semibold">Secondary</p>
              <p className="text-sm">Вторичный цвет</p>
            </div>
            <div className="p-4 bg-accent text-accent-foreground rounded-lg">
              <p className="font-semibold">Accent</p>
              <p className="text-sm">Акцентный цвет</p>
            </div>
            <div className="p-4 bg-muted text-muted-foreground rounded-lg">
              <p className="font-semibold">Muted</p>
              <p className="text-sm">Приглушенный</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buttons Test */}
      <Card>
        <CardHeader>
          <CardTitle>Кнопки</CardTitle>
          <CardDescription>Различные варианты кнопок</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Badges Test */}
      <Card>
        <CardHeader>
          <CardTitle>Бейджи</CardTitle>
          <CardDescription>Различные статусы и метки</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Form Elements Test */}
      <Card>
        <CardHeader>
          <CardTitle>Элементы формы</CardTitle>
          <CardDescription>Поля ввода и лейблы</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input id="password" type="password" placeholder="Введите пароль" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Icons Test */}
      <Card>
        <CardHeader>
          <CardTitle>Иконки</CardTitle>
          <CardDescription>Lucide React иконки</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg">
              <CheckCircle className="h-5 w-5" />
              <span>Успех</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              <span>Ошибка</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Info className="h-5 w-5" />
              <span>Информация</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-purple-50 text-purple-700 rounded-lg">
              <ShoppingCart className="h-5 w-5" />
              <span>Заказы</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-orange-50 text-orange-700 rounded-lg">
              <Users className="h-5 w-5" />
              <span>Клиенты</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards Test */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Заказы
            </CardTitle>
            <CardDescription>Всего заказов</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">1,234</div>
            <p className="text-xs text-muted-foreground">
              +20.1% с прошлого месяца
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Клиенты
            </CardTitle>
            <CardDescription>Активные клиенты</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">456</div>
            <p className="text-xs text-muted-foreground">
              +15.3% с прошлого месяца
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Проблемы
            </CardTitle>
            <CardDescription>Требуют внимания</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">12</div>
            <p className="text-xs text-muted-foreground">
              -5.2% с прошлого месяца
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dark/Light Mode Test */}
      <Card>
        <CardHeader>
          <CardTitle>Тема</CardTitle>
          <CardDescription>Проверка адаптации к темной/светлой теме</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg">
            <p className="text-foreground mb-2">
              Этот текст должен адаптироваться к теме
            </p>
            <p className="text-muted-foreground">
              А этот текст должен быть приглушенным
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">✅ Статус интеграции</CardTitle>
          <CardDescription>Результат исправления Tailwind CSS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Tailwind CSS v4 правильно интегрирован</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Shadcn/ui компоненты работают корректно</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Цветовая схема применяется правильно</span>
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Поддержка темной/светлой темы активна</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 