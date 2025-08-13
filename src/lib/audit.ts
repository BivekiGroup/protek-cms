import { prisma } from './prisma'

export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  AVATAR_UPLOAD = 'AVATAR_UPLOAD',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  CATEGORY_CREATE = 'CATEGORY_CREATE',
  CATEGORY_UPDATE = 'CATEGORY_UPDATE',
  CATEGORY_DELETE = 'CATEGORY_DELETE',
  PRODUCT_CREATE = 'PRODUCT_CREATE',
  PRODUCT_UPDATE = 'PRODUCT_UPDATE',
  PRODUCT_DELETE = 'PRODUCT_DELETE',
}

interface AuditLogData {
  userId: string
  action: AuditAction
  details?: string
  ipAddress?: string
  userAgent?: string
}

export const createAuditLog = async (data: AuditLogData) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }
    })
  } catch (error) {
    console.error('Ошибка создания лога аудита:', error)
    // Не прерываем основную операцию из-за ошибки логирования
  }
}

export const getClientInfo = (headers: Headers) => {
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const ipAddress = forwarded?.split(',')[0] || realIp || headers.get('x-client-ip') || 'unknown'
  const userAgent = headers.get('user-agent') || 'unknown'
  
  return { ipAddress, userAgent }
}

export const getActionDescription = (action: AuditAction, details?: string): string => {
  switch (action) {
    case AuditAction.USER_LOGIN:
      return 'Вход в систему'
    case AuditAction.USER_LOGOUT:
      return 'Выход из системы'
    case AuditAction.USER_CREATE:
      return `Создание пользователя${details ? `: ${details}` : ''}`
    case AuditAction.USER_UPDATE:
      return `Обновление пользователя${details ? `: ${details}` : ''}`
    case AuditAction.USER_DELETE:
      return `Удаление пользователя${details ? `: ${details}` : ''}`
    case AuditAction.PASSWORD_CHANGE:
      return `Смена пароля${details ? `: ${details}` : ''}`
    case AuditAction.AVATAR_UPLOAD:
      return 'Загрузка аватара'
    case AuditAction.PROFILE_UPDATE:
      return 'Обновление профиля'
    case AuditAction.CATEGORY_CREATE:
      return `Создание категории${details ? `: ${details}` : ''}`
    case AuditAction.CATEGORY_UPDATE:
      return `Обновление категории${details ? `: ${details}` : ''}`
    case AuditAction.CATEGORY_DELETE:
      return `Удаление категории${details ? `: ${details}` : ''}`
    case AuditAction.PRODUCT_CREATE:
      return `Создание товара${details ? `: ${details}` : ''}`
    case AuditAction.PRODUCT_UPDATE:
      return `Обновление товара${details ? `: ${details}` : ''}`
    case AuditAction.PRODUCT_DELETE:
      return `Удаление товара${details ? `: ${details}` : ''}`
    default:
      return 'Неизвестное действие'
  }
} 