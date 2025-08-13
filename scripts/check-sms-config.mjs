#!/usr/bin/env node

import { readFileSync } from 'fs'
import { join } from 'path'

// Функция для загрузки .env файла
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf8')
    
    envContent.split('\n').forEach(line => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        const value = valueParts.join('=').replace(/^["']|["']$/g, '')
        if (key && value) {
          process.env[key] = value
        }
      }
    })
  } catch (error) {
    console.warn('⚠️  Не удалось загрузить .env файл, используем переменные окружения')
  }
}

// Загружаем переменные окружения
loadEnv()

console.log('🔍 Проверка конфигурации SMS API...')

const requiredSmsVars = [
  'BEELINE_SMS_USER',
  'BEELINE_SMS_PASS'
]

const optionalSmsVars = [
  'BEELINE_SMS_SENDER'
]

let hasErrors = false

// Проверяем обязательные переменные
requiredSmsVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Отсутствует обязательная переменная: ${varName}`)
    hasErrors = true
  } else {
    console.log(`✅ ${varName}: настроен`)
  }
})

// Проверяем опциональные переменные
optionalSmsVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`⚠️  Опциональная переменная отсутствует: ${varName} (будет использовано значение по умолчанию)`)
  } else {
    console.log(`✅ ${varName}: ${process.env[varName]}`)
  }
})

// Проверяем формат логина (должен быть числовым)
const smsUser = process.env.BEELINE_SMS_USER
if (smsUser && !/^\d+$/.test(smsUser)) {
  console.error(`❌ BEELINE_SMS_USER должен быть числовым: ${smsUser}`)
  hasErrors = true
}

// Проверяем длину пароля
const smsPass = process.env.BEELINE_SMS_PASS
if (smsPass && smsPass.length < 6) {
  console.error(`❌ BEELINE_SMS_PASS слишком короткий (минимум 6 символов)`)
  hasErrors = true
}

// Проверяем, находимся ли мы в Docker окружении
const isDocker = process.env.DOCKER_BUILD === 'true' || 
                process.env.CI === 'true' || 
                !process.env.BEELINE_SMS_USER

if (hasErrors) {
  if (isDocker) {
    console.warn('\n⚠️  SMS переменные не настроены во время сборки')
    console.warn('📝 Убедитесь, что они будут доступны во время выполнения')
    process.exit(0) // Не блокируем сборку
  } else {
    console.error('\n❌ Обнаружены ошибки в конфигурации SMS API')
    process.exit(1)
  }
} else {
  console.log('\n✅ Конфигурация SMS API корректна')
  process.exit(0)
} 