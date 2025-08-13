import axios from 'axios';

// Интерфейсы для типизации данных Parts Index API
export interface PartsIndexCatalog {
  id: string;
  name: string;
  image: string;
}

export interface PartsIndexGroup {
  id: string;
  name: string;
  image?: string;
  subgroups: PartsIndexGroup[];
  entityNames: { id: string; name: string; }[];
}

export interface PartsIndexGroupResponse {
  id: string;
  name: string;
  lang: string;
  image: string;
  lft: number;
  rgt: number;
  entityNames: { id: string; name: string; }[];
  subgroups: PartsIndexGroup[];
}

export interface PartsIndexEntity {
  id: string;
  code: string;
  name: {
    id: string;
    name: string;
  };
  originalName: string;
  brand: {
    id: string;
    name: string;
  };
  barcodes: string[];
  parameters: {
    id: string;
    title: string;
    code: string;
    type: string;
    values: {
      id: string;
      value: string;
      title?: string;
    }[];
  }[];
  images: string[];
}

export interface PartsIndexEntitiesResponse {
  pagination: {
    limit: number;
    page: {
      prev: number | null;
      current: number;
      next: number | null;
    };
  };
  list: PartsIndexEntity[];
  catalog: {
    id: string;
    name: string;
    image: string;
    groups: PartsIndexGroup[];
  };
  subgroup: {
    id: string;
    name: string;
  } | null;
}

export interface PartsIndexParamsResponse {
  list: {
    id: string;
    name: string;
    code: string;
    type: 'range' | 'dropdown';
    values: {
      id: string;
      value: string;
      title?: string;
      available: boolean;
    }[];
  }[];
}

export interface PartsIndexEntityInfoResponse {
  list: PartsIndexEntityDetail[];
}

export interface PartsIndexEntityDetail {
  id: string;
  catalog: {
    id: string;
    name: string;
  };
  subgroups: {
    id: string;
    name: string;
  }[];
  name: {
    id: string;
    name: string;
  };
  originalName: string;
  code: string;
  barcodes: string[];
  brand: {
    id: string;
    name: string;
  };
  description: string;
  parameters: {
    id: string;
    name: string;
    params: {
      id: string;
      code: string;
      title: string;
      type: string;
      values: {
        id: string;
        value: string;
      }[];
    }[];
  }[];
  images: string[];
  links: {
    partId: string;
    code: string;
    brand: {
      id: string;
      name: string;
    };
    parameters: {
      id: string;
      name: string;
      unit: string;
      value: string;
    }[];
  }[];
}

// Интерфейс для кэша
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // время жизни в миллисекундах
}

class PartsIndexService {
  private baseHost = process.env.PARTSAPI_URL || 'https://api.parts-index.com';
  private baseURL = `${this.baseHost}/v1`;
  private apiKey = process.env.PARTSAPI_KEY || 'PI-E1C0ADB7-E4A8-4960-94A0-4D9C0A074DAE';
  private enabled = Boolean(process.env.PARTSAPI_URL) || process.env.PARTSINDEX_ENABLED === 'true';
  
  // Простой in-memory кэш
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 минут
  private readonly CATALOGS_TTL = 24 * 60 * 60 * 1000; // 24 часа для каталогов
  private readonly GROUPS_TTL = 24 * 60 * 60 * 1000; // 24 часа для групп
  private readonly ENTITIES_TTL = 10 * 60 * 1000; // 10 минут для товаров
  private readonly PARAMS_TTL = 60 * 60 * 1000; // 1 час для параметров

  // Проверяем актуальность кэша
  private isValidCacheEntry<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  // Получаем данные из кэша
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && this.isValidCacheEntry(entry)) {
      console.log(`🔥 Используем кэш для ключа: ${key}`);
      return entry.data;
    }
    if (entry) {
      console.log(`🗑️ Удаляем устаревший кэш для ключа: ${key}`);
      this.cache.delete(key);
    }
    return null;
  }

  // Сохраняем данные в кэш
  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    console.log(`💾 Сохранено в кэш: ${key} (TTL: ${ttl}ms)`);
  }

  // Очистка кэша (для административных целей)
  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Кэш PartsIndex полностью очищен');
  }

  // Очистка конкретного типа кэша
  public clearCacheByPrefix(prefix: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Очищен кэш PartsIndex с префиксом: ${prefix} (${keysToDelete.length} записей)`);
  }

  // Статистика кэша
  public getCacheStats(): { size: number; entries: { key: string; size: number; ttl: number; age: number }[] } {
    const entries: { key: string; size: number; ttl: number; age: number }[] = [];
    
    this.cache.forEach((entry, key) => {
      const size = JSON.stringify(entry.data).length;
      const age = Date.now() - entry.timestamp;
      entries.push({ key, size, ttl: entry.ttl, age });
    });

    return {
      size: this.cache.size,
      entries: entries.sort((a, b) => b.size - a.size) // Сортируем по размеру
    };
  }

  // Получить список каталогов
  async getCatalogs(lang: 'ru' | 'en' = 'ru'): Promise<PartsIndexCatalog[]> {
    if (!this.enabled) {
      // Disabled: return empty to avoid external calls during local dev
      return [];
    }
    const cacheKey = `catalogs_${lang}`;
    
    // Проверяем кэш
    const cached = this.getFromCache<PartsIndexCatalog[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('🔍 PartsIndex запрос каталогов:', { lang });
      
      const response = await axios.get(`${this.baseURL}/catalogs`, {
        params: { lang },
        headers: {
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ PartsIndex каталоги получены:', response.data?.list?.length || 0);

      if (!response.data?.list || !Array.isArray(response.data.list)) {
        console.warn('⚠️ PartsIndex вернул некорректные данные для каталогов');
        return [];
      }

      const catalogs = response.data.list;
      // Сохраняем в кэш на 1 час
      this.setCache(cacheKey, catalogs, this.CATALOGS_TTL);
      
      return catalogs;
    } catch (error) {
      console.error('❌ Ошибка запроса PartsIndex getCatalogs:', error);
      return [];
    }
  }

  // Получить группы каталога
  async getCatalogGroups(catalogId: string, lang: 'ru' | 'en' = 'ru'): Promise<PartsIndexGroup[]> {
    if (!this.enabled) {
      return [];
    }
    const cacheKey = `groups_${catalogId}_${lang}`;
    
    // Проверяем кэш
    const cached = this.getFromCache<PartsIndexGroup[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('🔍 PartsIndex запрос групп каталога:', { catalogId, lang });
      
      const response = await axios.get(`${this.baseURL}/catalogs/${catalogId}/groups`, {
        params: { lang },
        headers: {
          'Accept': 'application/json',
          'Authorization': this.apiKey
        },
        timeout: 10000
      });

      console.log('✅ PartsIndex группы получены');

      // API возвращает объект, а не массив
      const groupData: PartsIndexGroupResponse = response.data;
      
      if (!groupData || !groupData.subgroups) {
        console.warn('⚠️ PartsIndex вернул некорректные данные для групп');
        return [];
      }

      let groups: PartsIndexGroup[];

      // Если есть подгруппы, возвращаем их
      if (groupData.subgroups.length > 0) {
        console.log('📁 Найдено подгрупп:', groupData.subgroups.length);
        groups = groupData.subgroups;
      } else {
        // Если подгрупп нет, создаем группу из самого каталога
        console.log('📝 Подгрупп нет, возвращаем главную группу');
        groups = [{
          id: groupData.id,
          name: groupData.name,
          image: groupData.image,
          subgroups: [],
          entityNames: groupData.entityNames
        }];
      }

      // Сохраняем в кэш на 24 часа
      this.setCache(cacheKey, groups, this.GROUPS_TTL);
      
      return groups;
    } catch (error) {
      console.error('❌ Ошибка запроса PartsIndex getCatalogGroups:', error);
      return [];
    }
  }

  // Новый метод: получить ВСЕ товары каталога (с пагинацией)
  async getAllCatalogEntities(
    catalogId: string,
    groupId: string,
    options: {
      lang?: 'ru' | 'en';
      q?: string;
      engineId?: string;
      generationId?: string;
      params?: Record<string, any>;
      maxItems?: number;
    } = {}
  ): Promise<PartsIndexEntity[]> {
    const { 
      lang = 'ru', 
      q, 
      engineId, 
      generationId, 
      params,
      maxItems = 10000
    } = options;

    try {
      if (!this.enabled) {
        return [];
      }
      console.log('🔍 PartsIndex запрос ВСЕХ товаров каталога:', { 
        catalogId, 
        groupId, 
        lang, 
        q,
        maxItems
      });

      const allEntities: PartsIndexEntity[] = [];
      let currentPage = 1;
      const itemsPerPage = 100; // Увеличиваем размер страницы для эффективности
      let hasMorePages = true;

      while (hasMorePages && allEntities.length < maxItems) {
        const response = await this.getCatalogEntities(catalogId, groupId, {
          lang,
          limit: itemsPerPage,
          page: currentPage,
          q,
          engineId,
          generationId,
          params
        });

        if (!response || !response.list || response.list.length === 0) {
          hasMorePages = false;
          break;
        }

        allEntities.push(...response.list);
        
        console.log(`📄 Страница ${currentPage}: получено ${response.list.length} товаров, всего: ${allEntities.length}`);

        // Проверяем, есть ли следующая страница
        hasMorePages = response.pagination && response.pagination.page.next !== null && response.list.length === itemsPerPage;
        currentPage++;

        // Защита от бесконечного цикла
        if (currentPage > 100) {
          console.warn('⚠️ Достигнут лимит страниц (100), прерываем загрузку');
          break;
        }

        // Небольшая задержка между запросами, чтобы не перегружать API
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ PartsIndex получено всего товаров: ${allEntities.length}`);
      return allEntities;

    } catch (error) {
      console.error('❌ Ошибка получения всех товаров PartsIndex:', error);
      return [];
    }
  }

  // Новый метод: получить товары каталога
  async getCatalogEntities(
    catalogId: string,
    groupId: string,
    options: {
      lang?: 'ru' | 'en';
      limit?: number;
      page?: number;
      q?: string;
      engineId?: string;
      generationId?: string;
      params?: Record<string, any>;
    } = {}
  ): Promise<PartsIndexEntitiesResponse | null> {
    const { 
      lang = 'ru', 
      limit = 25, 
      page = 1, 
      q, 
      engineId, 
      generationId, 
      params 
    } = options;

    if (!this.enabled) {
      return null;
    }

    // Создаем ключ кэша на основе всех параметров
    const cacheKey = `entities_${catalogId}_${groupId}_${lang}_${limit}_${page}_${q || 'no-query'}_${engineId || 'no-engine'}_${generationId || 'no-generation'}_${JSON.stringify(params || {})}`;
    
    // Проверяем кэш (кэшируем товары на короткое время)
    const cached = this.getFromCache<PartsIndexEntitiesResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('🔍 PartsIndex запрос товаров каталога:', { 
        catalogId, 
        groupId, 
        lang, 
        limit, 
        page, 
        q 
      });

      const requestParams: any = {
        lang,
        limit,
        page,
        groupId, // groupId теперь обязательный
      };

      // Добавляем поисковый запрос если есть
      if (q && q.trim()) {
        requestParams.q = q.trim();
      }

      // Добавляем параметры автомобиля если есть
      if (engineId) {
        requestParams['car[engineId]'] = engineId;
      }
      if (generationId) {
        requestParams['car[generationId]'] = generationId;
      }

      // Добавляем дополнительные параметры фильтрации
      if (params) {
        Object.keys(params).forEach(key => {
          requestParams[`params[${key}]`] = params[key];
        });
      }

      const response = await axios.get(`${this.baseURL}/catalogs/${catalogId}/entities`, {
        params: requestParams,
        headers: {
          'Accept': 'application/json',
          'Authorization': this.apiKey
        },
        timeout: 15000
      });

      console.log('✅ PartsIndex товары получены:', response.data?.list?.length || 0);

      if (!response.data || !response.data.list) {
        console.warn('⚠️ PartsIndex вернул некорректные данные для товаров');
        return null;
      }

      const result = response.data;
      // Сохраняем в кэш на 10 минут (товары могут изменяться)
      this.setCache(cacheKey, result, this.ENTITIES_TTL);
      
      return result;
    } catch (error) {
      console.error('❌ Ошибка запроса PartsIndex getCatalogEntities:', error);
      return null;
    }
  }

  // Новый метод: получить параметры каталога для фильтрации
  async getCatalogParams(
    catalogId: string,
    groupId: string,
    options: {
      lang?: 'ru' | 'en';
      engineId?: string;
      generationId?: string;
      params?: Record<string, any>;
      q?: string;
    } = {}
  ): Promise<PartsIndexParamsResponse | null> {
    const { 
      lang = 'ru', 
      engineId, 
      generationId, 
      params,
      q 
    } = options;

    // Создаем ключ кэша на основе всех параметров
    const cacheKey = `params_${catalogId}_${groupId}_${lang}_${q || 'no-query'}_${engineId || 'no-engine'}_${generationId || 'no-generation'}_${JSON.stringify(params || {})}`;
    
    // Проверяем кэш
    const cached = this.getFromCache<PartsIndexParamsResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('🔍 PartsIndex запрос параметров каталога:', { 
        catalogId, 
        groupId, 
        lang, 
        q 
      });

      const requestParams: any = {
        lang,
        groupId, // groupId обязательный
      };

      // Добавляем поисковый запрос если есть
      if (q && q.trim()) {
        requestParams.q = q.trim();
      }

      // Добавляем параметры автомобиля если есть
      if (engineId) {
        requestParams['car[engineId]'] = engineId;
      }
      if (generationId) {
        requestParams['car[generationId]'] = generationId;
      }

      // Добавляем дополнительные параметры фильтрации
      if (params) {
        Object.keys(params).forEach(key => {
          requestParams[`params[${key}]`] = params[key];
        });
      }

      const response = await axios.get(`${this.baseURL}/catalogs/${catalogId}/params`, {
        params: requestParams,
        headers: {
          'Accept': 'application/json',
          'Authorization': this.apiKey
        },
        timeout: 15000
      });

      console.log('✅ PartsIndex параметры получены:', response.data?.list?.length || 0);

      if (!response.data || !response.data.list) {
        console.warn('⚠️ PartsIndex вернул некорректные данные для параметров');
        return null;
      }

      const result = response.data;
      // Сохраняем в кэш на 1 час
      this.setCache(cacheKey, result, this.PARAMS_TTL);
      
      return result;
    } catch (error) {
      console.error('❌ Ошибка запроса PartsIndex getCatalogParams:', error);
      return null;
    }
  }

  // Получить полную структуру категорий с подкатегориями (оптимизированная версия)
  async getCategoriesWithGroups(lang: 'ru' | 'en' = 'ru'): Promise<Array<PartsIndexCatalog & { groups: PartsIndexGroup[] }>> {
    const cacheKey = `categories_with_groups_${lang}`;
    
    // Проверяем кэш
    const cached = this.getFromCache<Array<PartsIndexCatalog & { groups: PartsIndexGroup[] }>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('🔍 PartsIndex запрос полной структуры категорий');
      
      // Сначала получаем все каталоги
      const catalogs = await this.getCatalogs(lang);
      
      if (catalogs.length === 0) {
        console.warn('⚠️ Нет доступных каталогов PartsIndex');
        return [];
      }

      // Для каждого каталога получаем его группы
      // Ограничиваем количество одновременных запросов
      const BATCH_SIZE = 3;
      const catalogsWithGroups: Array<PartsIndexCatalog & { groups: PartsIndexGroup[] }> = [];

      for (let i = 0; i < catalogs.length; i += BATCH_SIZE) {
        const batch = catalogs.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.all(
          batch.map(async (catalog) => {
            try {
              const groups = await this.getCatalogGroups(catalog.id, lang);
              return {
                ...catalog,
                groups
              };
            } catch (error) {
              console.error(`❌ Ошибка загрузки групп для каталога ${catalog.id}:`, error);
              return {
                ...catalog,
                groups: []
              };
            }
          })
        );

        catalogsWithGroups.push(...batchResults);
        
        // Небольшая задержка между батчами для снижения нагрузки на API
        if (i + BATCH_SIZE < catalogs.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log('✅ PartsIndex полная структура получена:', catalogsWithGroups.length, 'каталогов');
      
      // Сохраняем в кэш на 24 часа
      this.setCache(cacheKey, catalogsWithGroups, this.CATALOGS_TTL);
      
      return catalogsWithGroups;
    } catch (error) {
      console.error('❌ Ошибка получения полной структуры PartsIndex:', error);
      return [];
    }
  }

  // Получить деталь товара по ID
  async getEntityById(
    catalogId: string,
    entityId: string,
    lang: 'ru' | 'en' = 'ru'
  ): Promise<PartsIndexEntityDetail | null> {
    try {
      if (!this.enabled) {
        return null;
      }
      console.log('🔍 PartsIndex запрос детали товара:', { catalogId, entityId, lang });
      
      const response = await axios.get(`${this.baseURL}/catalogs/${catalogId}/entities/${entityId}`, {
        params: { lang },
        headers: {
          'Accept': 'application/json',
          'Authorization': this.apiKey
        },
        timeout: 10000
      });

      console.log('✅ PartsIndex деталь товара получена');

      if (!response.data) {
        console.warn('⚠️ PartsIndex вернул пустые данные для детали товара');
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('❌ Ошибка запроса PartsIndex getEntityById:', error);
      return null;
    }
  }

  // Поиск товара по артикулу и бренду (ОПТИМИЗИРОВАННАЯ ВЕРСИЯ - НЕ ИСПОЛЬЗУЕТСЯ)
  async searchEntityByArticle(
    articleNumber: string,
    brandName: string,
    lang: 'ru' | 'en' = 'ru'
  ): Promise<PartsIndexEntity | null> {
    console.log('⚠️ PartsIndex searchEntityByArticle ОТКЛЮЧЕН для оптимизации - слишком много запросов');
    return null;
    
    // СТАРАЯ ЛОГИКА (ЗАКОММЕНТИРОВАНА):
    // Этот метод делает сотни запросов, проходясь по всем каталогам и группам
    // Нужно использовать searchEntityInSpecificCatalog если знаем catalogId и groupId
  }

  // Прямой поиск товара по артикулу и бренду (рекомендуемый метод)
  async searchEntityByCode(
    code: string,
    brand?: string,
    lang: 'ru' | 'en' = 'ru'
  ): Promise<PartsIndexEntityDetail | null> {
    try {
      if (!this.enabled) {
        return null;
      }
      console.log('🔍 PartsIndex прямой поиск по артикулу:', { code, brand, lang });
      
      const params: any = {
        code: code.trim(),
        lang
      };
      
      if (brand && brand.trim()) {
        params.brand = brand.trim();
      }
      
      const response = await axios.get(`${this.baseURL}/entities`, {
        params,
        headers: {
          'Accept': 'application/json',
          'Authorization': this.apiKey
        },
        timeout: 10000
      });

      console.log('✅ PartsIndex прямой поиск - ответ получен');

      if (!response.data || !response.data.list || response.data.list.length === 0) {
        console.warn('⚠️ PartsIndex не найден товар по артикулу:', code);
        return null;
      }

      const entity = response.data.list[0]; // Берем первый результат
      console.log('✅ PartsIndex найден товар:', {
        code: entity.code,
        brand: entity.brand?.name,
        images: entity.images?.length || 0,
        parameters: entity.parameters?.length || 0,
        totalParams: entity.parameters?.reduce((acc: number, p: any) => acc + (p.params?.length || 0), 0) || 0
      });

      return entity;
    } catch (error) {
      console.error('❌ Ошибка прямого поиска PartsIndex:', error);
      return null;
    }
  }

  // Умный поиск товара в конкретном каталоге и группе
  async searchEntityInSpecificCatalog(
    catalogId: string,
    groupId: string,
    articleNumber: string,
    brandName: string,
    lang: 'ru' | 'en' = 'ru'
  ): Promise<PartsIndexEntity | null> {
    try {
      if (!this.enabled) {
        return null;
      }
      console.log('🔍 PartsIndex поиск товара в конкретной категории:', { 
        catalogId, 
        groupId, 
        articleNumber, 
        brandName, 
        lang 
      });
      
      // Поиск в конкретной группе каталога
      const entities = await this.getCatalogEntities(catalogId, groupId, {
        lang,
        q: `${brandName} ${articleNumber}`,
        limit: 50
      });
      
      if (entities && entities.list) {
        console.log('🔍 PartsIndex найдено товаров в категории:', entities.list.length);
        console.log('🔍 PartsIndex первые 3 товара:', entities.list.slice(0, 3).map(e => ({ code: e.code, brand: e.brand.name })));
        
        // Ищем точное совпадение по артикулу
        const exactMatch = entities.list.find(entity => 
          entity.code.toLowerCase() === articleNumber.toLowerCase()
        );
        
        if (exactMatch) {
          console.log('✅ PartsIndex найден товар по артикулу в категории:', exactMatch.code, exactMatch.brand.name);
          return exactMatch;
        }
        
        // Если точного совпадения нет, ищем по бренду и артикулу
        const brandMatch = entities.list.find(entity => 
          entity.code.toLowerCase() === articleNumber.toLowerCase() && 
          entity.brand.name.toLowerCase().includes(brandName.toLowerCase())
        );
        
        if (brandMatch) {
          console.log('✅ PartsIndex найден товар по артикулу и части бренда:', brandMatch.code, brandMatch.brand.name);
          return brandMatch;
        }
      }
      
      console.log('❌ PartsIndex товар не найден в категории:', { catalogId, groupId, articleNumber, brandName });
      return null;
    } catch (error) {
      console.error('❌ Ошибка поиска PartsIndex в конкретной категории:', error);
      return null;
    }
  }
}

export const partsIndexService = new PartsIndexService(); 
