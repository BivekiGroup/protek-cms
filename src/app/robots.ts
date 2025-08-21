import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
      {
        userAgent: 'Googlebot',
        disallow: '/',
      },
      {
        userAgent: 'Bingbot',
        disallow: '/',
      },
      {
        userAgent: 'Yandex',
        disallow: '/',
      },
    ],
    sitemap: 'https://admin.protekauto.ru/sitemap.xml',
  }
} 