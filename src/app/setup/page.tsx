"use client"

import { useRouter } from 'next/navigation'
import { CreateFirstUser } from '@/components/setup/CreateFirstUser'

export default function SetupPage() {
  const router = useRouter()

  const handleSuccess = () => {
    // После успешного создания пользователя перенаправляем на страницу входа
    router.push('/login')
  }

  return <CreateFirstUser onSuccess={handleSuccess} />
} 