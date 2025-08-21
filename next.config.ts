/** @type {import('next').NextConfig} */
const nextConfig = {
  // Оптимизация для Docker
  output: 'standalone',
  
  // Исключаем favicon из обработки как страницу
  async rewrites() {
    return [];
  },
  
  // Настройки для CSS (optimizeCss отключен из-за проблем с critters)
  // experimental: {
  //   optimizeCss: true,
  // },
  
  // Настройки для статических файлов
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  
  // Настройки для сборки
  // swcMinify удален в Next.js 15 (включен по умолчанию)
  
  // Настройки для изображений
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  
  // Настройки webpack для CSS и server-only packages
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Убеждаемся, что CSS правильно обрабатывается
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups.styles = {
        name: 'styles',
        test: /\.(css|scss)$/,
        chunks: 'all',
        enforce: true,
      };
    }
    
    // Исключаем server-only пакеты из client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        pg: false,
        'pg-native': false,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    // Make pg external for all environments
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        pg: 'commonjs pg',
        'pg-native': 'commonjs pg-native'
      });
    }
    
    return config;
  },
};

export default nextConfig;
