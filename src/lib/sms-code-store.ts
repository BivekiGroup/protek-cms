import { prisma } from './prisma'

interface SMSCodeEntry {
  phone: string
  code: string
  sessionId: string
  createdAt: Date
  attempts: number
}

class SMSCodeStore {
  private codes: Map<string, SMSCodeEntry> = new Map()
  private readonly maxAttempts = 3
  private readonly codeLifetime = 5 * 60 * 1000 // 5 минут в миллисекундах

  /**
   * Сохранение кода
   */
  async saveCode(phone: string, code: string, sessionId: string): Promise<void> {
    const key = this.getKey(phone, sessionId)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.codeLifetime)

    this.codes.set(key, {
      phone,
      code,
      sessionId,
      createdAt: now,
      attempts: 0
    })

    // Сохраняем в БД
    try {
      await prisma.smsCode.create({
        data: {
          phone,
          code,
          sessionId,
          expiresAt,
          attempts: 0,
          verified: false,
        }
      })
      console.log(`SMS код сохранен в БД для ${phone}, sessionId: ${sessionId}`)
    } catch (error) {
      console.error('Ошибка сохранения SMS кода в БД:', error)
    }

    console.log(`SMS код сохранен для ${phone}, sessionId: ${sessionId}`)

    // Автоматическая очистка через время жизни кода
    setTimeout(() => {
      this.codes.delete(key)
      console.log(`SMS код удален для ${phone}, sessionId: ${sessionId} (истек срок)`)
    }, this.codeLifetime)
  }

  /**
   * Проверка кода
   */
  async verifyCode(phone: string, code: string, sessionId: string): Promise<{
    valid: boolean
    error?: string
    attemptsLeft?: number
  }> {
    const key = this.getKey(phone, sessionId)
    const entry = this.codes.get(key)

    if (!entry) {
      return {
        valid: false,
        error: 'Код не найден или истек срок действия'
      }
    }

    // Проверяем время жизни кода
    const now = new Date()
    const elapsed = now.getTime() - entry.createdAt.getTime()

    if (elapsed > this.codeLifetime) {
      this.codes.delete(key)
      return {
        valid: false,
        error: 'Код истек, запросите новый'
      }
    }

    // Увеличиваем счетчик попыток
    entry.attempts++

    // Обновляем попытки в БД
    try {
      await prisma.smsCode.updateMany({
        where: {
          phone,
          sessionId,
          verified: false,
        },
        data: {
          attempts: entry.attempts,
        }
      })
    } catch (error) {
      console.error('Ошибка обновления попыток в БД:', error)
    }

    // Проверяем количество попыток
    if (entry.attempts > this.maxAttempts) {
      this.codes.delete(key)
      return {
        valid: false,
        error: 'Превышено количество попыток ввода кода'
      }
    }

    // Проверяем сам код
    if (entry.code !== code) {
      const attemptsLeft = this.maxAttempts - entry.attempts
      return {
        valid: false,
        error: 'Неверный код',
        attemptsLeft
      }
    }

    // Код верный, удаляем из хранилища и обновляем в БД
    this.codes.delete(key)

    // Отмечаем код как верифицированный в БД
    try {
      await prisma.smsCode.updateMany({
        where: {
          phone,
          sessionId,
          verified: false,
        },
        data: {
          verified: true,
        }
      })
    } catch (error) {
      console.error('Ошибка обновления статуса в БД:', error)
    }

    console.log(`SMS код успешно верифицирован для ${phone}, sessionId: ${sessionId}`)

    return { valid: true }
  }

  /**
   * Проверка существования активного кода
   */
  hasActiveCode(phone: string, sessionId: string): boolean {
    const key = this.getKey(phone, sessionId)
    const entry = this.codes.get(key)
    
    if (!entry) {
      return false
    }

    // Проверяем время жизни
    const now = new Date()
    const elapsed = now.getTime() - entry.createdAt.getTime()
    
    if (elapsed > this.codeLifetime) {
      this.codes.delete(key)
      return false
    }

    return true
  }

  /**
   * Получение времени до истечения кода
   */
  getCodeTTL(phone: string, sessionId: string): number {
    const key = this.getKey(phone, sessionId)
    const entry = this.codes.get(key)
    
    if (!entry) {
      return 0
    }

    const now = new Date()
    const elapsed = now.getTime() - entry.createdAt.getTime()
    const remaining = this.codeLifetime - elapsed
    
    return Math.max(0, Math.floor(remaining / 1000)) // возвращаем секунды
  }

  /**
   * Очистка истекших кодов
   */
  cleanup(): number {
    const now = new Date()
    let cleaned = 0

    for (const [key, entry] of this.codes.entries()) {
      const elapsed = now.getTime() - entry.createdAt.getTime()
      
      if (elapsed > this.codeLifetime) {
        this.codes.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`Очищено ${cleaned} истекших SMS кодов`)
    }

    return cleaned
  }

  /**
   * Получение статистики
   */
  getStats(): {
    totalCodes: number
    activeCodes: number
    expiredCodes: number
  } {
    const now = new Date()
    let activeCodes = 0
    let expiredCodes = 0

    for (const entry of this.codes.values()) {
      const elapsed = now.getTime() - entry.createdAt.getTime()
      
      if (elapsed > this.codeLifetime) {
        expiredCodes++
      } else {
        activeCodes++
      }
    }

    return {
      totalCodes: this.codes.size,
      activeCodes,
      expiredCodes
    }
  }

  /**
   * Генерация ключа для хранения
   */
  private getKey(phone: string, sessionId: string): string {
    // Нормализуем номер телефона для ключа
    const normalizedPhone = phone.replace(/\D/g, '')
    return `${normalizedPhone}_${sessionId}`
  }
}

// Создаем глобальный экземпляр хранилища
const smsCodeStore = new SMSCodeStore()

// Запускаем периодическую очистку каждые 5 минут
setInterval(() => {
  smsCodeStore.cleanup()
}, 5 * 60 * 1000)

export { SMSCodeStore, smsCodeStore } 