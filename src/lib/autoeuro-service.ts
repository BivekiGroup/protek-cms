import axios from 'axios';

// Интерфейсы для AutoEuro API
export interface AutoEuroSearchParams {
  code: string;
  brand: string;
  delivery_key?: string;
  with_crosses?: boolean;
  with_offers?: boolean;
}

export interface AutoEuroBrandResult {
  brand: string;
  code: string;
  name: string;
}

export interface AutoEuroBrandSearchResult {
  success: boolean;
  data?: AutoEuroBrandResult[];
  error?: string;
  message?: string;
}

export interface AutoEuroOffer {
  offer_key: string;
  stock: number;
  cross: string | null;
  brand: string;
  code: string;
  name: string;
  packing: number;
  price: string | number;
  currency: string;
  amount: number;
  unit: string;
  return: string | number;
  order_before: string;
  delivery_time: string;
  delivery_time_max: string;
  rejects: number;
  dealer: number;
  warehouse_name: string | null;
  warehouse_key: string;
  ttl: number;
}

export interface AutoEuroSearchResult {
  success: boolean;
  data?: AutoEuroOffer[];
  error?: string;
  message?: string;
}

export interface AutoEuroBalance {
  balance: number;
  currency: string;
  status: string;
}

export interface AutoEuroDelivery {
  delivery_key: string;
  name: string;
  description?: string;
}

class AutoEuroService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private deliveryKey: string | null = null;

  constructor() {
    this.apiKey = process.env.AUTOEURO_API_KEY || 'U4Zr3LCTyziNYqVAkqVNKgZ1vPkPtKf2QBWlPDdUFbhW8Fj2rIvPfFrfwvNy';
    this.baseUrl = 'https://api.autoeuro.ru/api/v2/json';
  }

  /**
   * Получение delivery_key
   */
  private async getDeliveryKey(): Promise<string> {
    if (this.deliveryKey) {
      return this.deliveryKey!;
    }

    try {
      console.log('🚚 AutoEuro: получение delivery_key...');
      
      // Используем правильный endpoint для получения способов доставки
      const url = `${this.baseUrl}/get_deliveries/${this.apiKey}`;

      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'ProtekautoAPI/1.0',
          'Accept': 'application/json'
        }
      });

      console.log('📦 AutoEuro deliveries response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.DATA && Array.isArray(response.data.DATA) && response.data.DATA.length > 0) {
        // Берем первый доступный ключ доставки
        this.deliveryKey = response.data.DATA[0].delivery_key;
        console.log('✅ AutoEuro: получен delivery_key:', this.deliveryKey);
        return this.deliveryKey!;
      }

      // Если API не вернул ключи, используем один из известных рабочих ключей
      // Эти ключи мы получили при тестировании API
      const knownWorkingKeys = [
        'Yxov1KCdAii0deRp3HepSJz8wcxasI6FJzCbgkkDgHbY9hrszkUNTsEuZYBmJUwOEPb2iIb01uSVTJYQWkRv05qrVm4c', // Москва
        'Hm1US0UBM4anOYjgZEGTjwNK3Qs6K4f6BHyagkkDgHbY9hrszkUNTsEuZYBmJUwOEPb2iIb01uSVTJYQWkRv05qrVm4c', // СПб
        'dw22tcIui0s4W0AJ642fosufCJaCZBZoY84bgkkDgHbY9hrszkUNTsEuZYBmJUwOEPb2iIb01uSVTJYQWkRv05qrVm4c'  // Казань
      ];

      // Тестируем каждый известный ключ
      for (const key of knownWorkingKeys) {
        try {
          const testUrl = `${this.baseUrl}/search_items/${this.apiKey}`;
          const testParams = new URLSearchParams({
            code: 'TEST123',
            brand: 'BOSCH',
            delivery_key: key
          });

          const testResponse = await axios.get(`${testUrl}?${testParams.toString()}`, {
            timeout: 3000,
            headers: {
              'User-Agent': 'ProtekautoAPI/1.0',
              'Accept': 'application/json'
            }
          });

          // Если запрос прошел без ошибки delivery_key, используем этот ключ
          if (!testResponse.data?.ERROR?.error?.includes('Неправильное значение ключа доставки')) {
            this.deliveryKey = key;
            console.log('✅ AutoEuro: найден рабочий delivery_key:', this.deliveryKey);
            return this.deliveryKey!;
          }
          
        } catch (error: any) {
          if (error.response?.data?.ERROR?.error !== 'Неправильное значение ключа доставки') {
            // Если ошибка не связана с delivery_key, значит ключ рабочий
            this.deliveryKey = key;
            console.log('✅ AutoEuro: найден рабочий delivery_key:', this.deliveryKey);
            return this.deliveryKey!;
          }
        }
      }

      // Последний fallback - используем первый ключ из известных
      this.deliveryKey = knownWorkingKeys[0];
      console.log('⚠️ AutoEuro: используем fallback delivery_key:', this.deliveryKey);
      return this.deliveryKey!;

    } catch (error) {
      console.error('❌ Ошибка получения delivery_key:', error);
      
      // В случае ошибки используем один из известных рабочих ключей
      this.deliveryKey = 'Yxov1KCdAii0deRp3HepSJz8wcxasI6FJzCbgkkDgHbY9hrszkUNTsEuZYBmJUwOEPb2iIb01uSVTJYQWkRv05qrVm4c'; // Москва
      console.log('⚠️ AutoEuro: используем резервный delivery_key:', this.deliveryKey);
      return this.deliveryKey!;
    }
  }

  /**
   * Поиск товаров в AutoEuro
   */
  async searchItems(params: AutoEuroSearchParams): Promise<AutoEuroSearchResult> {
    try {
      console.log('🔍 AutoEuro: поиск товаров', params);

      const searchParams = new URLSearchParams({
        code: params.code,
        brand: params.brand,
        delivery_key: params.delivery_key || await this.getDeliveryKey(),
      });

      if (params.with_crosses) {
        searchParams.append('with_crosses', '1');
      }
      
      if (params.with_offers) {
        searchParams.append('with_offers', '1');
      }

      const url = `${this.baseUrl}/search_items/${this.apiKey}?${searchParams.toString()}`;
      
      console.log('📝 AutoEuro URL:', url);

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'ProtekautoAPI/1.0',
          'Accept': 'application/json'
        }
      });

      console.log('✅ AutoEuro ответ получен. Status:', response.status);
      console.log('📄 AutoEuro response headers:', response.headers);
      console.log('📦 AutoEuro response data type:', typeof response.data);
      console.log('📦 AutoEuro response data length:', Array.isArray(response.data) ? response.data.length : 'not array');
      
      // Логируем структуру ответа для отладки
      if (response.data) {
        console.log('📦 AutoEuro response structure:', Object.keys(response.data));
        console.log('📦 AutoEuro response (первые 500 символов):', JSON.stringify(response.data, null, 2).substring(0, 500));
      }
      
      // Логируем первые несколько элементов для отладки
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log('📦 AutoEuro первые 2 элемента:', JSON.stringify(response.data.slice(0, 2), null, 2));
      }

      // AutoEuro API возвращает объект с META и DATA полями
      if (response.data && response.data.META && response.data.DATA) {
        console.log('✅ AutoEuro: успешный ответ, найдено предложений:', response.data.DATA.length);
        return {
          success: true,
          data: response.data.DATA
        };
      }
      
      // Проверяем альтернативный формат - массив напрямую (на случай если API изменится)
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ AutoEuro: успешный ответ (массив), найдено предложений:', response.data.length);
        return {
          success: true,
          data: response.data
        };
      } 
      
      // Если данные есть, но не в ожидаемом формате
      if (response.data) {
        console.log('⚠️ AutoEuro: данные в неожиданном формате');
        console.log('📄 Полный ответ AutoEuro (первые 1000 символов):', JSON.stringify(response.data, null, 2).substring(0, 1000));
        
        // Проверяем на наличие ошибок в разных форматах
        const errorMessage = response.data?.ERROR?.error || response.data?.META?.error || response.data?.error;
        
        if (errorMessage) {
          console.log('⚠️ AutoEuro ошибка:', errorMessage);
          return {
            success: false,
            error: errorMessage
          };
        }
        
        // Если нет явной ошибки, но данные не в ожидаемом формате
        return {
          success: false,
          error: 'Неизвестная ошибка AutoEuro API - неожиданный формат ответа'
        };
      }
      
      // Если данных нет вообще
      console.log('⚠️ AutoEuro: пустой ответ');
      return {
        success: false,
        error: 'Пустой ответ от AutoEuro API'
      };

    } catch (error: any) {
      console.error('❌ Ошибка AutoEuro API:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.request) {
        console.error('Request config:', error.config);
        console.error('Request timeout:', error.timeout);
      }

      return {
        success: false,
        error: error.message || 'Ошибка соединения с AutoEuro API'
      };
    }
  }

  /**
   * Получение баланса клиента
   */
  async getBalance(): Promise<AutoEuroBalance | null> {
    try {
      console.log('💰 AutoEuro: получение баланса');

      const url = `${this.baseUrl}/get_balance/${this.apiKey}`;
      
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'ProtekautoAPI/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error('❌ Ошибка получения баланса AutoEuro:', error);
      return null;
    }
  }

  /**
   * Получение списка брендов
   */
  async getBrands(): Promise<string[]> {
    try {
      console.log('🏷️ AutoEuro: получение списка брендов');

      const url = `${this.baseUrl}/get_brands/${this.apiKey}`;
      
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'ProtekautoAPI/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.success && response.data.data) {
        return response.data.data.map((brand: any) => brand.name || brand);
      }

      return [];
    } catch (error) {
      console.error('❌ Ошибка получения брендов AutoEuro:', error);
      return [];
    }
  }

  /**
   * Поиск бренда по коду
   */
  async searchBrands(query: string): Promise<string[]> {
    try {
      console.log('🔍 AutoEuro: поиск брендов по запросу:', query);

      const url = `${this.baseUrl}/search_brands/${this.apiKey}?brand=${encodeURIComponent(query)}`;
      
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'ProtekautoAPI/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.success && response.data.data) {
        return response.data.data.map((brand: any) => brand.name || brand);
      }

      return [];
    } catch (error) {
      console.error('❌ Ошибка поиска брендов AutoEuro:', error);
      return [];
    }
  }

  /**
   * Получение списка брендов у которых есть искомый артикул
   */
  async getBrandsByCode(code: string): Promise<AutoEuroBrandSearchResult> {
    try {
      console.log('🔍 AutoEuro: поиск брендов по коду артикула:', code);

      // Используем правильный endpoint из документации: /search_brands/
      // Пробуем сначала POST запрос
      const url = `${this.baseUrl}/search_brands/${this.apiKey}`;
      
      let response;
      try {
        console.log('🔄 AutoEuro: пробуем POST запрос...');
        response = await axios.post(url, {
          code: code.trim()
        }, {
          timeout: 10000,
          headers: {
            'User-Agent': 'ProtekautoAPI/1.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
      } catch (postError) {
        console.log('⚠️ AutoEuro: POST запрос не удался, пробуем GET...');
        // Если POST не работает, пробуем GET запрос
        const getUrl = `${this.baseUrl}/search_brands/${this.apiKey}?code=${encodeURIComponent(code.trim())}`;
        response = await axios.get(getUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'ProtekautoAPI/1.0',
            'Accept': 'application/json'
          }
        });
      }

      console.log('✅ AutoEuro brands response status:', response.status);
      console.log('📦 AutoEuro brands response data type:', typeof response.data);
      
      if (response.data) {
        console.log('📦 AutoEuro brands response structure:', Object.keys(response.data));
        console.log('📦 AutoEuro brands response (первые 500 символов):', JSON.stringify(response.data, null, 2).substring(0, 500));
      }

      // Обрабатываем разные форматы ответа API
      if (response.data && response.data.META && response.data.DATA) {
        console.log('✅ AutoEuro: найдено брендов:', response.data.DATA.length);
        return {
          success: true,
          data: response.data.DATA.map((item: any) => ({
            brand: item.brand || item.name || item,
            code: item.code || code,
            name: item.name || item.description || item.brand || item
          }))
        };
      }
      
      // Альтернативный формат - массив напрямую
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ AutoEuro: найдено брендов (массив):', response.data.length);
        return {
          success: true,
          data: response.data.map((item: any) => ({
            brand: item.brand || item.name || item,
            code: item.code || code,
            name: item.name || item.description || item.brand || item
          }))
        };
      }
      
      // Проверяем на ошибки
      const errorMessage = response.data?.ERROR?.error || response.data?.META?.error || response.data?.error;
      if (errorMessage) {
        console.log('⚠️ AutoEuro brands ошибка:', errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Если нет данных
      console.log('⚠️ AutoEuro: бренды не найдены для артикула:', code);
      return {
        success: true,
        data: []
      };

    } catch (error) {
      console.error('❌ Ошибка получения брендов по коду AutoEuro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получение способов доставки
   */
  async getDeliveries(): Promise<AutoEuroDelivery[]> {
    try {
      console.log('🚚 AutoEuro: получение способов доставки');

      const url = `${this.baseUrl}/get_deliveries/${this.apiKey}`;
      
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'ProtekautoAPI/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.DATA && Array.isArray(response.data.DATA) && response.data.DATA.length > 0) {
        console.log('✅ AutoEuro: получены способы доставки:', response.data.DATA.length);
        return response.data.DATA.map((delivery: any) => ({
          delivery_key: delivery.delivery_key,
          name: delivery.delivery_name,
          description: delivery.delivery_name
        }));
      }

      console.log('⚠️ AutoEuro: нет данных о способах доставки, используем дефолтный');
      return [{
        delivery_key: 'Yxov1KCdAii0deRp3HepSJz8wcxasI6FJzCbgkkDgHbY9hrszkUNTsEuZYBmJUwOEPb2iIb01uSVTJYQWkRv05qrVm4c',
        name: 'Самовывоз г.Москва',
        description: 'Самовывоз г.Москва (МО,Истринский р-н,Павловская Слобода,ул.Ленина,76,стр.2,пав.28)'
      }];

    } catch (error) {
      console.error('❌ Ошибка получения способов доставки AutoEuro:', error);
      
      return [{
        delivery_key: 'Yxov1KCdAii0deRp3HepSJz8wcxasI6FJzCbgkkDgHbY9hrszkUNTsEuZYBmJUwOEPb2iIb01uSVTJYQWkRv05qrVm4c',
        name: 'Самовывоз г.Москва',
        description: 'Самовывоз г.Москва (МО,Истринский р-н,Павловская Слобода,ул.Ленина,76,стр.2,пав.28)'
      }];
    }
  }
}

export const autoEuroService = new AutoEuroService(); 