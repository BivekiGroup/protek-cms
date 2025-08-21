import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ru-1',
  endpoint: process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true, // Необходимо для совместимости с некоторыми S3-совместимыми сервисами
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'be184fd4-protekauto'

export interface UploadFileParams {
  file: File
  key: string
  contentType?: string
}

export interface UploadResult {
  key: string
  url: string
  size: number
}

// Загрузка файла в S3
export const uploadFile = async ({ file, key, contentType }: UploadFileParams): Promise<UploadResult> => {
  const buffer = Buffer.from(await file.arrayBuffer())
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || file.type,
    ACL: 'public-read', // Делаем файл публично доступным
  })

  await s3Client.send(command)

  const url = `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`

  return {
    key,
    url,
    size: file.size,
  }
}

// Загрузка буфера в S3 (для экспорта)
export const uploadBuffer = async (buffer: Buffer, key: string, contentType: string): Promise<UploadResult> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read', // Делаем файл публично доступным
  })

  await s3Client.send(command)

  const url = `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`

  return {
    key,
    url,
    size: buffer.length,
  }
}

// Удаление файла из S3
export const deleteFile = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
}

// Получение подписанного URL для временного доступа к файлу
export const getSignedDownloadUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  })

  return await getSignedUrl(s3Client, command, { expiresIn })
}

// Генерация уникального ключа для файла
export const generateFileKey = (originalName: string, prefix: string = ''): string => {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  const baseName = originalName.split('.').slice(0, -1).join('.')
  
  const sanitizedBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${prefix}${prefix ? '/' : ''}${timestamp}-${randomString}-${sanitizedBaseName}.${extension}`
}

// Проверка подключения к S3
export const testS3Connection = async (): Promise<boolean> => {
  try {
    // Пытаемся получить список объектов в бакете (первые 1)
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3')
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      MaxKeys: 1,
    })

    await s3Client.send(command)
    return true
  } catch (error) {
    console.error('Ошибка подключения к S3:', error)
    return false
  }
} 