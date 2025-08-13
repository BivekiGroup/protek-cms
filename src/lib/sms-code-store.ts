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
  saveCode(phone: string, code: string, sessionId: string): void {
    const key = this.getKey(phone, sessionId)
    
    this.codes.set(key, {
      phone,
      code,
      sessionId,
      createdAt: new Date(),
      attempts: 0
    })

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
  verifyCode(phone: string, code: string, sessionId: string): { 
    valid: boolean 
    error?: string 
    attemptsLeft?: number 
  } {
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

    // Код верный, удаляем из хранилища
    this.codes.delete(key)
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