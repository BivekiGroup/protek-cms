import { transliterate } from 'transliteration'

/**
 * Генерирует логин из телефона и ФИО
 * Формат: ИмяФ_последние4цифрыТелефона
 * Например: IvanI_1234
 */
export function generateLogin(phone: string, fullName: string): string {
  // Извлекаем имя и первую букву фамилии
  const nameParts = fullName.trim().split(/\s+/)
  const firstName = nameParts[0] || ''
  const lastName = nameParts[1] || ''

  // Транслитерируем
  const firstNameLatin = transliterate(firstName)
  const lastNameInitial = lastName ? transliterate(lastName.charAt(0)) : ''

  // Берем последние 4 цифры телефона
  const phoneDigits = phone.replace(/\D/g, '')
  const lastFourDigits = phoneDigits.slice(-4)

  // Формируем логин
  const login = `${firstNameLatin}${lastNameInitial}_${lastFourDigits}`

  return login
}

/**
 * Генерирует случайный пароль
 * 12 символов: заглавные, строчные буквы, цифры и спецсимволы
 */
export function generatePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const special = '!@#$%^&*'

  const allChars = uppercase + lowercase + digits + special

  // Гарантируем наличие хотя бы по одному символу каждого типа
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += digits[Math.floor(Math.random() * digits.length)]
  password += special[Math.floor(Math.random() * special.length)]

  // Заполняем остальные позиции случайными символами
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Перемешиваем символы
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
