import axios from 'axios';
import { translateCategoryName } from './translation-service';

export interface CategoryNode {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  children: CategoryNode[];
}

export interface PartsAPIArticle {
  SUP_BRAND: string | null;
  SUP_ID: number | null;
  PRODUCT_GROUP: string | null;
  PT_ID: number | null;
  ART_SUP_BRAND: string | null;
  ART_ARTICLE_NR: string | null;
  ART_ID: string | null;
}

export interface PartsAPIMedia {
  ART_MEDIA_TYPE: number | string;  // Может быть числом или строкой типа "JPEG"
  ART_MEDIA_SOURCE: string;         // Полный URL или относительный путь к файлу
  ART_MEDIA_SUP_ID: number;         // Идентификатор поставщика запчасти
  ART_MEDIA_KIND?: string;          // Вид медиа-материала (может отсутствовать)
}

export interface PartsAPIResponse {
  [key: string]: any;
}

class PartsAPIService {
  private baseURL: string;
  private categoriesApiKey: string;
  private articlesApiKey: string;
  private mediaApiKey: string;

  constructor() {
    this.baseURL = process.env.PARTSAPI_URL || 'https://api.partsapi.ru';
    
    // Получаем ключи API из переменных окружения
    this.categoriesApiKey = process.env.PARTSAPI_CATEGORIES_KEY || '';
    this.articlesApiKey = process.env.PARTSAPI_ARTICLES_KEY || '';
    this.mediaApiKey = process.env.PARTSAPI_MEDIA_KEY || '';

    if (!this.categoriesApiKey || !this.articlesApiKey || !this.mediaApiKey) {
      console.error('❌ PartsAPI ключи не найдены в переменных окружения');
    }
  }

  async getSearchTree(carId: number = 9877, carType: 'PC' | 'CV' | 'Motorcycle' = 'PC', lang: number = 16): Promise<CategoryNode[]> {
    try {
      console.log('🔍 PartsAPI запрос дерева категорий:', { carId, carType, lang });
      
      const response = await axios.get(this.baseURL, {
        params: {
          method: 'getSearchTree',
          key: this.categoriesApiKey,
          lang,
          carId,
          carType
        },
        timeout: 10000
      });

      console.log('✅ PartsAPI ответ получен, элементов:', response.data?.length || 0);

      if (!response.data || !Array.isArray(response.data)) {
        console.warn('⚠️ PartsAPI вернул некорректные данные');
        return [];
      }

      return this.transformToCategoryTree(response.data);
    } catch (error) {
      console.error('❌ Ошибка запроса PartsAPI getSearchTree:', error);
      return [];
    }
  }

  async getArticles(strId: number, carId: number = 9877, carType: 'PC' | 'CV' | 'Motorcycle' = 'PC', lang: number = 16): Promise<PartsAPIArticle[]> {
    try {
      console.log('🔍 PartsAPI запрос артикулов:', { strId, carId, carType, lang });
      
      const response = await axios.get(this.baseURL, {
        params: {
          method: 'getArticles',
          key: this.articlesApiKey,
          lang,
          strId,
          carId,
          carType
        },
        timeout: 15000
      });

      console.log('✅ PartsAPI артикулы получены, количество:', response.data?.length || 0);

      if (!response.data || !Array.isArray(response.data)) {
        console.warn('⚠️ PartsAPI вернул некорректные данные для артикулов');
        return [];
      }

      return response.data;
    } catch (error) {
      console.error('❌ Ошибка запроса PartsAPI getArticles:', error);
      return [];
    }
  }

  async getArticleMedia(artId: string, lang: number = 16): Promise<PartsAPIMedia[]> {
    try {
      console.log('🖼️ PartsAPI запрос изображений для артикула:', { artId, lang });
      
      const response = await axios.get(this.baseURL, {
        params: {
          method: 'getArticleMedia',
          key: this.mediaApiKey,
          ART_ID: artId,
          LANG: lang
        },
        timeout: 10000
      });

      console.log('✅ PartsAPI изображения получены, количество:', response.data?.length || 0);

      if (!response.data || !Array.isArray(response.data)) {
        console.warn('⚠️ PartsAPI вернул некорректные данные для изображений');
        return [];
      }

      // Фильтруем только изображения (типы 1, 3, 5, 6, 7 - различные форматы изображений, или строковые типы)
      const images = response.data.filter((media: PartsAPIMedia) => {
        // Поддерживаем как числовые, так и строковые типы
        const mediaType = media.ART_MEDIA_TYPE;
        return [1, 3, 5, 6, 7].includes(Number(mediaType)) || 
               ['JPEG', 'JPG', 'PNG', 'WebP', 'BMP', 'GIF'].includes(String(mediaType));
      });

      console.log('🖼️ Отфильтровано изображений:', images.length);
      return images;
    } catch (error) {
      console.error('❌ Ошибка запроса PartsAPI getArticleMedia:', error);
      return [];
    }
  }

  // Метод для получения полного URL изображения
  getImageUrl(mediaSource: string): string {
    // Если уже полный URL, возвращаем как есть
    if (mediaSource.startsWith('http')) {
      return mediaSource;
    }
    // Иначе добавляем базовый URL для изображений
    return `https://images.partsapi.ru/${mediaSource}`;
  }

  // Метод для получения первого изображения артикула (для каталога)
  async getArticleMainImage(artId: string): Promise<string | null> {
    try {
      const media = await this.getArticleMedia(artId);
      if (media.length > 0) {
        return this.getImageUrl(media[0].ART_MEDIA_SOURCE);
      }
      return null;
    } catch (error) {
      console.error('❌ Ошибка получения главного изображения:', error);
      return null;
    }
  }

  private transformToCategoryTree(flatData: PartsAPIResponse[]): CategoryNode[] {
    console.log('🔄 Трансформация плоских данных в дерево категорий...');
    
    const nodeMap = new Map<string, CategoryNode>();
    const rootNodes: CategoryNode[] = [];

    // Создаем узлы и добавляем переводы
    flatData.forEach((item) => {
             const translatedName = translateCategoryName(item.STR_NODE_NAME);
      
      const node: CategoryNode = {
        id: item.STR_ID,
        name: translatedName,
        level: parseInt(item.STR_LEVEL) || 0,
        parentId: item.STR_ID_PARENT || null,
        children: []
      };
      
      nodeMap.set(node.id, node);
    });

    // Строим дерево
    nodeMap.forEach((node) => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId)!;
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Сортируем узлы
    const sortNodes = (nodes: CategoryNode[]) => {
      nodes.sort((a, b) => {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
        return a.name.localeCompare(b.name, 'ru');
      });
      
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(rootNodes);

    console.log('✅ Дерево категорий построено, корневых узлов:', rootNodes.length);
    return rootNodes;
  }

  getFlatCategories(tree: CategoryNode[]): CategoryNode[] {
    const flatCategories: CategoryNode[] = [];
    
    const traverse = (nodes: CategoryNode[]) => {
      nodes.forEach(node => {
        flatCategories.push(node);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    
    traverse(tree);
    return flatCategories;
  }

  getTopLevelCategories(tree: CategoryNode[]): CategoryNode[] {
    const result: CategoryNode[] = [];
    
    // Добавляем корневые категории
    result.push(...tree);
    
    // Добавляем дочерние категории первого уровня
    tree.forEach(rootCategory => {
      result.push(...rootCategory.children);
    });
    
    return result;
  }

  getRootCategories(tree: CategoryNode[]): CategoryNode[] {
    return tree; // Возвращаем только корневые категории
  }
}

export const partsAPIService = new PartsAPIService(); 