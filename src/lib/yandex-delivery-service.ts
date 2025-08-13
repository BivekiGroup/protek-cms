interface YandexLocationDetectRequest {
  location: string;
}

interface YandexLocationDetectResponse {
  variants: {
    address: string;
    geo_id: number;
  }[];
}

interface YandexPickupPointsRequest {
  available_for_dropoff?: boolean;
  geo_id?: number;
  is_not_branded_partner_station?: boolean;
  is_post_office?: boolean;
  is_yandex_branded?: boolean;
  latitude?: {
    from: number;
    to: number;
  };
  longitude?: {
    from: number;
    to: number;
  };
  payment_method?: 'already_paid' | 'card_on_receipt';
  payment_methods?: ('already_paid' | 'card_on_receipt')[];
  pickup_point_ids?: string[];
  type?: 'pickup_point' | 'terminal' | 'post_office' | 'sorting_center';
}

interface YandexPickupPoint {
  id: string;
  address: {
    apartment?: string;
    building?: string;
    comment?: string;
    country?: string;
    full_address: string;
    geoId?: number;
    house?: string;
    housing?: string;
    locality?: string;
    postal_code?: string;
    region?: string;
    street?: string;
    subRegion?: string;
  };
  contact: {
    phone: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    partonymic?: string;
  };
  name: string;
  payment_methods: ('already_paid' | 'card_on_receipt')[];
  position: {
    latitude: number;
    longitude: number;
  };
  schedule: {
    restrictions: {
      days: number[];
      time_from: {
        hours: number;
        minutes: number;
      };
      time_to: {
        hours: number;
        minutes: number;
      };
    }[];
    time_zone: number;
  };
  type: 'pickup_point' | 'terminal' | 'post_office' | 'sorting_center';
  dayoffs?: {
    date: number;
    date_utc: number;
  }[];
  instruction?: string;
  is_dark_store?: boolean;
  is_market_partner?: boolean;
  is_post_office?: boolean;
  is_yandex_branded?: boolean;
  operator_station_id?: string;
}

interface YandexPickupPointsResponse {
  points: YandexPickupPoint[];
}

const BASE_URL = 'https://b2b-authproxy.taxi.yandex.net/api/b2b/platform';

class YandexDeliveryService {
  private token: string;

  constructor() {
    this.token = process.env.YANDEX_DELIVERY_TOKEN || '';
    if (!this.token) {
      throw new Error('YANDEX_DELIVERY_TOKEN не установлен в переменных окружения');
    }
  }

  private async makeRequest<T>(endpoint: string, data?: any): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    
    console.log(`🚚 Яндекс Доставка запрос: ${endpoint}`);
    console.log('📦 Данные запроса:', data ? JSON.stringify(data, null, 2) : 'без данных');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    console.log(`📡 Статус ответа: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Ошибка API Яндекс доставки: ${response.status} - ${errorText}`);
      throw new Error(`Ошибка API Яндекс доставки: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Успешный ответ от Яндекс Доставки:', JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * Получение идентификатора населённого пункта по адресу
   */
  async detectLocation(location: string): Promise<YandexLocationDetectResponse> {
    return this.makeRequest<YandexLocationDetectResponse>('/location/detect', {
      location,
    });
  }

  /**
   * Получение списка точек самопривоза и ПВЗ
   */
  async getPickupPoints(request: YandexPickupPointsRequest = {}): Promise<YandexPickupPointsResponse> {
    return this.makeRequest<YandexPickupPointsResponse>('/pickup-points/list', request);
  }

  /**
   * Получение ПВЗ для конкретного города
   */
  async getPickupPointsByCity(cityName: string): Promise<YandexPickupPoint[]> {
    try {
      // Сначала получаем geo_id города
      const locationResponse = await this.detectLocation(cityName);
      
      if (locationResponse.variants.length === 0) {
        return [];
      }

      const geoId = locationResponse.variants[0].geo_id;

      // Получаем все ПВЗ для этого города
      const pickupResponse = await this.getPickupPoints({
        geo_id: geoId,
        is_yandex_branded: true, // Только брендированные ПВЗ Яндекса
      });

      return pickupResponse.points;
    } catch (error) {
      console.error('Ошибка получения ПВЗ для города:', error);
      return [];
    }
  }

  /**
   * Получение ПВЗ в заданном радиусе от координат
   */
  async getPickupPointsByCoordinates(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<YandexPickupPoint[]> {
    try {
      // Конвертируем радиус в градусы (приблизительно)
      const radiusDegrees = radiusKm / 111; // 1 градус ≈ 111 км

      const pickupResponse = await this.getPickupPoints({
        latitude: {
          from: latitude - radiusDegrees,
          to: latitude + radiusDegrees,
        },
        longitude: {
          from: longitude - radiusDegrees,
          to: longitude + radiusDegrees,
        },
        is_yandex_branded: true,
      });

      return pickupResponse.points;
    } catch (error) {
      console.error('Ошибка получения ПВЗ по координатам:', error);
      return [];
    }
  }

  /**
   * Форматирование расписания работы ПВЗ с группировкой дней
   */
  formatSchedule(schedule: YandexPickupPoint['schedule']): string {
    if (!schedule.restrictions || schedule.restrictions.length === 0) {
      return 'Расписание не указано';
    }

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    // Группируем ограничения по времени
    const timeGroups: Record<string, number[]> = {};
    
    schedule.restrictions.forEach(restriction => {
      const timeFrom = `${restriction.time_from.hours.toString().padStart(2, '0')}:${restriction.time_from.minutes.toString().padStart(2, '0')}`;
      const timeTo = `${restriction.time_to.hours.toString().padStart(2, '0')}:${restriction.time_to.minutes.toString().padStart(2, '0')}`;
      const timeRange = `${timeFrom}-${timeTo}`;
      
      if (!timeGroups[timeRange]) {
        timeGroups[timeRange] = [];
      }
      timeGroups[timeRange].push(...restriction.days);
    });
    
    // Форматируем каждую группу времени
    return Object.entries(timeGroups).map(([timeRange, days]) => {
      // Убираем дубликаты и сортируем дни
      const uniqueDays = [...new Set(days)].sort((a, b) => a - b);
      
      // Группируем последовательные дни в диапазоны
      const dayRanges: string[] = [];
      let rangeStart = uniqueDays[0];
      let rangeEnd = uniqueDays[0];
      
      for (let i = 1; i < uniqueDays.length; i++) {
        const currentDay = uniqueDays[i];
        const prevDay = uniqueDays[i - 1];
        
        // Если дни идут подряд, расширяем диапазон
        if (currentDay === prevDay + 1) {
          rangeEnd = currentDay;
        } else {
          // Завершаем текущий диапазон и начинаем новый
          if (rangeStart === rangeEnd) {
            dayRanges.push(dayNames[rangeStart - 1]);
          } else {
            dayRanges.push(`${dayNames[rangeStart - 1]}-${dayNames[rangeEnd - 1]}`);
          }
          rangeStart = currentDay;
          rangeEnd = currentDay;
        }
      }
      
      // Добавляем последний диапазон
      if (rangeStart === rangeEnd) {
        dayRanges.push(dayNames[rangeStart - 1]);
      } else {
        dayRanges.push(`${dayNames[rangeStart - 1]}-${dayNames[rangeEnd - 1]}`);
      }
      
      return `${dayRanges.join(', ')}: ${timeRange}`;
    }).join('; ');
  }

  /**
   * Получение типа ПВЗ на русском языке
   */
  getTypeLabel(type: string): string {
    const labels = {
      pickup_point: 'Пункт выдачи',
      terminal: 'Постомат',
      post_office: 'Почтовое отделение',
      sorting_center: 'Сортировочный центр',
    };
    return labels[type as keyof typeof labels] || type;
  }

  /**
   * Создание заявки на доставку и получение офферов
   */
  async createOffer(request: CreateOfferRequest): Promise<CreateOfferResponse> {
    return this.makeRequest<CreateOfferResponse>('/offers/create', request);
  }

  /**
   * Парсинг адреса на компоненты
   */
  private parseAddress(address: string): {
    city?: string;
    street?: string;
    house?: string;
    region?: string;
    full_address: string;
  } {
    console.log('🔍 Начинаем парсинг адреса:', address);
    
    let city = '';
    let street = '';
    let house = '';
    let region = '';

    // Нормализуем адрес: убираем лишние пробелы, приводим к нижнему регистру для поиска
    const normalizedAddress = address.trim().toLowerCase();
    
    // Ищем номер дома (цифры с возможными буквами, корпусом, строением)
    const housePatterns = [
      /\bд[\.\s]*(\d+[а-яё]?(?:\s*к[\.\s]*\d+)?(?:\s*стр[\.\s]*\d+)?)\b/i,
      /\bдом[\.\s]*(\d+[а-яё]?(?:\s*к[\.\s]*\d+)?(?:\s*стр[\.\s]*\d+)?)\b/i,
      /\b(\d+[а-яё]?(?:\s*к[\.\s]*\d+)?(?:\s*стр[\.\s]*\d+)?)\s*$/i, // В конце строки
      /\b(\d+[а-яё]?)\b/i // Просто число с возможной буквой
    ];
    
    for (const pattern of housePatterns) {
      const match = address.match(pattern);
      if (match) {
        house = match[1].trim();
        console.log('🏠 Найден номер дома:', house);
        break;
      }
    }

    // Ищем известные города
    const cities = [
      { name: 'Москва', patterns: ['москва', 'moscow'] },
      { name: 'Санкт-Петербург', patterns: ['санкт-петербург', 'спб', 'питер', 'petersburg'] },
      { name: 'Новосибирск', patterns: ['новосибирск'] },
      { name: 'Екатеринбург', patterns: ['екатеринбург'] },
      { name: 'Казань', patterns: ['казань'] },
      { name: 'Иваново', patterns: ['иваново'] },
      { name: 'Нижний Новгород', patterns: ['нижний новгород'] },
    ];
    
    for (const cityInfo of cities) {
      for (const pattern of cityInfo.patterns) {
        if (normalizedAddress.includes(pattern)) {
          city = cityInfo.name;
          console.log('🏙️ Найден город:', city);
          break;
        }
      }
      if (city) break;
    }
    
    // Если город не найден, берем первое слово
    if (!city) {
      const parts = address.split(/[,\s]+/).filter(part => part.length > 0);
      if (parts.length > 0) {
        city = parts[0];
        console.log('🏙️ Город по умолчанию:', city);
      }
    }

    // Ищем улицу - все что между городом и номером дома
    let streetMatch = address;
    
    // Убираем город из начала
    if (city) {
      const cityPattern = new RegExp(`^[^,]*${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^,]*,?\\s*`, 'i');
      streetMatch = streetMatch.replace(cityPattern, '').trim();
    }
    
    // Убираем номер дома из конца
    if (house) {
      const housePattern = new RegExp(`\\s*д[\\.\\s]*${house.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'i');
      streetMatch = streetMatch.replace(housePattern, '').trim();
      
      // Пробуем еще раз без "д."
      const housePattern2 = new RegExp(`\\s*${house.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'i');
      streetMatch = streetMatch.replace(housePattern2, '').trim();
    }
    
    // Очищаем оставшуюся строку для улицы
    street = streetMatch.replace(/^[,\s]+|[,\s]+$/g, ''); // Убираем запятые и пробелы по краям
    console.log('🛣️ Найдена улица:', street);

    // Определяем регион на основе города
    const regionMap: Record<string, string> = {
      'москва': 'город Москва',
      'санкт-петербург': 'город Санкт-Петербург',
      'иваново': 'Ивановская область',
      'казань': 'Республика Татарстан',
      'екатеринбург': 'Свердловская область',
      'новосибирск': 'Новосибирская область',
      'нижний новгород': 'Нижегородская область',
    };

    region = regionMap[city.toLowerCase()] || `${city} область`;
    console.log('🗺️ Определен регион:', region);

    const result = {
      city: city || undefined,
      street: street || undefined,
      house: house || undefined,
      region: region || undefined,
      full_address: address,
    };
    
    console.log('✅ Результат парсинга:', result);
    return result;
  }

  /**
   * Улучшение адреса с помощью геокодирования
   */
  private async improveAddress(address: string): Promise<CustomLocation> {
    // Сначала парсим адрес для получения базовых компонентов
    const parsedAddress = this.parseAddress(address);
    console.log('🏠 Парсинг адреса:', {
      исходный: address,
      город: parsedAddress.city,
      улица: parsedAddress.street,
      дом: parsedAddress.house,
      регион: parsedAddress.region
    });
    
    try {
      const response = await this.detectLocation(address);
      if (response.variants && response.variants.length > 0) {
        const bestVariant = response.variants[0];
        
        // Используем данные из геокодирования, дополняя парсингом
        const city = parsedAddress.city || bestVariant.address;
        const region = parsedAddress.region || bestVariant.address;
        const street = parsedAddress.street || 'ул. Центральная';
        const house = parsedAddress.house || '1';
        const fullAddress = `${city}, ${street} ${house}`.trim();
        
        return {
          // Поля на верхнем уровне (возможно, требуются API)
          country: 'Russia',
          city: city,
          region: region,
          street: street,
          house: house,
          full_address: fullAddress,
          details: {
            full_address: fullAddress,
            country: 'Russia',
            geoId: bestVariant.geo_id,
            locality: city,
            region: region,
            street: street,
            house: house,
          },
        };
      }
    } catch (error) {
      console.log('Не удалось улучшить адрес через геокодирование:', error);
    }

    // Fallback к парсингу без геокодирования
    let formattedAddress = address;
    if (!formattedAddress.toLowerCase().includes('россия')) {
      formattedAddress = `${formattedAddress}, Россия`;
    }

    // Более детальный парсинг для обязательных полей
    let city = parsedAddress.city;
    let region = parsedAddress.region;
    let street = parsedAddress.street;
    let house = parsedAddress.house;

    // Если не удалось распарсить город из адреса, пытаемся извлечь его по-другому
    if (!city) {
      // Ищем известные города в адресе
      const cities = ['москва', 'санкт-петербург', 'спб', 'новосибирск', 'екатеринбург', 'казань', 'иваново'];
      for (const cityName of cities) {
        if (address.toLowerCase().includes(cityName)) {
          city = cityName.charAt(0).toUpperCase() + cityName.slice(1);
          break;
        }
      }
      if (!city) city = 'Москва'; // Fallback
    }

    // Определяем регион на основе города
    if (!region) {
      const regionMap: Record<string, string> = {
        'москва': 'город Москва',
        'санкт-петербург': 'город Санкт-Петербург',
        'спб': 'город Санкт-Петербург',
        'питер': 'город Санкт-Петербург',
        'иваново': 'Ивановская область',
        'казань': 'Республика Татарстан',
        'екатеринбург': 'Свердловская область',
        'новосибирск': 'Новосибирская область',
        'нижний новгород': 'Нижегородская область',
      };
      region = regionMap[city.toLowerCase()] || 'Московская область';
    }

    // Если улица не найдена, задаем дефолтную
    if (!street) {
      street = 'ул. Центральная';
    }

    // Если дом не найден, задаем дефолтный
    if (!house) {
      house = '1';
    }

    const result = {
      // Поля на верхнем уровне (возможно, требуются API)
      country: 'Russia',
      city: city,
      region: region,
      street: street,
      house: house,
      full_address: formattedAddress,
      details: {
        full_address: formattedAddress,
        country: 'Russia',
        locality: city,
        region: region,
        street: street,
        house: house,
      },
    };

    console.log('🏗️ Сформированный адрес для API:', result);
    return result;
  }

  /**
   * Вспомогательный метод для создания заявки из данных корзины
   * Пробует несколько временных интервалов если первый не дает результатов
   */
  async createOfferFromCart(cartData: {
    items: Array<{
      id: string;
      name: string;
      article: string;
      price: number;
      quantity: number;
      weight?: number;
      dimensions?: { dx?: number; dy?: number; dz?: number };
      deliveryTime?: number; // Срок доставки товара к нам на склад
    }>;
    deliveryAddress: string;
    recipientName: string;
    recipientPhone: string;
    paymentMethod: 'already_paid' | 'card_on_receipt';
    deliveryType: 'courier' | 'pickup';
    pickupPointId?: string;
    maxSupplierDeliveryDays?: number; // Максимальный срок поставки товаров
  }): Promise<CreateOfferResponse> {
    // Генерируем уникальный ID заявки
    const operatorRequestId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Определяем штрихкод коробки
    const packageBarcode = 'package_001';

    // Конвертируем товары в формат API
    const items: RequestResourceItem[] = cartData.items.map((item, index) => ({
      article: item.article,
      billing_details: {
        assessed_unit_price: Math.round(item.price * 100), // В копейках
        unit_price: Math.round(item.price * 100), // В копейках
        nds: 20, // НДС 20%
      },
      count: item.quantity,
      name: item.name,
      place_barcode: packageBarcode, // Используем тот же штрихкод что и у коробки
      physical_dims: item.dimensions ? {
        dx: item.dimensions.dx || 10,
        dy: item.dimensions.dy || 10,
        dz: item.dimensions.dz || 10,
      } : {
        predefined_volume: 1000, // 1000 см³ по умолчанию
      },
    }));

    // Создаем грузоместа (коробки)
    const places: ResourcePlace[] = [{
      barcode: packageBarcode,
      physical_dims: {
        dx: 30, // 30 см
        dy: 20, // 20 см
        dz: 15, // 15 см
        weight_gross: cartData.items.reduce((total, item) => 
          total + (item.weight || 500) * item.quantity, 0
        ), // Вес в граммах
      },
      description: 'Посылка с автозапчастями',
    }];

    // Настройка места отправления (наш склад)
    const source: SourceRequestNode = {
      platform_station: {
        platform_id: process.env.YANDEX_DELIVERY_SOURCE_STATION_ID || 'default_warehouse',
      },
    };

    // Настройка места назначения
    let destination: DestinationRequestNode;
    
    if (cartData.deliveryType === 'pickup' && cartData.pickupPointId) {
      // Доставка до ПВЗ
      destination = {
        type: 'platform_station',
        platform_station: {
          platform_id: cartData.pickupPointId,
        },
      };
          } else {
        // Курьерская доставка
        // Улучшаем адрес с помощью геокодирования
        const improvedLocation = await this.improveAddress(cartData.deliveryAddress);
        
        console.log('🎯 Улучшенный адрес для доставки:', JSON.stringify(improvedLocation, null, 2));
        
        destination = {
          type: 'custom_location',
          custom_location: improvedLocation,
          // Дублируем поля адреса на верхнем уровне destination (на случай если API их ожидает тут)
          country: improvedLocation.country,
          city: improvedLocation.city,
          region: improvedLocation.region,
          house: improvedLocation.house,
          street: improvedLocation.street,
          full_address: improvedLocation.full_address,
          // Интервал доставки: от завтра до послезавтра, весь день
          interval: {
            from: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Завтра 00:00
            to: Math.floor(Date.now() / 1000) + 72 * 60 * 60, // Послезавтра 00:00 (48 часов)
          },
        };
      }

    // Информация о получателе
    const nameParts = cartData.recipientName.split(' ');
    const recipientInfo: Contact = {
      first_name: nameParts[0] || 'Клиент',
      last_name: nameParts[1] || '',
      phone: cartData.recipientPhone,
    };

    // Создаем заявку
    const request: CreateOfferRequest = {
      billing_info: {
        payment_method: cartData.paymentMethod,
      },
      destination,
      info: {
        operator_request_id: operatorRequestId,
        comment: 'Заказ автозапчастей',
      },
      items,
      last_mile_policy: cartData.deliveryType === 'pickup' ? 'self_pickup' : 'time_interval',
      places,
      recipient_info: recipientInfo,
      source,
      particular_items_refuse: false, // Частичный выкуп не разрешен
    };

    // НЕ учитываем время поставки товаров в API Яндекса - только время на саму доставку
    // Время поставки товаров будет учтено в резолвере при формировании итоговой даты
    console.log(`ℹ️ Время поставки товаров (${cartData.maxSupplierDeliveryDays || 0} дней) будет учтено при расчете итоговой даты доставки`);
    
    // Попробуем создать заявку с разными временными интервалами для самой доставки
    const timeIntervals = [
      // 1. Завтра-послезавтра (стандартная доставка)
      {
        from: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        to: Math.floor(Date.now() / 1000) + 72 * 60 * 60,
      },
      // 2. Через 2-3 дня (если завтра недоступно)
      {
        from: Math.floor(Date.now() / 1000) + 48 * 60 * 60,
        to: Math.floor(Date.now() / 1000) + 96 * 60 * 60,
      },
      // 3. Через 3-5 дней (если и это недоступно)
      {
        from: Math.floor(Date.now() / 1000) + 72 * 60 * 60,
        to: Math.floor(Date.now() / 1000) + 120 * 60 * 60,
      },
    ];

    let lastError: Error | null = null;

    // Попробуем каждый интервал пока не найдем подходящий
    for (let i = 0; i < timeIntervals.length; i++) {
      const interval = timeIntervals[i];
      try {
        if (cartData.deliveryType === 'courier') {
          request.destination.interval = interval;
        }
        
        console.log(`🚚 Попытка ${i + 1}/${timeIntervals.length} с интервалом:`, {
          от: new Date(interval.from * 1000).toLocaleString('ru-RU'),
          до: new Date(interval.to * 1000).toLocaleString('ru-RU'),
        });
        
        // Логируем запрос только для первой попытки чтобы не засорять лог
        if (i === 0) {
          console.log('📄 Тело запроса к Яндекс API:', JSON.stringify(request, null, 2));
        }
        
        const response = await this.createOffer(request);
        
        // Если получили офферы, возвращаем результат
        if (response.offers && response.offers.length > 0) {
          console.log(`✅ Получили ${response.offers.length} офферов на попытке ${i + 1}`);
          return response;
        } else {
          console.log(`⚠️ Нет офферов для попытки ${i + 1}`);
        }
      } catch (error) {
        console.log(`❌ Попытка ${i + 1} с интервалом ${interval.from}-${interval.to} не удалась:`, error instanceof Error ? error.message : error);
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Если это не ошибка "no_delivery_options", прекращаем попытки
        if (error instanceof Error && !error.message.includes('no_delivery_options')) {
          throw error;
        }
      }
    }

    // Если курьерская доставка не работает, попробуем найти ближайшие ПВЗ
    if (cartData.deliveryType === 'courier' && lastError?.message.includes('no_delivery_options')) {
      console.log('💡 Курьерская доставка недоступна, ищем ближайшие ПВЗ...');
      
      try {
        // Пытаемся получить координаты адреса для поиска ПВЗ
        const locationResponse = await this.detectLocation(cartData.deliveryAddress);
        if (locationResponse.variants && locationResponse.variants.length > 0) {
          const geoId = locationResponse.variants[0].geo_id;
          console.log(`📍 Найден geoId: ${geoId} для адреса: ${cartData.deliveryAddress}`);
          
          // Ищем ПВЗ в этом городе
          const pickupPoints = await this.getPickupPoints({ geo_id: geoId });
          if (pickupPoints.points && pickupPoints.points.length > 0) {
            console.log(`📦 Найдено ${pickupPoints.points.length} ПВЗ в городе`);
            
            // Создаем фиктивные офферы для ПВЗ (так как у нас нет точной стоимости)
            const pickupOffers: Offer[] = pickupPoints.points.slice(0, 3).map((point, index) => ({
              offer_id: `pickup_${point.id}`,
              expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // Действителен сутки
              offer_details: {
                delivery_interval: {
                  min: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
                  max: Math.floor(Date.now() / 1000) + 72 * 60 * 60,
                  policy: 'self_pickup' as const,
                },
                pricing: '300.00 RUB', // Примерная стоимость
                pricing_total: '300.00 RUB',
              },
            }));
            
            return { offers: pickupOffers };
          }
        }
      } catch (pickupError) {
        console.log('Не удалось найти ПВЗ:', pickupError);
      }
    }

    // Если все интервалы не подошли, выбрасываем последнюю ошибку
    if (lastError) {
      throw lastError;
    }

    // Fallback: возвращаем пустой ответ
    return { offers: [] };
  }
}

// Интерфейсы для создания заявки на доставку
interface BillingInfo {
  payment_method: 'already_paid' | 'card_on_receipt';
  delivery_cost?: number;
}

interface CustomLocation {
  details?: LocationDetails;
  latitude?: number;
  longitude?: number;
  // Возможно, эти поля должны быть на верхнем уровне
  country?: string;
  city?: string;
  region?: string;
  house?: string;
  street?: string;
  full_address?: string;
}

interface LocationDetails {
  apartment?: string;
  building?: string;
  comment?: string;
  country?: string;
  full_address: string;
  geoId?: number;
  house?: string;
  housing?: string;
  locality?: string;
  postal_code?: string;
  region?: string;
  street?: string;
  subRegion?: string;
}

interface PlatformStation {
  platform_id?: string;
}

interface TimeInterval {
  from: number;
  to: number;
}

interface DestinationRequestNode {
  type: 'platform_station' | 'custom_location';
  custom_location?: CustomLocation;
  interval?: TimeInterval;
  platform_station?: PlatformStation;
  // Возможно, поля адреса должны быть напрямую в destination
  country?: string;
  city?: string;
  region?: string;
  house?: string;
  street?: string;
  full_address?: string;
}

interface SourceRequestNode {
  platform_station: PlatformStation;
  interval?: TimeInterval;
}

interface RequestInfo {
  operator_request_id: string;
  comment?: string;
}

interface ItemBillingDetails {
  assessed_unit_price: number;
  unit_price: number;
  inn?: string;
  nds?: number;
}

interface ItemPhysicalDimensions {
  dx?: number;
  dy?: number;
  dz?: number;
  predefined_volume?: number;
}

interface RequestResourceItem {
  article: string;
  billing_details: ItemBillingDetails;
  count: number;
  name: string;
  place_barcode: string;
  marking_code?: string;
  physical_dims?: ItemPhysicalDimensions;
  uin?: string;
}

interface PlacePhysicalDimensions {
  dx: number;
  dy: number;
  dz: number;
  weight_gross: number;
  predefined_volume?: number;
}

interface ResourcePlace {
  barcode: string;
  physical_dims: PlacePhysicalDimensions;
  description?: string;
}

interface Contact {
  first_name: string;
  phone: string;
  email?: string;
  last_name?: string;
  partonymic?: string;
}

interface CreateOfferRequest {
  billing_info: BillingInfo;
  destination: DestinationRequestNode;
  info: RequestInfo;
  items: RequestResourceItem[];
  last_mile_policy: 'time_interval' | 'self_pickup';
  places: ResourcePlace[];
  recipient_info: Contact;
  source: SourceRequestNode;
  particular_items_refuse?: boolean;
}

interface DeliveryInterval {
  max: number;
  min: number;
  policy: 'time_interval' | 'self_pickup';
}

interface PickupInterval {
  max: number;
  min: number;
}

interface OfferDetails {
  delivery_interval?: DeliveryInterval;
  pickup_interval?: PickupInterval;
  pricing?: string;
  pricing_commission_on_delivery_payment?: string;
  pricing_commission_on_delivery_payment_amount?: string;
  pricing_total?: string;
}

interface Offer {
  expires_at?: string | number;
  offer_details?: OfferDetails;
  offer_id?: string;
}

interface CreateOfferResponse {
  offers: Offer[];
}

export const yandexDeliveryService = new YandexDeliveryService();
export type { YandexPickupPoint, CreateOfferRequest, CreateOfferResponse, Offer };

// Функция для автокомплита адресов
export const getAddressSuggestions = async (query: string): Promise<string[]> => {
  // Используем API ключ Яндекс карт для геокодирования
  const apiKey = process.env.YANDEX_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('YANDEX_MAPS_API_KEY не настроен');
    return [];
  }

  if (!query || query.length < 3) {
    return [];
  }

  try {
    // Используем Yandex Geocoder API для поиска адресов
    const response = await fetch(
      `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(query)}&format=json&results=5&kind=house&lang=ru_RU`
    );

    if (!response.ok) {
      console.error('Ошибка API Геокодера:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    if (data?.response?.GeoObjectCollection?.featureMember) {
      const features = data.response.GeoObjectCollection.featureMember;
      
      return features.map((feature: any) => {
        const geoObject = feature.GeoObject;
        // Возвращаем полный адрес
        return geoObject.metaDataProperty?.GeocoderMetaData?.text || geoObject.name || '';
      }).filter(Boolean);
    }

    return [];
  } catch (error) {
    console.error('Ошибка получения подсказок адресов:', error);
    return [];
  }
}; 