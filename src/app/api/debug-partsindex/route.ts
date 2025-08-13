import { NextRequest, NextResponse } from 'next/server';
import { partsIndexService } from '@/lib/partsindex-service';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const prefix = url.searchParams.get('prefix');

    switch (action) {
      case 'stats':
        // Возвращаем статистику кэша
        const stats = partsIndexService.getCacheStats();
        return NextResponse.json({
          success: true,
          data: {
            ...stats,
            formattedEntries: stats.entries.map(entry => ({
              ...entry,
              sizeKB: Math.round(entry.size / 1024 * 100) / 100,
              ageMinutes: Math.round(entry.age / (1000 * 60) * 100) / 100,
              ttlMinutes: Math.round(entry.ttl / (1000 * 60) * 100) / 100,
              isExpired: entry.age > entry.ttl
            }))
          }
        });

      case 'clear':
        if (prefix) {
          partsIndexService.clearCacheByPrefix(prefix);
          return NextResponse.json({
            success: true,
            message: `Кэш с префиксом "${prefix}" очищен`
          });
        } else {
          partsIndexService.clearCache();
          return NextResponse.json({
            success: true,
            message: 'Весь кэш PartsIndex очищен'
          });
        }

      case 'test':
        // Тестовый запрос для проверки работы кэша
        const catalogs = await partsIndexService.getCatalogs('ru');
        return NextResponse.json({
          success: true,
          data: {
            catalogsCount: catalogs.length,
            catalogs: catalogs.slice(0, 3).map(c => ({ id: c.id, name: c.name }))
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Неизвестное действие. Доступные: stats, clear, test'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Ошибка в debug-partsindex API:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, catalogId, lang = 'ru' } = body;

    switch (action) {
      case 'preload':
        // Предзагрузка данных в кэш
        console.log('🔄 Предзагрузка данных PartsIndex в кэш...');
        
        const catalogs = await partsIndexService.getCatalogs(lang);
        console.log(`✅ Загружено ${catalogs.length} каталогов`);
        
        if (catalogId) {
          // Загружаем группы конкретного каталога
          const groups = await partsIndexService.getCatalogGroups(catalogId, lang);
          console.log(`✅ Загружено ${groups.length} групп для каталога ${catalogId}`);
          
          return NextResponse.json({
            success: true,
            data: {
              catalogsCount: catalogs.length,
              groupsCount: groups.length,
              catalogId
            }
          });
        } else {
          // Загружаем полную структуру
          const categoriesWithGroups = await partsIndexService.getCategoriesWithGroups(lang);
          const totalGroups = categoriesWithGroups.reduce((acc, cat) => acc + cat.groups.length, 0);
          
          return NextResponse.json({
            success: true,
            data: {
              catalogsCount: catalogs.length,
              categoriesWithGroupsCount: categoriesWithGroups.length,
              totalGroups
            }
          });
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Неизвестное действие. Доступные: preload'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Ошибка в debug-partsindex POST API:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
} 