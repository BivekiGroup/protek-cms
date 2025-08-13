import { createHash } from 'crypto'

export interface LaximoBrand {
  brand: string
  code: string
  icon: string
  name: string
  supportdetailapplicability: boolean
  supportparameteridentification2: boolean
  supportquickgroups: boolean
  supportvinsearch: boolean
  supportframesearch?: boolean
  vinexample?: string
  frameexample?: string
  features: LaximoFeature[]
  extensions?: LaximoExtensions
}

export interface LaximoFeature {
  name: string
  example?: string
}

export interface LaximoExtensions {
  operations?: LaximoOperation[]
}

export interface LaximoOperation {
  description: string
  kind: string
  name: string
  fields: LaximoField[]
}

export interface LaximoField {
  description: string
  example?: string
  name: string
  pattern?: string
}

// Новые интерфейсы для поиска автомобилей
export interface LaximoCatalogInfo {
  brand: string
  code: string
  icon: string
  name: string
  supportdetailapplicability: boolean
  supportparameteridentification2: boolean
  supportquickgroups: boolean
  supportvinsearch: boolean
  supportplateidentification?: boolean
  vinexample?: string
  plateexample?: string
  features: LaximoFeature[]
  permissions: string[]
}

export interface LaximoWizardStep {
  allowlistvehicles: boolean
  automatic: boolean
  conditionid: string
  determined: boolean
  name: string
  type: string
  ssd?: string
  value?: string
  valueid?: string
  options: LaximoWizardOption[]
}

export interface LaximoWizardOption {
  key: string
  value: string
}

export interface LaximoVehicleSearchResult {
  vehicleid: string
  name?: string
  brand: string
  catalog?: string
  model: string
  modification: string
  year: string
  bodytype: string
  engine: string
  notes?: string
  ssd?: string
  transmission?: string
  date?: string
  manufactured?: string
  framecolor?: string
  trimcolor?: string
  engine_info?: string
  engineno?: string
  market?: string
  prodRange?: string
  prodPeriod?: string
  destinationregion?: string
  creationregion?: string
  datefrom?: string
  dateto?: string
  modelyearfrom?: string
  modelyearto?: string
  options?: string
  description?: string
  grade?: string
  attributes: LaximoVehicleAttribute[]
}

export interface LaximoVehicleInfo {
  vehicleid: string
  name: string
  ssd: string
  brand: string
  catalog: string
  attributes: LaximoVehicleAttribute[]
}

export interface LaximoVehicleAttribute {
  key: string
  name: string
  value: string
}

export interface LaximoQuickGroup {
  quickgroupid: string
  name: string
  link: boolean
  children?: LaximoQuickGroup[]
  code?: string
  imageurl?: string
  largeimageurl?: string
  ssd?: string // ИСПРАВЛЕНИЕ: Добавляем поле SSD для узлов
}

export interface LaximoQuickDetail {
  quickgroupid: string
  name: string
  units?: LaximoUnit[]
}

export interface LaximoUnit {
  unitid: string
  name: string
  code?: string
  description?: string
  imageurl?: string
  largeimageurl?: string
  ssd?: string // ИСПРАВЛЕНИЕ: Добавляем поле SSD для узла
  details?: LaximoDetail[]
  attributes?: LaximoDetailAttribute[]
}

export interface LaximoDetail {
  detailid: string
  name: string
  oem: string
  brand?: string
  description?: string
  applicablemodels?: string
  note?: string
  amount?: string
  range?: string
  codeonimage?: string
  match?: boolean
  dateRange?: string
  ssd?: string
  attributes?: LaximoDetailAttribute[]
}

export interface LaximoDetailAttribute {
  key: string
  name?: string
  value: string
}

export interface LaximoOEMResult {
  oemNumber: string
  categories: LaximoOEMCategory[]
}

export interface LaximoOEMCategory {
  categoryid: string
  name: string
  units: LaximoOEMUnit[]
}

export interface LaximoOEMUnit {
  unitid: string
  name: string
  code?: string
  imageurl?: string
  details: LaximoOEMDetail[]
}

export interface LaximoOEMDetail {
  detailid: string
  name: string
  oem: string
  brand?: string
  amount?: string
  range?: string
  attributes?: LaximoDetailAttribute[]
}

export interface LaximoFulltextSearchResult {
  searchQuery: string
  details: LaximoFulltextDetail[]
}

export interface LaximoFulltextDetail {
  oem: string
  name: string
  brand?: string
  description?: string
}

// Интерфейсы для модуля Doc
export interface LaximoDocFindOEMResult {
  details: LaximoDocDetail[]
}

export interface LaximoDocDetail {
  detailid: string
  formattedoem: string
  manufacturer: string
  manufacturerid: string
  name: string
  oem: string
  volume?: string
  weight?: string
  replacements: LaximoDocReplacement[]
}

export interface LaximoDocReplacement {
  type: string
  way: string
  replacementid: string
  rate?: string
  detail: LaximoDocReplacementDetail
}

export interface LaximoDocReplacementDetail {
  detailid: string
  formattedoem: string
  manufacturer: string
  manufacturerid: string
  name: string
  oem: string
  weight?: string
  icon?: string
}

export interface LaximoCatalogVehicleResult {
  catalogCode: string
  catalogName: string
  brand: string
  vehicles: LaximoVehicleSearchResult[]
  vehicleCount: number
}

export interface LaximoVehiclesByPartResult {
  partNumber: string
  catalogs: LaximoCatalogVehicleResult[]
  totalVehicles: number
}

// Дополнительные интерфейсы для работы с деталями узлов
export interface LaximoUnitImageMap {
  unitid: string
  imageurl?: string
  largeimageurl?: string
  coordinates: LaximoImageCoordinate[]
}

export interface LaximoImageCoordinate {
  detailid: string
  codeonimage?: string
  x: number
  y: number
  width: number
  height: number
  shape: string
}

/**
 * Laximo Doc Service для поиска деталей по артикулу
 * Использует отдельные данные авторизации для модуля Doc
 */
class LaximoDocService {
  // Endpoints для Aftermarket (Doc) модуля согласно WSDL
  private soap11Url = 'https://aws.laximo.ru/ec.Kito.Aftermarket/services/Catalog.CatalogHttpSoap11Endpoint/'
  private soap12Url = 'https://aws.laximo.ru/ec.Kito.Aftermarket/services/Catalog.CatalogHttpSoap12Endpoint/'
  private login = process.env.LAXIMO_DOC_LOGIN || ''
  private password = process.env.LAXIMO_DOC_PASSWORD || ''

  constructor() {
    console.log('🔧 LaximoDocService инициализация:')
    console.log('📧 Login:', this.login ? `${this.login.substring(0, 3)}***` : 'НЕ ЗАДАН')
    console.log('🔑 Password:', this.password ? `${this.password.substring(0, 3)}***` : 'НЕ ЗАДАН')
    console.log('🌐 SOAP11 URL:', this.soap11Url)
    
    if (!this.login || !this.password) {
      console.error('❌ Учетные данные для Doc модуля не настроены!')
    }
  }

  /**
   * Создает HMAC контрольный код для авторизации
   */
  private createHMAC(command: string): string {
    if (!this.password) {
      throw new Error('Doc password is required for HMAC generation')
    }
    
    const combinedString = command + this.password
    return createHash('md5').update(combinedString).digest('hex')
  }

  /**
   * Создает SOAP 1.1 конверт
   */
  private createSOAP11Envelope(command: string, login: string, hmac: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:ns="http://Aftermarket.Kito.ec">
  <soap:Body>
    <ns:QueryDataLogin>
      <ns:request>${command}</ns:request>
      <ns:login>${login}</ns:login>
      <ns:hmac>${hmac}</ns:hmac>
    </ns:QueryDataLogin>
  </soap:Body>
</soap:Envelope>`
  }

  /**
   * Выполняет SOAP запрос
   */
  private async makeSOAPRequest(url: string, soapEnvelope: string, soapAction: string): Promise<string> {
    try {
      console.log('🌐 Doc SOAP Request URL:', url)
      console.log('📋 Doc SOAP Action:', soapAction)
      console.log('📄 Doc SOAP Envelope (first 500 chars):', soapEnvelope.substring(0, 500))
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': soapAction
        },
        body: soapEnvelope
      })

      console.log('📡 Doc Response Status:', response.status)
      console.log('📡 Doc Response Headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ Doc Error Response Body:', errorText)
        
        // Проверяем на ошибку лимита запросов
        if (response.status === 500 && errorText.includes('E_TOO_MANY_REQUESTS')) {
          console.log('⚠️ Превышен лимит запросов Laximo API - возвращаем пустой результат')
          return '<soap:Envelope><soap:Body><ns:return></ns:return></soap:Body></soap:Envelope>'
        }
        
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseText = await response.text()
      console.log('✅ Doc Response received, length:', responseText.length)
      console.log('📄 Doc Response (first 1000 chars):', responseText.substring(0, 1000))
      
      return responseText
    } catch (error) {
      console.error('SOAP request failed:', error)
      throw error
    }
  }

  /**
   * Поиск деталей по артикулу через Doc: findOem
   */
  async findOEM(oemNumber: string, brand?: string, replacementTypes?: string): Promise<LaximoDocFindOEMResult | null> {
    try {
      console.log('🔍 Doc: findOem поиск по артикулу:', oemNumber)
      
      // Команда для Doc модуля согласно документации
      let command = `FindOEM:Locale=ru_RU|OEM=${oemNumber}|Options=crosses`
      
      if (brand) {
        command += `|Brand=${brand}`
      }
      
      if (replacementTypes) {
        command += `|ReplacementTypes=${replacementTypes}`
      }
      
      const hmac = this.createHMAC(command)
      
      console.log('📝 Doc findOem Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      return this.parseFindOEMResponse(xmlText)
    } catch (error) {
      console.error('Ошибка Doc findOem:', error)
      throw error
    }
  }

  /**
   * Парсит ответ findOem
   */
  private parseFindOEMResponse(xmlText: string): LaximoDocFindOEMResult | null {
    try {
      console.log('📄 Парсинг ответа Doc findOem...')
      
      // Извлекаем данные из SOAP ответа
      const resultMatch = xmlText.match(/<ns:return[^>]*>([\s\S]*?)<\/ns:return>/) || 
                         xmlText.match(/<return[^>]*>([\s\S]*?)<\/return>/)
      if (!resultMatch) {
        console.log('❌ Не найден return в ответе')
        return null
      }

      let resultData = resultMatch[1]
      
      // Декодируем HTML entities если данные экранированы
      resultData = resultData
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')

      console.log('📋 Данные результата (первые 1000 символов):', resultData.substring(0, 1000))
      console.log('📋 Полные данные результата:', resultData)

      // Ищем блок FindOEM
      const findOemMatch = resultData.match(/<FindOEM>([\s\S]*?)<\/FindOEM>/) ||
                          resultData.match(/<findOem>([\s\S]*?)<\/findOem>/) ||
                          resultData.match(/<response>([\s\S]*?)<\/response>/)
      if (!findOemMatch) {
        console.log('❌ Не найден блок FindOEM в ответе')
        return null
      }

      const findOemData = findOemMatch[1]
      
      // Парсим детали
      const details: LaximoDocDetail[] = []
      const detailPattern = /<detail([^>]*)>(.*?)<\/detail>/g
      let detailMatch
      
      while ((detailMatch = detailPattern.exec(findOemData)) !== null) {
        const detailAttrs = detailMatch[1]
        const detailContent = detailMatch[2]
        
        const getAttribute = (name: string): string => {
          const match = detailAttrs.match(new RegExp(`${name}="([^"]*)"`, 'i'))
          return match ? match[1] : ''
        }
        
        // Парсим замены
        const replacements: LaximoDocReplacement[] = []
        const replacementPattern = /<replacement([^>]*)>(.*?)<\/replacement>/g
        let replMatch
        
        while ((replMatch = replacementPattern.exec(detailContent)) !== null) {
          const replAttrs = replMatch[1]
          const replContent = replMatch[2]
          
          const getReplAttr = (name: string): string => {
            const match = replAttrs.match(new RegExp(`${name}="([^"]*)"`, 'i'))
            return match ? match[1] : ''
          }
          
          // Парсим деталь замены
          const replDetailMatch = replContent.match(/<detail([^>]*)/)
          let replDetail: LaximoDocReplacementDetail = {
            detailid: '',
            formattedoem: '',
            manufacturer: '',
            manufacturerid: '',
            name: '',
            oem: ''
          }
          
          if (replDetailMatch) {
            const replDetailAttrs = replDetailMatch[1]
            const getReplDetailAttr = (name: string): string => {
              const match = replDetailAttrs.match(new RegExp(`${name}="([^"]*)"`, 'i'))
              return match ? match[1] : ''
            }
            
            replDetail = {
              detailid: getReplDetailAttr('detailid'),
              formattedoem: getReplDetailAttr('formattedoem'),
              manufacturer: getReplDetailAttr('manufacturer'),
              manufacturerid: getReplDetailAttr('manufacturerid'),
              name: getReplDetailAttr('name'),
              oem: getReplDetailAttr('oem'),
              weight: getReplDetailAttr('weight'),
              icon: getReplDetailAttr('icon')
            }
          }
          
          replacements.push({
            type: getReplAttr('type'),
            way: getReplAttr('way'),
            replacementid: getReplAttr('replacementid'),
            rate: getReplAttr('rate'),
            detail: replDetail
          })
        }
        
        const detail: LaximoDocDetail = {
          detailid: getAttribute('detailid'),
          formattedoem: getAttribute('formattedoem'),
          manufacturer: getAttribute('manufacturer'),
          manufacturerid: getAttribute('manufacturerid'),
          name: getAttribute('name'),
          oem: getAttribute('oem'),
          volume: getAttribute('volume'),
          weight: getAttribute('weight'),
          replacements
        }
        
        details.push(detail)
        console.log('🔩 Найдена деталь:', { 
          oem: detail.oem, 
          name: detail.name, 
          manufacturer: detail.manufacturer,
          replacements: detail.replacements.length
        })
      }
      
      console.log('✅ Всего найдено деталей:', details.length)
      
      return {
        details
      }
    } catch (error) {
      console.error('Ошибка парсинга findOem ответа:', error)
      return null
    }
  }
}

/**
 * Laximo SOAP API Service для интеграции с каталогом автозапчастей
 * 
 * Использует актуальные endpoints согласно WSDL:
 * - SOAP 1.1: https://ws.laximo.ru/ec.Kito.WebCatalog/services/Catalog.CatalogHttpSoap11Endpoint/
 * - SOAP 1.2: https://ws.laximo.ru/ec.Kito.WebCatalog/services/Catalog.CatalogHttpSoap12Endpoint/
 * - Функция QueryDataLogin для авторизации
 * - HMAC контрольный код с MD5 хешированием
 * - Команда ListCatalogs:Locale=ru_RU для получения каталогов
 */
class LaximoService {
  // Актуальные endpoints согласно WSDL схеме
  protected soap11Url = 'https://ws.laximo.ru/ec.Kito.WebCatalog/services/Catalog.CatalogHttpSoap11Endpoint/'
  protected soap12Url = 'https://ws.laximo.ru/ec.Kito.WebCatalog/services/Catalog.CatalogHttpSoap12Endpoint/'
  protected login = process.env.LAXIMO_LOGIN || ''
  protected password = process.env.LAXIMO_PASSWORD || ''

  /**
   * Создает HMAC контрольный код для авторизации
   * Формула: MD5(команда + пароль)
   */
  protected createHMAC(command: string): string {
    if (!this.password) {
      throw new Error('Password is required for HMAC generation')
    }
    
    const combinedString = command + this.password
    return createHash('md5').update(combinedString).digest('hex')
  }

  /**
   * Экранирует специальные символы XML в SSD параметре
   */
  protected escapeSsdForXML(ssd: string): string {
    return ssd
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * Создает SOAP 1.1 конверт согласно WSDL схеме
   */
  protected createSOAP11Envelope(command: string, login: string, hmac: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:ns="http://WebCatalog.Kito.ec">
  <soap:Body>
    <ns:QueryDataLogin>
      <ns:request>${command}</ns:request>
      <ns:login>${login}</ns:login>
      <ns:hmac>${hmac}</ns:hmac>
    </ns:QueryDataLogin>
  </soap:Body>
</soap:Envelope>`
  }

  /**
   * Создает SOAP 1.2 конверт согласно WSDL схеме
   */
  private createSOAP12Envelope(command: string, login: string, hmac: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" 
               xmlns:ns="http://WebCatalog.Kito.ec">
  <soap:Body>
    <ns:QueryDataLogin>
      <ns:request>${command}</ns:request>
      <ns:login>${login}</ns:login>
      <ns:hmac>${hmac}</ns:hmac>
    </ns:QueryDataLogin>
  </soap:Body>
</soap:Envelope>`
  }

  /**
   * Парсит XML ответ согласно официальной документации Laximo
   */
  private parseListCatalogsResponse(xmlText: string): LaximoBrand[] {
    const brands: LaximoBrand[] = []
    
    // Извлекаем данные между тегами QueryDataLoginResponse/return или response
    let resultData = ''
    
    // Пытаемся найти данные в разных форматах ответа
    const soapResultMatch = xmlText.match(/<ns:return[^>]*>([\s\S]*?)<\/ns:return>/) || 
                           xmlText.match(/<return[^>]*>([\s\S]*?)<\/return>/)
    const responseMatch = xmlText.match(/<response[^>]*>([\s\S]*?)<\/response>/)
    
    if (soapResultMatch) {
      resultData = soapResultMatch[1]
      // Декодируем HTML entities если данные экранированы
      resultData = resultData
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
    } else if (responseMatch) {
      resultData = responseMatch[1]
    } else {
      console.log('🔍 Не найден результат в XML ответе')
      return brands
    }
    
    // Ищем секцию ListCatalogs
    const catalogsMatch = resultData.match(/<ListCatalogs[^>]*>([\s\S]*?)<\/ListCatalogs>/)
    if (!catalogsMatch) {
      console.log('🔍 Не найдена секция ListCatalogs')
      return brands
    }

    const catalogsData = catalogsMatch[1]
    
    // Ищем все row элементы с их содержимым
    const rowMatches = catalogsData.match(/<row[^>]*>[\s\S]*?<\/row>/g)
    
    if (!rowMatches) {
      console.log('🔍 Не найдены row элементы')
      return brands
    }

    console.log(`🔍 Найдено ${rowMatches.length} брендов`)

    for (const rowMatch of rowMatches) {
      // Извлекаем атрибуты из тега row
      const rowTagMatch = rowMatch.match(/<row([^>]*)>/);
      if (!rowTagMatch) continue;
      
      const rowAttributes = rowTagMatch[1];
      
      const getAttribute = (name: string): string => {
        const match = rowAttributes.match(new RegExp(`${name}="([^"]*)"`, 'i'))
        return match ? match[1] : ''
      }

      const brand: LaximoBrand = {
        brand: getAttribute('brand'),
        code: getAttribute('code'),
        icon: getAttribute('icon'),
        name: getAttribute('name'),
        supportdetailapplicability: getAttribute('supportdetailapplicability') === 'true',
        supportparameteridentification2: getAttribute('supportparameteridentification2') === 'true',
        supportquickgroups: getAttribute('supportquickgroups') === 'true',
        supportvinsearch: getAttribute('supportvinsearch') === 'true',
        features: []
      }

      // Опциональные атрибуты
      const supportframesearch = getAttribute('supportframesearch')
      if (supportframesearch) {
        brand.supportframesearch = supportframesearch === 'true'
      }
      
      const vinexample = getAttribute('vinexample')
      if (vinexample) {
        brand.vinexample = vinexample
      }
      
      const frameexample = getAttribute('frameexample')
      if (frameexample) {
        brand.frameexample = frameexample
      }

      // Парсим features согласно документации
      brand.features = this.parseFeatures(rowMatch)
      
      // Парсим extensions если есть
      brand.extensions = this.parseExtensions(rowMatch)

      brands.push(brand)
    }

    return brands
  }

  /**
   * Парсит секцию features согласно документации
   */
  private parseFeatures(rowXml: string): LaximoFeature[] {
    const features: LaximoFeature[] = []
    
    const featuresMatch = rowXml.match(/<features[^>]*>([\s\S]*?)<\/features>/)
    if (!featuresMatch) {
      return features
    }

    const featuresData = featuresMatch[1]
    const featureMatches = featuresData.match(/<feature[^>]*\/?>|<feature[^>]*>[\s\S]*?<\/feature>/g)
    
    if (!featureMatches) {
      return features
    }

    for (const featureMatch of featureMatches) {
      const getAttribute = (name: string): string => {
        const match = featureMatch.match(new RegExp(`${name}="([^"]*)"`, 'i'))
        return match ? match[1] : ''
      }

      const feature: LaximoFeature = {
        name: getAttribute('name')
      }

      const example = getAttribute('example')
      if (example) {
        feature.example = example
      }

      features.push(feature)
    }

    return features
  }

  /**
   * Парсит секцию extensions согласно документации
   */
  private parseExtensions(rowXml: string): LaximoExtensions | undefined {
    const extensionsMatch = rowXml.match(/<extensions[^>]*>([\s\S]*?)<\/extensions>/)
    if (!extensionsMatch) {
      return undefined
    }

    const extensionsData = extensionsMatch[1]
    const operationsMatch = extensionsData.match(/<operations[^>]*>([\s\S]*?)<\/operations>/)
    
    if (!operationsMatch) {
      return undefined
    }

    const operationsData = operationsMatch[1]
    const operationMatches = operationsData.match(/<operation[^>]*>[\s\S]*?<\/operation>/g)
    
    if (!operationMatches) {
      return undefined
    }

    const operations: LaximoOperation[] = []

    for (const operationMatch of operationMatches) {
      const getAttribute = (name: string): string => {
        const match = operationMatch.match(new RegExp(`${name}="([^"]*)"`, 'i'))
        return match ? match[1] : ''
      }

      const operation: LaximoOperation = {
        name: getAttribute('name'),
        kind: getAttribute('kind'),
        description: getAttribute('description'),
        fields: []
      }

      // Парсим поля операции
      const fieldMatches = operationMatch.match(/<field[^>]*\/?>|<field[^>]*>[\s\S]*?<\/field>/g)
      if (fieldMatches) {
        for (const fieldMatch of fieldMatches) {
          const getFieldAttr = (name: string): string => {
            const match = fieldMatch.match(new RegExp(`${name}="([^"]*)"`, 'i'))
            return match ? match[1] : ''
          }

          const field: LaximoField = {
            name: getFieldAttr('name'),
            description: getFieldAttr('description')
          }

          const pattern = getFieldAttr('pattern')
          if (pattern) {
            field.pattern = pattern
          }

          const example = getFieldAttr('example')
          if (example) {
            field.example = example
          }

          operation.fields.push(field)
        }
      }

      operations.push(operation)
    }

    return { operations }
  }

  /**
   * Получает список каталогов через SOAP API
   */
  async getListCatalogs(): Promise<LaximoBrand[]> {
    // Проверяем наличие учетных данных
    if (!this.login || !this.password) {
      throw new Error('Laximo credentials not configured. Please set LAXIMO_LOGIN and LAXIMO_PASSWORD environment variables.')
    }

    const command = 'ListCatalogs:Locale=ru_RU'
    const hmac = this.createHMAC(command)
    
    console.log('🔍 Отправляем SOAP запрос к Laximo API...')
    console.log('🔐 Login:', this.login)
    console.log('📝 Command:', command)
    console.log('🔗 HMAC:', hmac)
    
    // Сначала пробуем SOAP 1.1
    try {
      console.log('📍 Trying SOAP 1.1:', this.soap11Url)
      return await this.makeSOAPRequest(this.soap11Url, this.createSOAP11Envelope(command, this.login, hmac), 'urn:QueryDataLogin')
    } catch (soap11Error) {
      console.log('❌ SOAP 1.1 failed:', soap11Error instanceof Error ? soap11Error.message : 'Unknown error')
      
      // Fallback на SOAP 1.2
      try {
        console.log('📍 Trying SOAP 1.2:', this.soap12Url)
        return await this.makeSOAPRequest(this.soap12Url, this.createSOAP12Envelope(command, this.login, hmac), 'urn:QueryDataLogin')
      } catch (soap12Error) {
        console.error('❌ Both SOAP 1.1 and 1.2 failed')
        throw soap12Error
      }
    }
  }

  /**
   * Выполняет SOAP запрос
   */
  private async makeSOAPRequest(url: string, soapEnvelope: string, soapAction: string): Promise<LaximoBrand[]> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"${soapAction}"`
      },
      body: soapEnvelope
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Laximo API endpoint not found: ${url}. Please check the current API documentation.`)
      }
      throw new Error(`Laximo SOAP API error: ${response.status} ${response.statusText}`)
    }

    const xmlText = await response.text()
    console.log('📥 Получен ответ от Laximo API')
    console.log('📋 Response length:', xmlText.length)
    
    // Проверяем на ошибки в ответе
    if (xmlText.includes('E_ACCESSDENIED')) {
      if (xmlText.includes('MAC check failed')) {
        throw new Error('Invalid Laximo credentials: MAC check failed')
      }
      if (xmlText.includes('You don`t have active subscription')) {
        throw new Error('No active Laximo subscription')
      }
      throw new Error('Access denied to Laximo API')
    }
    
    return this.parseListCatalogsResponse(xmlText)
  }

  /**
   * Получает информацию о каталоге
   */
  async getCatalogInfo(catalogCode: string): Promise<LaximoCatalogInfo | null> {
    const command = `GetCatalogInfo:Locale=ru_RU|Catalog=${catalogCode}|withPermissions=true`
    const hmac = this.createHMAC(command)
    
    console.log('🔍 Получаем информацию о каталоге:', catalogCode)
    console.log('📝 Command:', command)
    console.log('🔗 HMAC:', hmac)
    
    try {
      const response = await this.makeBasicSOAPRequest(this.soap11Url, this.createSOAP11Envelope(command, this.login, hmac), 'urn:QueryDataLogin')
      console.log('📥 Получен ответ от Laximo API для каталога')
      console.log('📋 Response length:', response.length)
      
      const result = this.parseCatalogInfoResponse(response)
      console.log('🎯 Результат парсинга каталога:', result ? 'успешно' : 'неудачно')
      
      return result
    } catch (error) {
      console.error('❌ Ошибка получения информации о каталоге:', error)
      return null
    }
  }

  /**
   * Получает параметры для поиска автомобиля по wizard
   */
  async getWizard2(catalogCode: string, ssd: string = ''): Promise<LaximoWizardStep[]> {
    const command = `GetWizard2:Locale=ru_RU|Catalog=${catalogCode}|ssd=${ssd}`
    const hmac = this.createHMAC(command)
    
    console.log('🔍 Получаем параметры wizard для каталога:', catalogCode)
    
    try {
      const response = await this.makeBasicSOAPRequest(this.soap11Url, this.createSOAP11Envelope(command, this.login, hmac), 'urn:QueryDataLogin')
      return this.parseWizard2Response(response)
    } catch (error) {
      console.error('Ошибка получения параметров wizard:', error)
      return []
    }
  }

  /**
   * Глобальный поиск автомобилей по VIN/Frame во всех каталогах
   * @see https://doc.laximo.ru/ru/cat/FindVehicle
   */
  async findVehicleGlobal(vin: string): Promise<LaximoVehicleSearchResult[]> {
    try {
      console.log('🌍 Глобальный поиск автомобиля по VIN/Frame:', vin)
      
      const command = `FindVehicle:Locale=ru_RU|IdentString=${vin}`
      const hmac = this.createHMAC(command)
      
      console.log('📝 Global FindVehicle Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      return this.parseVehicleSearchResponse(xmlText)
    } catch (error) {
      console.error('❌ Ошибка глобального поиска автомобиля по VIN/Frame:', error)
      return []
    }
  }

  /**
   * Поиск автомобиля по VIN/Frame согласно документации Laximo
   * @see https://doc.laximo.ru/ru/cat/FindVehicle
   */
  async findVehicle(catalogCode: string, vin: string): Promise<LaximoVehicleSearchResult[]> {
    try {
      console.log('🔍 Поиск автомобиля по VIN/Frame:', vin)
      console.log('📋 Каталог:', catalogCode)
      
      // Согласно документации используем IdentString вместо vin
      const command = `FindVehicle:Locale=ru_RU|Catalog=${catalogCode}|IdentString=${vin}`
      const hmac = this.createHMAC(command)
      
      console.log('📝 FindVehicle Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      const vehicles = this.parseVehicleSearchResponse(xmlText)
      
      if (vehicles.length === 0) {
        console.log('⚠️ Автомобили не найдены по VIN/Frame:', vin)
        
        // Попробуем поиск без указания каталога (поиск во всех каталогах)
        console.log('🔄 Пробуем поиск во всех каталогах...')
        const globalCommand = `FindVehicle:Locale=ru_RU|IdentString=${vin}`
        const globalHmac = this.createHMAC(globalCommand)
        
        console.log('📝 Global FindVehicle Command:', globalCommand)
        
        const globalSoapEnvelope = this.createSOAP11Envelope(globalCommand, this.login, globalHmac)
        const globalXmlText = await this.makeBasicSOAPRequest(this.soap11Url, globalSoapEnvelope, 'urn:QueryDataLogin')
        
        return this.parseVehicleSearchResponse(globalXmlText)
      }
      
      console.log(`✅ Найдено ${vehicles.length} автомобилей`)
      return vehicles
    } catch (error) {
      console.error('❌ Ошибка поиска автомобиля по VIN/Frame:', error)
      return []
    }
  }

  /**
   * Поиск автомобилей по wizard (SSD)
   */
  async findVehicleByWizard(catalogCode: string, ssd: string): Promise<LaximoVehicleSearchResult[]> {
    const command = `FindVehicleByWizard2:Locale=ru_RU|Catalog=${catalogCode}|ssd=${ssd}`
    const hmac = this.createHMAC(command)
    
    console.log('🔍 Поиск автомобилей по wizard SSD:', ssd)
    
    try {
      const response = await this.makeBasicSOAPRequest(this.soap11Url, this.createSOAP11Envelope(command, this.login, hmac), 'urn:QueryDataLogin')
      const vehicles = this.parseVehicleSearchResponse(response)
      
      // Используем SSD из ответа API, если он есть, иначе используем поисковый SSD
      return vehicles.map(vehicle => ({
        ...vehicle,
        ssd: vehicle.ssd || ssd
      }))
    } catch (error) {
      console.error('Ошибка поиска по wizard:', error)
      return []
    }
  }

  /**
   * Получает информацию о конкретном автомобиле
   */
  async getVehicleInfo(catalogCode: string, vehicleId: string, ssd?: string, localized: boolean = true): Promise<LaximoVehicleInfo | null> {
    console.log('🔍 Получаем информацию об автомобиле:', vehicleId)
    console.log('📋 Входные параметры - SSD:', ssd ? `${ssd.substring(0, 50)}...` : 'отсутствует')
    
    // Для автомобилей найденных через wizard, SSD является обязательным
    if (!ssd || ssd.trim() === '') {
      console.log('⚠️ SSD не предоставлен, но может быть обязательным для этого автомобиля')
      // Возвращаем базовую информацию
      return {
        vehicleid: vehicleId,
        name: `Автомобиль ${catalogCode}`,
        ssd: '',
        brand: catalogCode.replace(/\d+$/, ''),
        catalog: catalogCode,
        attributes: []
      }
    }
    
    const command = `GetVehicleInfo:Locale=ru_RU|Catalog=${catalogCode}|VehicleId=${vehicleId}|ssd=${ssd}|Localized=${localized}`
    const hmac = this.createHMAC(command)
    
    console.log('📝 Command:', command)
    console.log('🔗 HMAC:', hmac)
    
    try {
      const response = await this.makeBasicSOAPRequest(this.soap11Url, this.createSOAP11Envelope(command, this.login, hmac), 'urn:QueryDataLogin')
      return this.parseVehicleInfoResponse(response)
    } catch (error) {
      console.error('Ошибка получения информации об автомобиле:', error)
      
      // Возвращаем базовую информацию об автомобиле если API недоступен
      console.log('⚠️ Возвращаем базовую информацию об автомобиле')
      return {
        vehicleid: vehicleId,
        name: `Автомобиль ${catalogCode}`,
        ssd: ssd || '',
        brand: catalogCode.replace(/\d+$/, ''),
        catalog: catalogCode,
        attributes: []
      }
    }
  }

  /**
   * Получает список узлов каталога (альтернатива для групп быстрого поиска)
   */
  async getListUnits(catalogCode: string, vehicleId?: string, ssd?: string, categoryId?: string): Promise<LaximoQuickGroup[]> {
    try {
      console.log('🔍 LaximoService.getListUnits - начало запроса:', catalogCode)
      console.log('📋 Параметры:', { vehicleId, categoryId, ssd: ssd ? `${ssd.substring(0, 30)}...` : 'отсутствует' })
      
      // Формируем команду в зависимости от наличия vehicleId, SSD и categoryId
      let command = `ListUnits:Locale=ru_RU|Catalog=${catalogCode}`
      if (vehicleId) {
        command += `|VehicleId=${vehicleId}`
      }
      
      // 🎯 ИСПРАВЛЕНИЕ: Для категорий каталога требуется SSD согласно API Laximo
      // Без SSD API возвращает ошибку E_INVALIDPARAMETER:ssd
      if (categoryId) {
        command += `|CategoryId=${categoryId}`
        // SSD обязателен для ListUnits даже с CategoryId
        if (ssd && ssd.trim() !== '') {
          const escapedSsd = this.escapeSsdForXML(ssd)
          command += `|ssd=${escapedSsd}`
          console.log('🔧 Режим "От производителя": используем CategoryId с SSD')
        } else {
          // Если SSD отсутствует, используем пустой SSD
          command += `|ssd=`
          console.log('🔧 Режим "От производителя": используем CategoryId с пустым SSD')
        }
      } else if (ssd && ssd.trim() !== '') {
        // SSD добавляем для QuickGroup'ов
        const escapedSsd = this.escapeSsdForXML(ssd)
        command += `|ssd=${escapedSsd}`
        console.log('🔧 Режим "Общие": используем SSD для получения узлов автомобиля')
      } else {
        // Всегда добавляем SSD параметр, даже если он пустой
        command += `|ssd=`
        console.log('🔧 Добавляем пустой SSD параметр')
      }
      
      const hmac = this.createHMAC(command)
      
      console.log('📝 ListUnits Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      
      console.log('🌐 Отправляем SOAP запрос...')
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      console.log('📥 Получен ответ от Laximo, начинаем парсинг...')
      const result = this.parseListUnitsResponse(xmlText)
      
      console.log('✅ LaximoService.getListUnits - завершено, получено узлов:', result.length)
      
      if (result.length > 0) {
        console.log('📦 Первый узел из LaximoService:', {
          quickgroupid: result[0].quickgroupid,
          name: result[0].name,
          code: result[0].code,
          hasImageUrl: !!result[0].imageurl,
          imageUrl: result[0].imageurl ? result[0].imageurl.substring(0, 80) + '...' : 'отсутствует'
        })
      }
      
      return result
    } catch (error) {
      console.error('❌ LaximoService.getListUnits - ошибка:', error)
      if (error instanceof Error) {
        console.error('❌ Подробности ошибки:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500)
        })
      }
      return []
    }
  }

  /**
   * Парсит ответ ListUnits и преобразует в формат LaximoQuickGroup
   */
  private parseListUnitsResponse(xmlText: string): LaximoQuickGroup[] {
    console.log('🔍 Парсим узлы каталога...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return []
    }

    // Ищем секцию ListUnits
    const unitsMatch = resultData.match(/<ListUnits?[^>]*>([\s\S]*?)<\/ListUnits?>/) ||
                       resultData.match(/<response[^>]*>([\s\S]*?)<\/response>/)
    
    if (!unitsMatch) {
      console.log('❌ Не найдена секция ListUnits')
      return []
    }

    const groups: LaximoQuickGroup[] = []
    const rowPattern = /<row([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/row>)/g
    let match
    
    while ((match = rowPattern.exec(unitsMatch[1])) !== null) {
      const attributes = match[1]
      const content = match[2] || ''
      
      // Извлекаем атрибуты согласно API Laximo ListUnits
      const unitid = this.extractAttribute(attributes, 'unitid') || this.extractAttribute(attributes, 'id')
      const name = this.extractAttribute(attributes, 'name') || this.extractAttribute(attributes, 'description')
      const code = this.extractAttribute(attributes, 'code')
      const imageurl = this.extractAttribute(attributes, 'imageurl')
      const largeimageurl = this.extractAttribute(attributes, 'largeimageurl')
      const ssd = this.extractAttribute(attributes, 'ssd') // ИСПРАВЛЕНИЕ: Извлекаем SSD узла
      const hasDetails = this.extractAttribute(attributes, 'hasdetails') === 'true'
      
      if (unitid && name) {
        const group: LaximoQuickGroup = {
          quickgroupid: unitid,
          name: name,
          link: hasDetails,
          code: code || undefined,
          imageurl: imageurl || undefined,
          largeimageurl: largeimageurl || undefined,
          ssd: ssd || undefined // ИСПРАВЛЕНИЕ: Добавляем SSD узла для дальнейшего использования
        }
        
        console.log('📦 Найден узел каталога:', { 
          unitid, 
          name, 
          code, 
          imageurl: imageurl ? imageurl.substring(0, 50) + '...' : 'отсутствует', 
          ssd: ssd ? `${ssd.substring(0, 50)}...` : 'отсутствует', // ИСПРАВЛЕНИЕ: Показываем SSD узла
          hasDetails 
        })
        groups.push(group)
      }
    }
    
    console.log(`✅ Обработано ${groups.length} узлов каталога`)
    return groups
  }

  /**
   * Получает список категорий каталога (альтернатива для групп быстрого поиска)
   */
  async getListCategories(catalogCode: string, vehicleId?: string, ssd?: string): Promise<LaximoQuickGroup[]> {
    try {
      console.log('🔍 Получаем категории каталога:', catalogCode)
      console.log('📋 Параметры:', { vehicleId, ssd: ssd ? `${ssd.substring(0, 30)}...` : 'отсутствует' })
      
      // Формируем команду согласно документации Laximo
      // CategoryId=-1 необходим для получения полного списка категорий
      let command = `ListCategories:Locale=ru_RU|Catalog=${catalogCode}|CategoryId=-1`
      
      // Добавляем VehicleId и ssd если они предоставлены
      if (vehicleId) {
        command += `|VehicleId=${vehicleId}`
      }
      if (ssd && ssd.trim() !== '') {
        const escapedSsd = this.escapeSsdForXML(ssd)
        command += `|ssd=${escapedSsd}`
      }
      
      const hmac = this.createHMAC(command)
      
      console.log('📝 ListCategories Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      return this.parseListCategoriesResponse(xmlText)
    } catch (error) {
      console.error('Ошибка получения категорий каталога:', error)
      return []
    }
  }

  /**
   * Парсит ответ ListCategories и преобразует в формат LaximoQuickGroup
   */
  private parseListCategoriesResponse(xmlText: string): LaximoQuickGroup[] {
    console.log('🔍 Парсим категории каталога...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return []
    }

    // Ищем секцию ListCategories
    const categoriesMatch = resultData.match(/<ListCategories?[^>]*>([\s\S]*?)<\/ListCategories?>/) ||
                           resultData.match(/<response[^>]*>([\s\S]*?)<\/response>/)
    
    if (!categoriesMatch) {
      console.log('❌ Не найдена секция ListCategories')
      console.log('📋 Доступные данные результата (первые 500 символов):', resultData.substring(0, 500))
      return []
    }

    const groups: LaximoQuickGroup[] = []
    const rowPattern = /<row([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/row>)/g
    let match
    
    while ((match = rowPattern.exec(categoriesMatch[1])) !== null) {
      const attributes = match[1]
      const content = match[2] || ''
      
      // Извлекаем атрибуты согласно документации Laximo
      const categoryid = this.extractAttribute(attributes, 'categoryid')
      const name = this.extractAttribute(attributes, 'name')
      const childrens = this.extractAttribute(attributes, 'childrens') === 'true'
      const parentcategoryid = this.extractAttribute(attributes, 'parentcategoryid')
      
      console.log('🔍 Обрабатываем row:', { categoryid, name, childrens, parentcategoryid, attributes })
      
      if (categoryid && name) {
        const group: LaximoQuickGroup = {
          quickgroupid: categoryid,
          name: name,
          link: true // Для категорий всегда true, так как они могут содержать узлы
        }
        
        console.log('📦 Найдена категория каталога:', { categoryid, name, childrens, parentcategoryid })
        groups.push(group)
      }
    }
    
    console.log(`✅ Обработано ${groups.length} категорий каталога`)
    return groups
  }

  /**
   * Получает список групп быстрого поиска для автомобиля
   */
  async getListQuickGroup(catalogCode: string, vehicleId: string, ssd?: string): Promise<LaximoQuickGroup[]> {
    console.log('🔍 Получаем группы быстрого поиска для автомобиля:', vehicleId)
    console.log('📋 Входные параметры - SSD:', ssd ? `${ssd.substring(0, 50)}...` : 'отсутствует')
    
    // Для автомобилей найденных через wizard, SSD является обязательным
    if (!ssd || ssd.trim() === '') {
      console.log('⚠️ SSD не предоставлен, пробуем альтернативные методы...')
      
      // Попробуем общие группы каталога
      try {
        const catalogCommand = `ListQuickGroup:Locale=ru_RU|Catalog=${catalogCode}`
        const catalogHmac = this.createHMAC(catalogCommand)
        console.log('📝 Catalog command:', catalogCommand)
        
        const soapEnvelope = this.createSOAP11Envelope(catalogCommand, this.login, catalogHmac)
        const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
        
        return this.parseListQuickGroupResponse(xmlText)
      } catch (catalogError) {
        console.error('Ошибка получения общих групп каталога:', catalogError)
      }
      
      // Альтернативный способ - попробовать ListCategories
      try {
        return await this.getListCategories(catalogCode)
      } catch (categoriesError) {
        console.error('Ошибка получения категорий каталога:', categoriesError)
        return []
      }
    }

    try {
      // Экранируем специальные символы XML в SSD параметре
      const escapedSsd = this.escapeSsdForXML(ssd)
      const command = `ListQuickGroup:Locale=ru_RU|Catalog=${catalogCode}|VehicleId=${vehicleId}|ssd=${escapedSsd}`
      const hmac = this.createHMAC(command)
      
      console.log('📝 Исходный SSD:', ssd)
      console.log('📝 Экранированный SSD:', escapedSsd)
      
      console.log('📝 Laximo ListQuickGroup Command:', command)
      console.log('🔗 HMAC:', hmac)
      console.log('👤 Login:', this.login)
      console.log('🏭 SOAP URL:', this.soap11Url)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      console.log('📦 Создан SOAP envelope для ListQuickGroup')
      
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      console.log('🎯 Начинаем парсинг XML ответа от Laximo...')
      const result = this.parseListQuickGroupResponse(xmlText)
      console.log('✅ Парсинг завершен, получено групп:', result.length)
      
      return result
    } catch (error) {
      console.error('Ошибка получения групп быстрого поиска:', error)
      
      // Альтернативный способ - попробовать ListUnits
      console.log('🔄 Попытка получить узлы каталога как альтернативу...')
      try {
        return await this.getListUnits(catalogCode, vehicleId, ssd)
      } catch (unitsError) {
        console.error('Ошибка получения узлов каталога:', unitsError)
      }
      
      // Последний шанс - попробовать ListCategories
      console.log('🔄 Попытка получить категории каталога...')
      try {
        return await this.getListCategories(catalogCode, vehicleId, ssd)
      } catch (categoriesError) {
        console.error('Ошибка получения категорий каталога:', categoriesError)
      }
      
      return []
    }
  }

  /**
   * Получение групп быстрого поиска с RAW XML ответом
   */
  async getListQuickGroupWithXML(catalogCode: string, vehicleId: string, ssd?: string): Promise<{ groups: LaximoQuickGroup[], rawXML: string }> {
    console.log('🔍 Получаем группы быстрого поиска с RAW XML для автомобиля:', vehicleId)
    console.log('📋 Входные параметры - SSD:', ssd ? `${ssd.substring(0, 50)}...` : 'отсутствует')
    
    // Для автомобилей найденных через wizard, SSD является обязательным
    if (!ssd || ssd.trim() === '') {
      console.log('⚠️ SSD не предоставлен, пробуем альтернативные методы...')
      
      // Попробуем общие группы каталога
      try {
        const catalogCommand = `ListQuickGroup:Locale=ru_RU|Catalog=${catalogCode}`
        const catalogHmac = this.createHMAC(catalogCommand)
        console.log('📝 Catalog command:', catalogCommand)
        
        const soapEnvelope = this.createSOAP11Envelope(catalogCommand, this.login, catalogHmac)
        const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
        
        const groups = this.parseListQuickGroupResponse(xmlText)
        return { groups, rawXML: xmlText }
      } catch (catalogError) {
        console.error('Ошибка получения общих групп каталога:', catalogError)
        return { groups: [], rawXML: '' }
      }
    }

    try {
      // Экранируем специальные символы XML в SSD параметре
      const escapedSsd = this.escapeSsdForXML(ssd)
      const command = `ListQuickGroup:Locale=ru_RU|Catalog=${catalogCode}|VehicleId=${vehicleId}|ssd=${escapedSsd}`
      const hmac = this.createHMAC(command)
      
      console.log('📝 Исходный SSD:', ssd)
      console.log('📝 Экранированный SSD:', escapedSsd)
      console.log('📝 Laximo ListQuickGroup Command:', command)
      console.log('🔗 HMAC:', hmac)
      console.log('👤 Login:', this.login)
      console.log('🏭 SOAP URL:', this.soap11Url)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      console.log('📦 Создан SOAP envelope для ListQuickGroup')
      
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      console.log('🎯 Начинаем парсинг XML ответа от Laximo...')
      const groups = this.parseListQuickGroupResponse(xmlText)
      console.log('✅ Парсинг завершен, получено групп:', groups.length)
      
      return { groups, rawXML: xmlText }
    } catch (error) {
      console.error('Ошибка получения групп быстрого поиска:', error)
      return { groups: [], rawXML: '' }
    }
  }

  /**
   * Базовый SOAP запрос без парсинга каталогов
   */
  protected async makeBasicSOAPRequest(url: string, soapEnvelope: string, soapAction: string): Promise<string> {
    console.log('🌐 Laximo SOAP запрос к:', url)
    console.log('🎯 SOAPAction:', soapAction)
    console.log('📤 SOAP Envelope (первые 800 символов):')
    console.log(soapEnvelope.substring(0, 800))
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"${soapAction}"`
      },
      body: soapEnvelope
    })
    
    console.log('📡 HTTP Response Status:', response.status, response.statusText)
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      // Пытаемся получить тело ответа для диагностики
      let errorBody = ''
      try {
        errorBody = await response.text()
        console.error('🚨 Laximo API error body:', errorBody.substring(0, 1000))
      } catch (e) {
        console.error('🚨 Не удалось прочитать тело ошибки:', e)
      }
      throw new Error(`Laximo API error: ${response.status} ${response.statusText}`)
    }

    const xmlText = await response.text()
    
    console.log('📥 RAW XML ответ длиной:', xmlText.length, 'символов')
      console.log('📄 ПОЛНЫЙ XML ОТВЕТ:')
      console.log(xmlText)
      console.log('📄 ======= КОНЕЦ XML =======')
    console.log('📄 Первые 1000 символов XML:')
    console.log(xmlText.substring(0, 1000))
    
    // Проверяем на ошибки в ответе
    if (xmlText.includes('E_ACCESSDENIED')) {
      console.error('🚨 Access denied error в XML ответе')
      throw new Error('Access denied to Laximo API')
    }
    
    if (xmlText.includes('soap:Fault') || xmlText.includes('faultstring')) {
      console.error('🚨 SOAP Fault в ответе:', xmlText.substring(0, 1000))
      throw new Error('SOAP Fault in Laximo response')
    }
    
    return xmlText
  }

  /**
   * Парсит ответ GetCatalogInfo
   */
  private parseCatalogInfoResponse(xmlText: string): LaximoCatalogInfo | null {
    console.log('🔍 Начинаем парсинг ответа о каталоге...')
    
    const resultData = this.extractResultData(xmlText)
    console.log('📋 Извлеченные данные результата:', resultData ? 'найдены' : 'не найдены')
    
    if (!resultData) {
      console.log('❌ resultData is null, возвращаем null')
      return null
    }

    const catalogMatch = resultData.match(/<row([^>]*)>/);
    console.log('🎯 Найдено совпадений row:', catalogMatch ? 'да' : 'нет')
    
    if (!catalogMatch) {
      console.log('❌ catalogMatch is null, возвращаем null')
      return null
    }
    
    const attributes = catalogMatch[1];
    console.log('📦 Атрибуты каталога:', attributes)
    
    const getAttribute = (name: string): string => {
      const match = attributes.match(new RegExp(`${name}="([^"]*)"`, 'i'))
      return match ? match[1] : ''
    }

    const features = this.parseFeatures(resultData)
    const permissions = this.parsePermissions(resultData)

    const result = {
      brand: getAttribute('brand'),
      code: getAttribute('code'),
      icon: getAttribute('icon'),
      name: getAttribute('name'),
      supportdetailapplicability: getAttribute('supportdetailapplicability') === 'true',
      supportparameteridentification2: getAttribute('supportparameteridentification2') === 'true',
      supportquickgroups: getAttribute('supportquickgroups') === 'true',
      supportvinsearch: getAttribute('supportvinsearch') === 'true',
      supportplateidentification: getAttribute('supportplateidentification') === 'true' || undefined,
      vinexample: getAttribute('vinexample') || undefined,
      plateexample: getAttribute('plateexample') || undefined,
      features,
      permissions
    }
    
    console.log('✅ Результат парсинга каталога:', result)
    
    return result
  }

  /**
   * Парсит ответ GetWizard2
   */
  private parseWizard2Response(xmlText: string): LaximoWizardStep[] {
    const resultData = this.extractResultData(xmlText)
    if (!resultData) return []

    const rowMatches = resultData.match(/<row[^>]*>[\s\S]*?<\/row>/g)
    if (!rowMatches) return []

    const steps: LaximoWizardStep[] = []

    for (const rowMatch of rowMatches) {
      const rowTagMatch = rowMatch.match(/<row([^>]*)>/);
      if (!rowTagMatch) continue;
      
      const attributes = rowTagMatch[1];
      
      const getAttribute = (name: string): string => {
        const match = attributes.match(new RegExp(`${name}="([^"]*)"`, 'i'))
        return match ? match[1] : ''
      }

      const options = this.parseWizardOptions(rowMatch)

      steps.push({
        allowlistvehicles: getAttribute('allowlistvehicles') === 'true',
        automatic: getAttribute('automatic') === 'true',
        conditionid: getAttribute('conditionid'),
        determined: getAttribute('determined') === 'true',
        name: getAttribute('name'),
        type: getAttribute('type'),
        ssd: getAttribute('ssd') || undefined,
        value: getAttribute('value') || undefined,
        valueid: getAttribute('valueid') || undefined,
        options
      })
    }

    return steps
  }

  /**
   * Парсит ответ поиска автомобилей
   */
  private parseVehicleSearchResponse(xmlText: string): LaximoVehicleSearchResult[] {
    console.log('🔍 Парсим результаты поиска автомобилей...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return []
    }

    const rowMatches = resultData.match(/<row[^>]*>[\s\S]*?<\/row>/g)
    if (!rowMatches) {
      console.log('❌ Не найдены строки row в ответе')
      return []
    }

    console.log(`🎯 Найдено ${rowMatches.length} автомобилей`)
    const vehicles: LaximoVehicleSearchResult[] = []

    for (const rowMatch of rowMatches) {
      const rowTagMatch = rowMatch.match(/<row([^>]*)>/);
      if (!rowTagMatch) continue;
      
      const attributes = rowTagMatch[1];
      console.log('📦 Атрибуты автомобиля:', attributes.substring(0, 200));
      
      const getAttribute = (name: string): string => {
        const match = attributes.match(new RegExp(`${name}="([^"]*)"`, 'i'))
        return match ? match[1] : ''
      }

      // Парсим атрибуты из дочерних элементов <attribute>
      const attributeMap = new Map<string, string>()
      
      // Отладочное логирование
      console.log('🔍 Полный XML контент строки:', rowMatch.substring(0, 500))
      
      const attributeMatches = rowMatch.match(/<attribute[^>]*\/?>|<attribute[^>]*>[\s\S]*?<\/attribute>/g)
      
      if (attributeMatches) {
        console.log(`📋 Найдено ${attributeMatches.length} дочерних атрибутов`)
        console.log('🔍 Первые несколько атрибутов:', attributeMatches.slice(0, 3))
        
        for (const attrMatch of attributeMatches) {
          const attrTagMatch = attrMatch.match(/<attribute([^>]*)>/);
          if (!attrTagMatch) continue;
          
          const attrAttributes = attrTagMatch[1];
          
          const getAttrAttribute = (name: string): string => {
            const match = attrAttributes.match(new RegExp(`${name}="([^"]*)"`, 'i'))
            return match ? match[1] : ''
          }

          const key = getAttrAttribute('key')
          const value = getAttrAttribute('value')
          
          if (key && value) {
            attributeMap.set(key, value)
            console.log(`🔑 Атрибут: ${key} = ${value}`)
          }
        }
        console.log(`📊 Всего атрибутов в карте: ${attributeMap.size}`)
      } else {
        console.log('❌ Дочерние атрибуты не найдены')
        console.log('🔍 Проверим содержимое rowMatch:')
        console.log('   - Содержит <attribute:', rowMatch.includes('<attribute'))
        console.log('   - Длина rowMatch:', rowMatch.length)
      }

      // Получаем данные из атрибутов row и дочерних элементов attribute
      const vehicleName = getAttribute('name')
      
      // Ищем год в разных атрибутах
      const year = getAttribute('year') || 
                   attributeMap.get('manufactured') || 
                   attributeMap.get('date')?.split('.').pop() || 
                   attributeMap.get('modelyear') ||
                   attributeMap.get('productionyear') || ''
      
      // Ищем двигатель в разных атрибутах 
      const engine = getAttribute('engine') || 
                     attributeMap.get('engine') || 
                     attributeMap.get('engine_info') ||
                     attributeMap.get('enginecode') ||
                     attributeMap.get('enginetype') || ''
      
      const modification = getAttribute('modification') || attributeMap.get('modification') || ''
      const bodytype = getAttribute('bodytype') || attributeMap.get('bodytype') || ''
      
      // Логируем все доступные ключи для отладки
      if (attributeMap.size > 0) {
        console.log('🗝️ Все доступные ключи атрибутов:', Array.from(attributeMap.keys()).sort())
      }
      
      console.log('🔍 Извлеченные значения:')
      console.log(`  - year: "${year}" (из: getAttribute('year')="${getAttribute('year')}", manufactured="${attributeMap.get('manufactured')}", date="${attributeMap.get('date')}")`)
      console.log(`  - engine: "${engine}" (из: getAttribute('engine')="${getAttribute('engine')}", engine="${attributeMap.get('engine')}", engine_info="${attributeMap.get('engine_info')}")`)
      console.log(`  - modification: "${modification}"`)
      console.log(`  - bodytype: "${bodytype}"`)
      
      const vehicle = {
        vehicleid: getAttribute('vehicleid'),
        name: vehicleName || undefined,
        brand: getAttribute('brand'),
        catalog: getAttribute('catalog') || undefined,
        model: vehicleName || getAttribute('model'),
        modification: modification,
        year: year,
        bodytype: bodytype,
        engine: engine,
        notes: getAttribute('notes') || undefined,
        ssd: getAttribute('ssd') || undefined,
        
        // Дополнительные атрибуты из документации Laximo
        grade: attributeMap.get('grade') || undefined,
        transmission: attributeMap.get('transmission') || undefined,
        creationregion: attributeMap.get('creationregion') || undefined,
        destinationregion: attributeMap.get('destinationregion') || undefined,
        date: attributeMap.get('date') || undefined,
        manufactured: attributeMap.get('manufactured') || undefined,
        framecolor: attributeMap.get('framecolor') || undefined,
        trimcolor: attributeMap.get('trimcolor') || undefined,
        datefrom: attributeMap.get('datefrom') || undefined,
        dateto: attributeMap.get('dateto') || undefined,
        engine_info: attributeMap.get('engine_info') || undefined,
        engineno: attributeMap.get('engineno') || undefined,
        options: attributeMap.get('options') || undefined,
        modelyearfrom: attributeMap.get('modelyearfrom') || undefined,
        modelyearto: attributeMap.get('modelyearto') || undefined,
        description: attributeMap.get('description') || undefined,
        market: attributeMap.get('market') || undefined,
        prodRange: attributeMap.get('prodrange') || undefined, // Используем ключ в нижнем регистре из API
        prodPeriod: attributeMap.get('prodPeriod') || undefined,
        carpet_color: attributeMap.get('carpet_color') || undefined,
        seat_combination_code: attributeMap.get('seat_combination_code') || undefined,
        attributes: Array.from(attributeMap.entries()).map(([key, value]) => {
          // Маппинг ключей к человеко-читаемым названиям
          const keyNameMap: Record<string, string> = {
            'model': 'Модель',
            'MVS': 'Код в каталоге',
            'MVSDesc': 'Описание',
            'specialVersion': 'Версия',
            'engine': 'Двигатель',
            'variant': 'Исполнение',
            'transmission': 'КПП',
            'bodytype': 'Тип кузова',
            'year': 'Год',
            'manufactured': 'Год выпуска',
            'date': 'Дата',
            'market': 'Рынок',
            'grade': 'Класс',
            'framecolor': 'Цвет кузова',
            'trimcolor': 'Цвет салона',
            'engine_info': 'Информация о двигателе',
            'engineno': 'Номер двигателя',
            'options': 'Опции',
            'description': 'Описание',
            'notes': 'Примечания',
            'creationregion': 'Регион производства',
            'destinationregion': 'Регион назначения',
            'datefrom': 'Дата с',
            'dateto': 'Дата по',
            'modelyearfrom': 'Модельный год с',
            'modelyearto': 'Модельный год по',
            'prodRange': 'Диапазон производства',
            'prodPeriod': 'Период производства'
          };
          
          return {
            key,
            name: keyNameMap[key] || key,
            value
          };
        })
      }
      
      console.log('🚗 Найден автомобиль:', {
        vehicleid: vehicle.vehicleid,
        name: vehicleName || `${vehicle.brand} ${vehicle.model}`,
        brand: vehicle.brand,
        catalog: vehicle.catalog,
        engine: engine,
        year: year,
        ssd: vehicle.ssd ? vehicle.ssd.substring(0, 50) + '...' : 'нет SSD',
        modification: modification,
        model: vehicle.model,
        // Дополнительные характеристики для проверки
        transmission: vehicle.transmission,
        market: vehicle.market,
        framecolor: vehicle.framecolor,
        trimcolor: vehicle.trimcolor,
        date: vehicle.date,
        manufactured: vehicle.manufactured,
        prodRange: vehicle.prodRange,
        prodPeriod: vehicle.prodPeriod,
        engine_info: vehicle.engine_info,
        engineno: vehicle.engineno
      })
      
      console.log('📊 Финальный объект автомобиля перед возвратом:', JSON.stringify(vehicle, null, 2))
      
      vehicles.push(vehicle)
    }

    console.log(`✅ Успешно обработано ${vehicles.length} автомобилей`)
    return vehicles
  }

  /**
   * Парсит ответ информации об автомобиле
   */
  private parseVehicleInfoResponse(xmlText: string): LaximoVehicleInfo | null {
    console.log('🔍 parseVehicleInfoResponse - начинаем парсинг...')
    console.log('📄 XML длина:', xmlText.length)
    console.log('📄 XML первые 500 символов:', xmlText.substring(0, 500))
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь resultData')
      return null
    }

    console.log('📋 resultData первые 500 символов:', resultData.substring(0, 500))

    const rowMatch = resultData.match(/<row([^>]*)>([\s\S]*?)<\/row>/)
    if (!rowMatch) {
      console.log('❌ Не найден тег <row>')
      return null
    }

    console.log('✅ Найден тег <row>')
    const attributes = rowMatch[1]
    const content = rowMatch[2]
    
    console.log('📋 Атрибуты row:', attributes)
    
    const getAttribute = (name: string): string => {
      const match = attributes.match(new RegExp(`${name}="([^"]*)"`, 'i'))
      return match ? match[1] : ''
    }
    
    const vehicleid = getAttribute('vehicleid')
    const name = getAttribute('name')
    const ssd = getAttribute('ssd')
    const brand = getAttribute('brand')
    const catalog = getAttribute('catalog')
    
    console.log('🔍 Извлеченные атрибуты:', {
      vehicleid,
      name,
      brand,
      catalog,
      ssd: ssd ? `${ssd.substring(0, 50)}...` : 'отсутствует',
      ssdLength: ssd?.length
    })

    // Парсим атрибуты автомобиля
    const vehicleAttributes: LaximoVehicleAttribute[] = []
    const attributeMatches = content.match(/<attribute[^>]*\/?>|<attribute[^>]*>[\s\S]*?<\/attribute>/g)
    
    if (attributeMatches) {
      for (const attrMatch of attributeMatches) {
        const attrTagMatch = attrMatch.match(/<attribute([^>]*)>/);
        if (!attrTagMatch) continue;
        
        const attrAttributes = attrTagMatch[1];
        
        const getAttrAttribute = (name: string): string => {
          const match = attrAttributes.match(new RegExp(`${name}="([^"]*)"`, 'i'))
          return match ? match[1] : ''
        }

        vehicleAttributes.push({
          key: getAttrAttribute('key'),
          name: getAttrAttribute('name'),
          value: getAttrAttribute('value')
        })
      }
    }

    return {
      vehicleid: getAttribute('vehicleid'),
      name: getAttribute('name'),
      ssd: getAttribute('ssd'),
      brand: getAttribute('brand'),
      catalog: getAttribute('catalog') || '',
      attributes: vehicleAttributes
    }
  }

  /**
   * Извлекает данные результата из XML
   */
  protected extractResultData(xmlText: string): string | null {
    console.log('🔍 Извлекаем данные результата из XML...')
    console.log('📄 XML длина:', xmlText.length)
    
    const soapResultMatch = xmlText.match(/<ns:return[^>]*>([\s\S]*?)<\/ns:return>/) || 
                           xmlText.match(/<return[^>]*>([\s\S]*?)<\/return>/)
    const responseMatch = xmlText.match(/<response[^>]*>([\s\S]*?)<\/response>/)
    
    console.log('🎯 soapResultMatch найден:', !!soapResultMatch)
    console.log('🎯 responseMatch найден:', !!responseMatch)
    
    if (soapResultMatch) {
      const result = soapResultMatch[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
      console.log('📋 Обработанный результат SOAP длина:', result.length)
      console.log('📋 Первые 500 символов:', result.substring(0, 500))
      return result
    } else if (responseMatch) {
      console.log('📋 Результат response длина:', responseMatch[1].length)
      return responseMatch[1]
    }
    
    console.log('❌ Данные результата не найдены')
    return null
  }

  /**
   * Парсит опции wizard
   */
  private parseWizardOptions(rowXml: string): LaximoWizardOption[] {
    const options: LaximoWizardOption[] = []
    
    const optionsMatch = rowXml.match(/<options[^>]*>([\s\S]*?)<\/options>/)
    if (!optionsMatch) return options

    const optionsData = optionsMatch[1]
    const optionMatches = optionsData.match(/<row[^>]*\/?>|<row[^>]*>[\s\S]*?<\/row>/g)
    
    if (!optionMatches) return options

    for (const optionMatch of optionMatches) {
      const getAttribute = (name: string): string => {
        const match = optionMatch.match(new RegExp(`${name}="([^"]*)"`, 'i'))
        return match ? match[1] : ''
      }

      options.push({
        key: getAttribute('key'),
        value: getAttribute('value')
      })
    }

    return options
  }

  /**
   * Парсит разрешения
   */
  private parsePermissions(xmlText: string): string[] {
    const permissions: string[] = []
    
    const permissionsMatch = xmlText.match(/<permissions[^>]*>([\s\S]*?)<\/permissions>/)
    if (!permissionsMatch) return permissions

    const permissionsData = permissionsMatch[1]
    const permissionMatches = permissionsData.match(/<permission[^>]*>([\s\S]*?)<\/permission>/g)
    
    if (!permissionMatches) return permissions

    for (const permissionMatch of permissionMatches) {
      const content = permissionMatch.replace(/<[^>]*>/g, '').trim()
      if (content) {
        permissions.push(content)
      }
    }

    return permissions
  }

  /**
   * Парсит ответ ListQuickGroup
   */
  private parseListQuickGroupResponse(xmlText: string): LaximoQuickGroup[] {
    console.log('🔍 Парсим группы быстрого поиска...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return []
    }

    // Ищем секцию ListQuickGroups
    const quickGroupsMatch = resultData.match(/<ListQuickGroups?[^>]*>([\s\S]*?)<\/ListQuickGroups?>/) ||
                            resultData.match(/<ListQuickGroup[^>]*>([\s\S]*?)<\/ListQuickGroup>/)
    
    if (!quickGroupsMatch) {
      console.log('❌ Не найдена секция ListQuickGroups')
      return []
    }

    console.log('✅ Найдена секция ListQuickGroups')

    const xmlContent = quickGroupsMatch[1]
    
    // Ищем корневую группу с quickgroupid="0" (может называться по-разному)
    const rootGroupPattern = /<row[^>]*quickgroupid="0"[^>]*>/
    const rootMatch = xmlContent.match(rootGroupPattern)
    
    if (!rootMatch) {
      console.log('❌ Не найдена корневая группа с quickgroupid="0"')
      console.log('🔍 Контент для поиска (первые 200 символов):')
      console.log(xmlContent.substring(0, 200))
      return []
    }

    console.log('✅ Найдена корневая группа:', rootMatch[0])
    
    // Начинаем парсить содержимое после корневой группы
    const rootIndex = xmlContent.indexOf(rootMatch[0])
    const afterRootTag = rootIndex + rootMatch[0].length
    
    // Парсим полную иерархию начиная с корневой группы
    const allCategories = this.parseRowHierarchy(xmlContent, afterRootTag)
    
    console.log(`📊 Найдено основных категорий: ${allCategories.length}`)
    allCategories.forEach((category, index) => {
      const childrenCount = this.countAllChildren(category)
      console.log(`${index + 1}. ${category.name} (ID: ${category.quickgroupid}, link: ${category.link}, подкатегорий: ${childrenCount})`)
    })
    
    // Возвращаем все категории с их полной иерархией
    return allCategories
  }

  /**
   * Рекурсивно парсит иерархию row элементов
   */
  private parseRowHierarchy(xmlContent: string, startPos: number): LaximoQuickGroup[] {
    const categories: LaximoQuickGroup[] = []
    let pos = startPos
    
    while (pos < xmlContent.length) {
      // Ищем следующий открывающий тег <row
      const rowStart = xmlContent.indexOf('<row', pos)
      if (rowStart === -1) break
      
      const rowTagEnd = xmlContent.indexOf('>', rowStart)
      if (rowTagEnd === -1) break
      
      const rowTag = xmlContent.substring(rowStart, rowTagEnd + 1)
      
      // Парсим текущую группу
      const group = this.parseRowTagToGroup(rowTag)
      if (!group) {
        pos = rowTagEnd + 1
        continue
      }
      
      console.log(`📦 Найден элемент: ${group.name} (ID: ${group.quickgroupid}, link: ${group.link})`)
      
      // Если это самозакрывающийся тег
      if (rowTag.endsWith('/>')) {
        categories.push(group)
        pos = rowTagEnd + 1
        continue
      }
      
      // Ищем соответствующий закрывающий тег </row>
      const closeTagPos = this.findMatchingCloseTag(xmlContent, rowTagEnd + 1)
      
      if (closeTagPos > rowTagEnd + 1) {
        // Есть содержимое между открывающим и закрывающим тегами
        const innerContent = xmlContent.substring(rowTagEnd + 1, closeTagPos)
        if (innerContent.includes('<row')) {
          console.log(`🔍 Парсим детей для ${group.name}...`)
          group.children = this.parseRowHierarchy(innerContent, 0)
        }
      }
      
      categories.push(group)
      
      // Переходим к позиции после закрывающего тега
      pos = closeTagPos + 6 // Длина "</row>"
    }
    
    return categories
  }

  /**
   * Находит позицию соответствующего закрывающего тега </row>
   */
  private findMatchingCloseTag(xmlContent: string, startPos: number): number {
    let depth = 1
    let pos = startPos
    
    while (pos < xmlContent.length && depth > 0) {
      const nextOpen = xmlContent.indexOf('<row', pos)
      const nextClose = xmlContent.indexOf('</row>', pos)
      
      // Если больше нет тегов
      if (nextClose === -1) break
      
      // Если есть открывающий тег раньше закрывающего
      if (nextOpen !== -1 && nextOpen < nextClose) {
        // Проверяем, что это не самозакрывающийся тег
        const tagEnd = xmlContent.indexOf('>', nextOpen)
        if (tagEnd !== -1) {
          const tag = xmlContent.substring(nextOpen, tagEnd + 1)
          if (!tag.endsWith('/>')) {
            depth++
          }
        }
        pos = nextOpen + 4 // Длина "<row"
      } else {
        depth--
        if (depth === 0) {
          return nextClose
        }
        pos = nextClose + 6 // Длина "</row>"
      }
    }
    
    return startPos
  }

  /**
   * Подсчитывает общее количество дочерних элементов рекурсивно
   */
  private countAllChildren(group: LaximoQuickGroup): number {
    if (!group.children || group.children.length === 0) {
      return 0
    }
    
    let count = group.children.length
    group.children.forEach(child => {
      count += this.countAllChildren(child)
    })
    
    return count
  }

  /**
   * Парсит row тег и извлекает атрибуты
   */
  private parseRowTagToGroup(rowTag: string): LaximoQuickGroup | null {
    try {
      const quickgroupid = this.extractAttribute(rowTag, 'quickgroupid')
      const name = this.extractAttribute(rowTag, 'name')
      const linkStr = this.extractAttribute(rowTag, 'link')
      const code = this.extractAttribute(rowTag, 'code')
      const imageurl = this.extractAttribute(rowTag, 'imageurl')
      const largeimageurl = this.extractAttribute(rowTag, 'largeimageurl')

      if (!quickgroupid || !name) {
        return null
      }

      return {
        quickgroupid,
        name,
        link: linkStr === 'true',
        code: code || undefined,
        imageurl: imageurl || undefined,
        largeimageurl: largeimageurl || undefined,
        children: undefined
      }
    } catch (error) {
      console.error('❌ Ошибка парсинга row тега:', error)
      return null
    }
  }

  /**
   * Получает список деталей в выбранной группе быстрого поиска
   */
  async getListQuickDetail(catalogCode: string, vehicleId: string, quickGroupId: string, ssd?: string): Promise<LaximoQuickDetail | null> {
    try {
      console.log('🔍 Получаем детали группы быстрого поиска:', quickGroupId)
      console.log('📋 Параметры:', { catalogCode, vehicleId, quickGroupId, ssd: ssd ? `${ssd.substring(0, 30)}...` : 'отсутствует' })
      
      if (!ssd || ssd.trim() === '') {
        console.log('❌ SSD обязателен для ListQuickDetail')
        throw new Error('SSD parameter is required for ListQuickDetail')
      }

      const command = `ListQuickDetail:Locale=ru_RU|Catalog=${catalogCode}|VehicleId=${vehicleId}|QuickGroupId=${quickGroupId}|ssd=${ssd}|Localized=true|All=1`
      const hmac = this.createHMAC(command)
      
      console.log('📝 ListQuickDetail Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      return this.parseListQuickDetailResponse(xmlText, quickGroupId)
    } catch (error) {
      console.error('Ошибка получения деталей группы быстрого поиска:', error)
      throw error
    }
  }

  /**
   * Парсит ответ ListQuickDetail
   */
  private parseListQuickDetailResponse(xmlText: string, quickGroupId: string): LaximoQuickDetail | null {
    console.log('🔍 Парсим детали группы быстрого поиска...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return null
    }

    // Декодируем HTML entities в XML для правильного парсинга
    const decodedXML = resultData
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    


    // Ищем секцию ListQuickDetail в декодированном XML
    const quickDetailMatch = decodedXML.match(/<ListQuickDetail[^>]*>([\s\S]*?)<\/ListQuickDetail>/) ||
                            decodedXML.match(/<response[^>]*>([\s\S]*?)<\/response>/)
    
    if (!quickDetailMatch) {
      console.log('❌ Не найдена секция ListQuickDetail')
      return null
    }

    const quickDetail: LaximoQuickDetail = {
      quickgroupid: quickGroupId,
      name: '',
      units: []
    }

    // Ищем категории (Category)
    const categoryPattern = /<Category([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/Category>)/g
    let categoryMatch

    while ((categoryMatch = categoryPattern.exec(quickDetailMatch[1])) !== null) {
      const categoryAttributes = categoryMatch[1]
      const categoryContent = categoryMatch[2] || ''
      
      const categoryName = this.extractAttribute(categoryAttributes, 'name')
      console.log('📂 Найдена категория:', categoryName)

      // В каждой категории ищем узлы (Unit)
      const unitPattern = /<Unit([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/Unit>)/g
      let unitMatch

      while ((unitMatch = unitPattern.exec(categoryContent)) !== null) {
        const unitAttributes = unitMatch[1]
        const unitContent = unitMatch[2] || ''
        
        const unitId = this.extractAttribute(unitAttributes, 'unitid')
        const unitName = this.extractAttribute(unitAttributes, 'name')
        const unitCode = this.extractAttribute(unitAttributes, 'code')
        const unitSsd = this.extractAttribute(unitAttributes, 'ssd') // ИСПРАВЛЕНИЕ: Извлекаем SSD узла
        let imageUrl = this.extractAttribute(unitAttributes, 'imageurl')
        let largeImageUrl = this.extractAttribute(unitAttributes, 'largeimageurl')
        
        // Декодируем HTML entities в URL изображений
        if (imageUrl) {
          imageUrl = imageUrl.replace(/&amp;/g, '&')
        }
        if (largeImageUrl) {
          largeImageUrl = largeImageUrl.replace(/&amp;/g, '&')
        }
        
        console.log('🔧 Найден узел:', { 
          unitId, 
          unitName, 
          unitCode, 
          unitSsd: unitSsd ? `${unitSsd.substring(0, 50)}...` : 'отсутствует',
          unitSsdLength: unitSsd?.length,
          imageUrl, 
          largeImageUrl 
        })

        const unit: LaximoUnit = {
          unitid: unitId,
          name: unitName,
          code: unitCode,
          ssd: unitSsd, // ИСПРАВЛЕНИЕ: Добавляем SSD узла в объект
          imageurl: imageUrl || undefined,
          largeimageurl: largeImageUrl || undefined,
          details: []
        }

        console.log('🔍 Содержимое узла (первые 1000 символов):')
        console.log(unitContent.substring(0, 1000))
        console.log('🔍 Ищем детали в содержимом узла...')
        
        // ВАЖНО: Детали могут быть как внутри Unit content, так и в атрибутах самого Unit
        // Сначала ищем в содержимом узла
        const detailTagCount = (unitContent.match(/<Detail/g) || []).length
        console.log(`🔍 Общее количество тегов <Detail в содержимом: ${detailTagCount}`)

        // Также проверяем весь блок Unit на предмет деталей
        const fullUnitBlock = unitMatch[0] // Полный блок Unit включая все его содержимое
        const fullUnitDetailCount = (fullUnitBlock.match(/<Detail/g) || []).length
        console.log(`🔍 Общее количество тегов <Detail в полном блоке Unit: ${fullUnitDetailCount}`)

        // Будем искать детали в полном блоке Unit, а не только в unitContent
        const searchContent = fullUnitBlock
        console.log('🔍 Поиск деталей в полном блоке Unit (первые 500 символов):')
        console.log(searchContent.substring(0, 500))

        const detailMatches: Array<{attributes: string, content: string, fullMatch: string}> = []
        
        // ИСПРАВЛЕНО: Ищем все теги Detail (самозакрывающиеся и полные) в одном регулярном выражении
        const detailPattern = /<Detail([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/Detail>)/g
        let match
        while ((match = detailPattern.exec(searchContent)) !== null) {
          detailMatches.push({
            attributes: match[1] || '',
            content: match[2] || '',
            fullMatch: match[0]
          })
        }
        
        console.log(`🔍 Найдено ${detailMatches.length} элементов Detail в узле`)
        
        let detailCount = 0
        for (const detailMatch of detailMatches) {
          detailCount++
          const detailAttributes = detailMatch.attributes || ''
          const detailContent = detailMatch.content || ''
          
          console.log(`🔍 Raw detail match #${detailCount}:`)
          console.log('Attributes:', detailAttributes.substring(0, 200))
          if (detailContent) {
            console.log('Content:', detailContent.substring(0, 200))
          }
          
          const detailId = this.extractAttribute(detailAttributes, 'detailid')
          const detailName = this.extractAttribute(detailAttributes, 'name')
          const oem = this.extractAttribute(detailAttributes, 'oem')
          const brand = this.extractAttribute(detailAttributes, 'brand')
          const codeonimage = this.extractAttribute(detailAttributes, 'codeonimage')
          
          console.log(`🔩 Найдена деталь #${detailCount}: ${detailName} (${oem})`)

          const detail: LaximoDetail = {
            detailid: detailId || codeonimage || oem,
            name: detailName,
            oem: oem,
            brand: brand,
            attributes: []
          }

          // Парсим атрибуты детали из тега Detail
          const amount = this.extractAttribute(detailAttributes, 'amount')
          const dateRange = this.extractAttribute(detailAttributes, 'date_range')
          const matchAttr = this.extractAttribute(detailAttributes, 'match')
          const range = this.extractAttribute(detailAttributes, 'range')
          const ssdAttr = this.extractAttribute(detailAttributes, 'ssd')
          
          // Добавляем все найденные атрибуты в деталь
          if (amount) {
            detail.amount = amount
            detail.attributes?.push({
              key: 'amount',
              name: 'Количество',
              value: amount
            })
          }
          
          if (dateRange) {
            detail.dateRange = dateRange
            detail.attributes?.push({
              key: 'date_range',
              name: 'date_range',
              value: dateRange
            })
          }
          
          if (matchAttr) {
            detail.match = matchAttr === 't' || matchAttr === 'true'
          }
          
          if (range) {
            detail.range = range
            detail.attributes?.push({
              key: 'range',
              name: 'Диапазон',
              value: range
            })
          }
          
          if (ssdAttr) {
            detail.ssd = ssdAttr
          }
          
          if (codeonimage) {
            detail.codeonimage = codeonimage
          }

          // Парсим дополнительные атрибуты из содержимого детали
          const attributePattern = /<attribute([^>]*?)(?:\s*\/>)/g
          let attrMatch

          while ((attrMatch = attributePattern.exec(detailContent)) !== null) {
            const attrAttributes = attrMatch[1]
            
            const key = this.extractAttribute(attrAttributes, 'key')
            const name = this.extractAttribute(attrAttributes, 'name')
            const value = this.extractAttribute(attrAttributes, 'value')
            
            if (key === 'applicablemodels') {
              detail.applicablemodels = value
            } else if (key === 'note') {
              detail.note = value
            } else {
              detail.attributes?.push({
                key,
                name: name || key,
                value
              })
            }
          }

          unit.details!.push(detail)
        }

        console.log(`📊 Найдено деталей в узле "${unitName}": ${detailCount}`)

        // Если детали не найдены, попробуем альтернативный подход
        if (detailCount === 0) {
          console.log('🔍 Детали не найдены стандартным способом, пробуем альтернативный парсинг...')
          
          // Поиск деталей в исходном XML блоке (до декодирования)
          const originalUnitBlock = unitMatch[0]
          console.log('🔍 Исходный XML блок (первые 1000 символов):')
          console.log(originalUnitBlock.substring(0, 1000))
          
          // Ищем детали в исходном формате
          const originalDetailPattern = /<Detail[^>]*(?:\s*\/>|>[\s\S]*?<\/Detail>)/g
          let originalMatch
          let altDetailCount = 0
          
          while ((originalMatch = originalDetailPattern.exec(originalUnitBlock)) !== null) {
            altDetailCount++
            const detailTag = originalMatch[0]
            console.log(`🔍 Альтернативный парсинг - найдена деталь #${altDetailCount}:`)
            console.log(detailTag.substring(0, 300))
            
            // Простой парсинг атрибутов из тега
            const nameMatch = detailTag.match(/name="([^"]*)"/)
            const oemMatch = detailTag.match(/oem="([^"]*)"/)
            const codeMatch = detailTag.match(/codeonimage="([^"]*)"/)
            const amountMatch = detailTag.match(/amount="([^"]*)"/)
            
            if (nameMatch || oemMatch) {
              const altDetail: LaximoDetail = {
                detailid: codeMatch?.[1] || oemMatch?.[1] || `alt_${altDetailCount}`,
                name: nameMatch?.[1] || 'Неизвестная деталь',
                oem: oemMatch?.[1] || '',
                attributes: []
              }
              
              if (amountMatch) {
                altDetail.attributes?.push({
                  key: 'amount',
                  name: 'Количество',
                  value: amountMatch[1]
                })
              }
              
              unit.details!.push(altDetail)
              console.log(`🔩 Альтернативный парсинг - добавлена деталь: ${altDetail.name} (${altDetail.oem})`)
            }
          }
          
          if (altDetailCount > 0) {
            console.log(`✅ Альтернативный парсинг нашел ${altDetailCount} деталей`)
          }
        }

        quickDetail.units!.push(unit)
      }
    }

    // Если структура не найдена, пробуем альтернативный формат
    if (quickDetail.units!.length === 0) {
      console.log('🔄 Пробуем альтернативный формат парсинга...')
      
      // Ищем узлы напрямую в декодированном XML
      const directUnitPattern = /<row([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/row>)/g
      let directUnitMatch

      while ((directUnitMatch = directUnitPattern.exec(quickDetailMatch[1])) !== null) {
        const unitAttributes = directUnitMatch[1]
        const unitContent = directUnitMatch[2] || ''
        
        const unitId = this.extractAttribute(unitAttributes, 'unitid') || 
                      this.extractAttribute(unitAttributes, 'id')
        const unitName = this.extractAttribute(unitAttributes, 'name') ||
                         this.extractAttribute(unitAttributes, 'description')
        
        if (unitId && unitName) {
          console.log('🔧 Найден узел (прямой формат):', { unitId, unitName })
          
          const unit: LaximoUnit = {
            unitid: unitId,
            name: unitName,
            details: []
          }
          
          quickDetail.units!.push(unit)
        }
      }
    }

    console.log(`✅ Обработано ${quickDetail.units!.length} узлов в группе ${quickGroupId}`)
    
    // Подсчитываем общее количество деталей
    const totalDetails = quickDetail.units!.reduce((total, unit) => total + (unit.details?.length || 0), 0)
    console.log(`📊 Общее количество деталей: ${totalDetails}`)
    
    // Выводим детальную информацию о каждом узле
    quickDetail.units!.forEach((unit, index) => {
      console.log(`📦 Узел #${index + 1}: ${unit.name} (${unit.details?.length || 0} деталей)`)
      unit.details?.forEach((detail, detailIndex) => {
        const amountAttr = detail.attributes?.find(attr => attr.key === 'amount')
        const amountStr = amountAttr ? ` - ${amountAttr.value}` : ''
        console.log(`  🔩 Деталь #${detailIndex + 1}: ${detail.name} (${detail.oem})${amountStr}`)
      })
    })
    
    // Дополнительная диагностика
    if (totalDetails === 0) {
      console.log('⚠️ НЕ НАЙДЕНО НИ ОДНОЙ ДЕТАЛИ!')
      console.log('🔍 Оригинальные данные (первые 1000 символов):')
      console.log(resultData?.substring(0, 1000))
      console.log('🔍 Декодированные данные (первые 1000 символов):')
      console.log(decodedXML.substring(0, 1000))
    } else {
      console.log(`✅ Успешно найдено ${totalDetails} деталей`)
    }
    
    if (quickDetail.units!.length === 0) {
      return null
    }

    // Устанавливаем имя группы если оно не было установлено
    if (!quickDetail.name && quickDetail.units!.length > 0) {
      quickDetail.name = `Группа ${quickGroupId}`
    }

    return quickDetail
  }

  /**
   * Поиск деталей по OEM номеру для выбранного автомобиля
   */
  async getOEMPartApplicability(catalogCode: string, vehicleId: string, oemNumber: string, ssd?: string): Promise<LaximoOEMResult | null> {
    try {
      console.log('🔍 Поиск детали по OEM номеру:', oemNumber)
      console.log('📋 Параметры:', { catalogCode, vehicleId, oemNumber, ssd: ssd ? `${ssd.substring(0, 30)}...` : 'отсутствует' })
      
      if (!ssd || ssd.trim() === '') {
        console.log('❌ SSD обязателен для GetOEMPartApplicability')
        throw new Error('SSD parameter is required for GetOEMPartApplicability')
      }

      const command = `GetOEMPartApplicability:Locale=ru_RU|Catalog=${catalogCode}|VehicleId=${vehicleId}|OEM=${oemNumber}|ssd=${ssd}`
      const hmac = this.createHMAC(command)
      
      console.log('📝 GetOEMPartApplicability Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      return this.parseOEMPartApplicabilityResponse(xmlText, oemNumber)
    } catch (error) {
      console.error('Ошибка поиска детали по OEM номеру:', error)
      throw error
    }
  }

  /**
   * Поиск деталей по названию для выбранного автомобиля
   */
  async searchVehicleDetails(catalogCode: string, vehicleId: string, searchQuery: string, ssd?: string): Promise<LaximoFulltextSearchResult | null> {
    try {
      console.log('🔍 Поиск деталей по названию:', searchQuery)
      console.log('📋 Параметры:', { catalogCode, vehicleId, searchQuery, ssd: ssd ? `${ssd.substring(0, 30)}...` : 'отсутствует' })
      
      // Для поиска по конкретному автомобилю (vehicleId != 0) SSD обязателен
      // Для поиска по каталогу (vehicleId = 0) SSD может отсутствовать
      if (vehicleId !== '0' && (!ssd || ssd.trim() === '')) {
        console.log('❌ SSD обязателен для поиска по конкретному автомобилю')
        throw new Error('SSD parameter is required for vehicle-specific search')
      }

      // Попробуем разные варианты кодировки поискового запроса
      const searchQueries = [
        searchQuery, // Оригинальный запрос
        encodeURIComponent(searchQuery), // URL кодирование
        searchQuery.toLowerCase(), // В нижнем регистре
        searchQuery.toUpperCase() // В верхнем регистре
      ]

      // Добавляем английские переводы для популярных терминов
      const translations: { [key: string]: string[] } = {
        'фильтр': ['filter'],
        'масляный': ['oil'],
        'воздушный': ['air'],
        'топливный': ['fuel'],
        'тормозной': ['brake'],
        'амортизатор': ['shock', 'absorber'],
        'сцепление': ['clutch'],
        'ремень': ['belt'],
        'свеча': ['spark plug', 'plug'],
        'датчик': ['sensor'],
        'насос': ['pump'],
        'радиатор': ['radiator'],
        'термостат': ['thermostat']
      }

      // Добавляем переводы если они есть
      const lowerQuery = searchQuery.toLowerCase()
      for (const [russian, english] of Object.entries(translations)) {
        if (lowerQuery.includes(russian)) {
          searchQueries.push(...english)
          searchQueries.push(...english.map(e => e.toUpperCase()))
        }
      }

      console.log('🔄 Попробуем разные варианты запроса:', searchQueries)

      for (const query of searchQueries) {
        console.log(`🔍 Пробуем поисковый запрос: "${query}"`)
        
        // Формируем команду с SSD или без него
        let command: string
        if (ssd && ssd.trim() !== '') {
          command = `SearchVehicleDetails:Locale=ru_RU|Catalog=${catalogCode}|VehicleId=${vehicleId}|Query=${query}|ssd=${ssd}`
        } else {
          command = `SearchVehicleDetails:Locale=ru_RU|Catalog=${catalogCode}|VehicleId=${vehicleId}|Query=${query}`
        }
        
        const hmac = this.createHMAC(command)
        
        console.log('📝 SearchVehicleDetails Command:', command)
        console.log('🔗 HMAC:', hmac)
        
        const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
        const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
        
        const result = this.parseSearchVehicleDetailsResponse(xmlText, query)
        
        if (result && result.details.length > 0) {
          console.log(`✅ Найдены результаты для запроса "${query}":`, result.details.length)
          return result
        } else {
          console.log(`❌ Нет результатов для запроса "${query}"`)
        }
      }

      // Если ни один запрос не дал результатов, попробуем поиск без SSD (для всего каталога)
      if (ssd && vehicleId !== '0') {
        console.log('🔄 Пробуем поиск по всему каталогу без SSD...')
        
        const catalogCommand = `SearchVehicleDetails:Locale=ru_RU|Catalog=${catalogCode}|VehicleId=0|Query=${encodeURIComponent(searchQuery)}`
        const catalogHmac = this.createHMAC(catalogCommand)
        
        console.log('📝 Catalog SearchVehicleDetails Command:', catalogCommand)
        console.log('🔗 Catalog HMAC:', catalogHmac)
        
        const catalogSoapEnvelope = this.createSOAP11Envelope(catalogCommand, this.login, catalogHmac)
        const catalogXmlText = await this.makeBasicSOAPRequest(this.soap11Url, catalogSoapEnvelope, 'urn:QueryDataLogin')
        
        const catalogResult = this.parseSearchVehicleDetailsResponse(catalogXmlText, searchQuery)
        
        if (catalogResult && catalogResult.details.length > 0) {
          console.log(`✅ Найдены результаты в каталоге:`, catalogResult.details.length)
          return catalogResult
        }
      }
      
      console.log('❌ Поиск не дал результатов')
      return null
    } catch (error) {
      console.error('Ошибка поиска деталей по названию:', error)
      throw error
    }
  }

  /**
   * Парсит ответ GetOEMPartApplicability
   */
  private parseOEMPartApplicabilityResponse(xmlText: string, oemNumber: string): LaximoOEMResult | null {
    console.log('🔍 Парсим результаты поиска по OEM номеру...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return null
    }

    // Ищем секцию GetOEMPartApplicability
    const oemResultMatch = resultData.match(/<GetOEMPartApplicability[^>]*>([\s\S]*?)<\/GetOEMPartApplicability>/) ||
                          resultData.match(/<response[^>]*>([\s\S]*?)<\/response>/)
    
    if (!oemResultMatch) {
      console.log('❌ Не найдена секция GetOEMPartApplicability')
      return null
    }

    const oemResult: LaximoOEMResult = {
      oemNumber: oemNumber,
      categories: []
    }

    // Ищем категории (Category)
    const categoryPattern = /<Category([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/Category>)/g
    let categoryMatch

    while ((categoryMatch = categoryPattern.exec(oemResultMatch[1])) !== null) {
      const categoryAttributes = categoryMatch[1]
      const categoryContent = categoryMatch[2] || ''
      
      const categoryId = this.extractAttribute(categoryAttributes, 'categoryid')
      const categoryName = this.extractAttribute(categoryAttributes, 'name')
      
      console.log('📂 Найдена категория:', { categoryId, categoryName })

      const category: LaximoOEMCategory = {
        categoryid: categoryId,
        name: categoryName,
        units: []
      }

      // В каждой категории ищем узлы (Unit)
      const unitPattern = /<Unit([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/Unit>)/g
      let unitMatch

      while ((unitMatch = unitPattern.exec(categoryContent)) !== null) {
        const unitAttributes = unitMatch[1]
        const unitContent = unitMatch[2] || ''
        
        const unitId = this.extractAttribute(unitAttributes, 'unitid')
        const unitName = this.extractAttribute(unitAttributes, 'name')
        const unitCode = this.extractAttribute(unitAttributes, 'code')
        const imageUrl = this.extractAttribute(unitAttributes, 'imageurl')
        
        console.log('🔧 Найден узел:', { unitId, unitName, unitCode })

        const unit: LaximoOEMUnit = {
          unitid: unitId,
          name: unitName,
          code: unitCode,
          imageurl: imageUrl,
          details: []
        }

        // В каждом узле ищем детали (Detail) - поддерживаем как самозакрывающиеся, так и полные теги
        // Используем более простой подход: сначала найдем все вхождения тега Detail
        console.log('🔍 Поиск деталей в полном блоке Unit (первые 500 символов):')
        console.log(unitMatch[0].substring(0, 500))
        
        // Ищем все теги Detail внутри текущего Unit
        const detailPattern = /<Detail[^>]*(?:\s*\/>|>[^<]*<\/Detail>)/g
        let detailMatch
        let detailCount = 0

        // Получаем содержимое Unit для поиска деталей
        const unitContentForDetails = unitMatch[2] || ''
        
        // Ищем все детали в содержимом Unit
        const allDetailMatches = [...unitContentForDetails.matchAll(/<Detail([^>]*?)(?:\s*\/>)/g)]
        console.log(`🔍 Найдено ${allDetailMatches.length} самозакрывающихся тегов Detail в Unit`)
        
        for (const detailMatch of allDetailMatches) {
          const detailAttributes = detailMatch[1]
          console.log(`🔍 Raw detail match #${detailCount + 1}:`)
          console.log('Attributes:', detailAttributes.substring(0, 150))
          
          // Извлекаем основные атрибуты детали
          const name = this.extractAttribute(detailAttributes, 'name')
          const oem = this.extractAttribute(detailAttributes, 'oem')
          const amount = this.extractAttribute(detailAttributes, 'amount')
          const codeonimage = this.extractAttribute(detailAttributes, 'codeonimage')
          const match = this.extractAttribute(detailAttributes, 'match')
          const dateRange = this.extractAttribute(detailAttributes, 'date_range')
          const ssd = this.extractAttribute(detailAttributes, 'ssd')

          if (name && oem) {
                         const detail: LaximoDetail = {
               detailid: `${unitId}_${detailCount}`,
               name,
               oem,
               brand: '',
               amount: amount || '1pcs',
               range: dateRange || '',
               codeonimage: codeonimage || '',
               match: match === 't',
               dateRange: dateRange || '',
               ssd: ssd || '',
               applicablemodels: '',
               note: '',
            attributes: []
          }

            console.log(`🔩 Найдена деталь #${detailCount + 1}: ${detail.name} (${detail.oem})`)
            unit.details!.push(detail)
            detailCount++
          }
        }

        category.units.push(unit)
      }

      oemResult.categories.push(category)
    }

    // Если категории не найдены, пробуем альтернативный формат
    if (oemResult.categories.length === 0) {
      console.log('🔄 Пробуем альтернативный формат парсинга OEM результатов...')
      
      // Ищем узлы напрямую
      const directUnitPattern = /<row([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/row>)/g
      let directUnitMatch

      while ((directUnitMatch = directUnitPattern.exec(oemResultMatch[1])) !== null) {
        const unitAttributes = directUnitMatch[1]
        
        const unitId = this.extractAttribute(unitAttributes, 'unitid') || 
                      this.extractAttribute(unitAttributes, 'id')
        const unitName = this.extractAttribute(unitAttributes, 'name') ||
                         this.extractAttribute(unitAttributes, 'description')
        const oem = this.extractAttribute(unitAttributes, 'oem')
        
        if (unitId && unitName && oem) {
          console.log('🔧 Найден результат (прямой формат):', { unitId, unitName, oem })
          
          // Создаем категорию по умолчанию
          if (oemResult.categories.length === 0) {
            oemResult.categories.push({
              categoryid: 'default',
              name: 'Результаты поиска',
              units: []
            })
          }
          
          const unit: LaximoOEMUnit = {
            unitid: unitId,
            name: unitName,
            details: [{
              detailid: unitId,
              name: unitName,
              oem: oem
            }]
          }
          
          oemResult.categories[0].units.push(unit)
        }
      }
    }

    console.log(`✅ Найдено ${oemResult.categories.length} категорий для OEM ${oemNumber}`)
    
    if (oemResult.categories.length === 0) {
      return null
    }

    return oemResult
  }

  /**
   * Парсит ответ SearchVehicleDetails
   */
  private parseSearchVehicleDetailsResponse(xmlText: string, searchQuery: string): LaximoFulltextSearchResult | null {
    console.log('🔍 Парсим результаты поиска по названию деталей...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return null
    }

    console.log('📄 XML длина:', xmlText.length)
    console.log('📋 Первые 500 символов результата:', resultData.substring(0, 500))

    // Сначала сохраним полный XML для отладки
    console.log('🔍 Полный XML ответ для анализа:')
    console.log('===== НАЧАЛО XML =====')
    console.log(xmlText)
    console.log('===== КОНЕЦ XML =====')

    // Ищем секцию SearchVehicleDetails  
    const searchResultMatch = resultData.match(/<SearchVehicleDetails[^>]*>([\s\S]*?)<\/SearchVehicleDetails>/)
    
    if (!searchResultMatch) {
      console.log('❌ Не найдена секция SearchVehicleDetails')
      // Попробуем найти альтернативные секции
      const alternativeMatches = [
        resultData.match(/<Details[^>]*>([\s\S]*?)<\/Details>/),
        resultData.match(/<Parts[^>]*>([\s\S]*?)<\/Parts>/),
        resultData.match(/<Items[^>]*>([\s\S]*?)<\/Items>/),
        resultData.match(/<SearchResult[^>]*>([\s\S]*?)<\/SearchResult>/)
      ]
      
      for (let i = 0; i < alternativeMatches.length; i++) {
        const match = alternativeMatches[i]
        if (match) {
          console.log(`✅ Найдена альтернативная секция ${i + 1}:`, match[0].substring(0, 100))
          const searchContent = match[1].trim()
          return this.parseSearchContent(searchContent, searchQuery)
        }
      }
      
      return null
    }

    const searchContent = searchResultMatch[1].trim()
    console.log('📋 Содержимое SearchVehicleDetails:', searchContent)

    // Проверяем на пустой результат
    if (searchContent === '') {
      console.log('⚠️ SearchVehicleDetails пуст - полнотекстовый поиск не дал результатов или не поддерживается каталогом')
      return null
    }

    return this.parseSearchContent(searchContent, searchQuery)
  }

  /**
   * Парсит содержимое поиска в различных форматах
   */
  private parseSearchContent(searchContent: string, searchQuery: string): LaximoFulltextSearchResult | null {
    const searchResult: LaximoFulltextSearchResult = {
      searchQuery: searchQuery,
      details: []
    }

    console.log('🔍 Начинаем парсинг содержимого поиска...')
    console.log('📋 Содержимое для парсинга (первые 1000 символов):', searchContent.substring(0, 1000))

    // Формат 1: согласно документации Laximo - <row oem="4M0115301H">Труба маслоналивная</row>
    const documentationRowPattern = /<row\s+oem="([^"]+)"[^>]*>(.*?)<\/row>/g
    let docRowMatch

    while ((docRowMatch = documentationRowPattern.exec(searchContent)) !== null) {
      const oem = docRowMatch[1]
      const name = docRowMatch[2].trim()
      
      console.log('🔩 Найдена деталь (формат документации):', { oem, name })

      if (oem && name) {
        searchResult.details.push({
          oem: oem,
          name: name
        })
      }
    }

    // Формат 2: Альтернативный формат с атрибутами в row
    if (searchResult.details.length === 0) {
      console.log('🔄 Пробуем альтернативный формат с атрибутами...')
      
      const rowPattern = /<row([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/row>)/g
      let rowMatch

      while ((rowMatch = rowPattern.exec(searchContent)) !== null) {
        const rowAttributes = rowMatch[1]
        const rowContent = rowMatch[2] || ''
        
        console.log('🔍 Найден тег row:', { attributes: rowAttributes, content: rowContent })
        
        const oem = this.extractAttribute(rowAttributes, 'oem') ||
                    this.extractAttribute(rowAttributes, 'code') ||
                    this.extractAttribute(rowAttributes, 'articul') ||
                    this.extractAttribute(rowAttributes, 'article')
        const name = this.extractAttribute(rowAttributes, 'name') ||
                     this.extractAttribute(rowAttributes, 'description') ||
                     this.extractAttribute(rowAttributes, 'title') ||
                     rowContent.trim()
        const brand = this.extractAttribute(rowAttributes, 'brand') ||
                      this.extractAttribute(rowAttributes, 'manufacturer')
        
        console.log('🔩 Найдена деталь (формат атрибутов):', { oem, name, brand })

        if (oem && name) {
          searchResult.details.push({
            oem: oem,
            name: name,
            brand: brand,
            description: this.extractAttribute(rowAttributes, 'description')
          })
        }
      }
    }

    // Формат 3: Поиск отдельных атрибутов oem="XXX" name="YYY"
    if (searchResult.details.length === 0) {
      console.log('🔄 Пробуем поиск отдельных атрибутов...')
      
      const oemPattern = /(?:oem|code|articul|article)="([^"]+)"/gi
      const namePattern = /(?:name|description|title)="([^"]+)"/gi
      
      let oemMatch
      const oems: string[] = []
      
      while ((oemMatch = oemPattern.exec(searchContent)) !== null) {
        oems.push(oemMatch[1])
      }
      
      let nameMatch
      const names: string[] = []
      
      while ((nameMatch = namePattern.exec(searchContent)) !== null) {
        names.push(nameMatch[1])
      }
      
      console.log('🔍 Найдено OEM номеров:', oems.length)
      console.log('🔍 Найдено названий:', names.length)
      
      // Сопоставляем OEM и названия
      for (let i = 0; i < Math.min(oems.length, names.length); i++) {
        console.log('🔩 Найдена деталь (отдельные атрибуты):', { oem: oems[i], name: names[i] })
        
        searchResult.details.push({
          oem: oems[i],
          name: names[i]
        })
      }
    }

    // Формат 4: Простой текстовый формат или список строк
    if (searchResult.details.length === 0) {
      console.log('🔄 Пробуем простой текстовый формат...')
      
      // Ищем строки формата "номер - название" или "номер название"
      const textPattern = /([A-Z0-9]+)[\s\-]+(.+)/g
      const lines = searchContent.split(/[\r\n]+/)
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        if (trimmedLine.length > 5) { // Минимальная длина для валидной строки
          const match = textPattern.exec(trimmedLine)
          if (match) {
            const oem = match[1].trim()
            const name = match[2].trim()
            
            console.log('🔩 Найдена деталь (текстовый формат):', { oem, name })
            
            if (oem && name) {
              searchResult.details.push({
                oem: oem,
                name: name
              })
            }
          }
        }
        textPattern.lastIndex = 0 // Сброс регекса для следующей итерации
      }
    }

    console.log(`✅ Найдено ${searchResult.details.length} деталей по запросу "${searchQuery}"`)
    
    if (searchResult.details.length === 0) {
      console.log('⚠️ Не удалось распарсить детали из ответа Laximo')
      return null
    }

    return searchResult
  }

  /**
   * Поиск автомобиля по государственному номеру (в конкретном каталоге)
   * @see https://doc.laximo.ru/ru/cat/FindVehicleByPlateNumber
   */
  async findVehicleByPlateNumber(catalogCode: string, plateNumber: string): Promise<LaximoVehicleSearchResult[]> {
    try {
      console.log('🔍 Поиск автомобиля по госномеру в каталоге:', plateNumber, catalogCode)
      
      const command = `FindVehicleByPlateNumber:Locale=ru_RU|Catalog=${catalogCode}|PlateNumber=${plateNumber}|CountryCode=ru|Localized=true`
      const hmac = this.createHMAC(command)
      
      console.log('📝 FindVehicleByPlateNumber Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      const vehicles = this.parseVehicleSearchResponse(xmlText)
      
      console.log(`✅ Найдено ${vehicles.length} автомобилей по госномеру в каталоге ${catalogCode}`)
      return vehicles
    } catch (error) {
      console.error('❌ Ошибка поиска автомобиля по госномеру:', error)
      return []
    }
  }

  /**
   * Глобальный поиск автомобиля по государственному номеру (без указания каталога)
   * @see https://doc.laximo.ru/ru/cat/FindVehicleByPlateNumber
   */
  async findVehicleByPlateNumberGlobal(plateNumber: string): Promise<LaximoVehicleSearchResult[]> {
    try {
      console.log('🔍 Глобальный поиск автомобиля по госномеру:', plateNumber)
      
      const command = `FindVehicleByPlateNumber:Locale=ru_RU|PlateNumber=${plateNumber}|CountryCode=ru|Localized=true`
      const hmac = this.createHMAC(command)
      
      console.log('📝 FindVehicleByPlateNumber Global Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      const vehicles = this.parseVehicleSearchResponse(xmlText)
      
      console.log(`✅ Найдено ${vehicles.length} автомобилей по госномеру глобально`)
      return vehicles
    } catch (error) {
      console.error('❌ Ошибка глобального поиска автомобиля по госномеру:', error)
      return []
    }
  }

  /**
   * Поиск каталогов, содержащих указанный артикул
   * @see https://doc.laximo.ru/ru/cat/FindPartReferences
   */
  async findPartReferences(partNumber: string): Promise<string[]> {
    try {
      console.log('🔍 Поиск каталогов по артикулу:', partNumber)
      
      const command = `FindPartReferences:Locale=ru_RU|OEM=${partNumber}`
      const hmac = this.createHMAC(command)
      
      console.log('📝 FindPartReferences Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      const catalogs = this.parsePartReferencesResponse(xmlText)
      
      console.log(`✅ Найдено ${catalogs.length} каталогов с артикулом ${partNumber}`)
      return catalogs
    } catch (error) {
      console.error('❌ Ошибка поиска каталогов по артикулу:', error)
      return []
    }
  }

  /**
   * Поиск автомобилей по артикулу в указанном каталоге
   * @see https://doc.laximo.ru/ru/cat/FindApplicableVehicles
   */
  async findApplicableVehicles(catalogCode: string, partNumber: string): Promise<LaximoVehicleSearchResult[]> {
    try {
      console.log('🔍 Поиск автомобилей по артикулу:', partNumber, 'в каталоге:', catalogCode)
      
      const command = `FindApplicableVehicles:Locale=ru_RU|Catalog=${catalogCode}|OEM=${partNumber}`
      const hmac = this.createHMAC(command)
      
      console.log('📝 FindApplicableVehicles Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      const vehicles = this.parseVehicleSearchResponse(xmlText)
      
      console.log(`✅ Найдено ${vehicles.length} автомобилей по артикулу в каталоге ${catalogCode}`)
      return vehicles
    } catch (error) {
      console.error('❌ Ошибка поиска автомобилей по артикулу:', error)
      return []
    }
  }

    /**
   * Комплексный поиск автомобилей по артикулу (двухэтапный процесс)
   * 1. Поиск каталогов с артикулом через FindPartReferences
   * 2. Поиск автомобилей в найденных каталогах через FindApplicableVehicles
   * @see https://doc.laximo.ru/ru/UseCases/SearchString#поиск-автомобиля-по-артикулу
   */
  async findVehiclesByPartNumber(partNumber: string): Promise<LaximoVehiclesByPartResult> {
    try {
      console.log('🔍 Комплексный поиск автомобилей по артикулу:', partNumber)
      
      // Шаг 1: Поиск каталогов с артикулом
      const catalogs = await this.findPartReferences(partNumber)
      
      if (catalogs.length === 0) {
        console.log('❌ Каталоги с артикулом не найдены')
        console.log('ℹ️ Возможно, это артикул производителя запчастей, а не оригинальный OEM номер')
        return {
          partNumber,
          catalogs: [],
          totalVehicles: 0
        }
      }
      
      console.log(`📦 Найдено ${catalogs.length} каталогов с артикулом`)
      
      // Шаг 2: Поиск автомобилей в каждом каталоге
      const catalogResults: LaximoCatalogVehicleResult[] = []
      
      for (const catalogCode of catalogs) {
        console.log(`🔍 Поиск автомобилей в каталоге: ${catalogCode}`)
        
        try {
          const vehicles = await this.findApplicableVehicles(catalogCode, partNumber)
          
          if (vehicles.length > 0) {
            // Получаем информацию о каталоге для отображения бренда
            const catalogInfo = await this.getCatalogInfo(catalogCode)
            
            catalogResults.push({
              catalogCode,
              catalogName: catalogInfo?.name || catalogCode,
              brand: catalogInfo?.brand || catalogCode,
              vehicles,
              vehicleCount: vehicles.length
            })
            
            console.log(`✅ В каталоге ${catalogCode} найдено ${vehicles.length} автомобилей`)
          } else {
            console.log(`⚠️ В каталоге ${catalogCode} автомобили не найдены`)
          }
        } catch (error) {
          console.error(`❌ Ошибка поиска в каталоге ${catalogCode}:`, error)
        }
      }
      
      const totalVehicles = catalogResults.reduce((sum, catalog) => sum + catalog.vehicleCount, 0)
      
      console.log(`✅ Общий результат: найдено ${totalVehicles} автомобилей в ${catalogResults.length} каталогах`)
      
      return {
        partNumber,
        catalogs: catalogResults,
        totalVehicles
      }
    } catch (error) {
      console.error('❌ Ошибка комплексного поиска автомобилей по артикулу:', error)
      return {
        partNumber,
        catalogs: [],
        totalVehicles: 0
      }
    }
  }

  /**
   * Парсит ответ поиска каталогов по артикулу
   */
  private parsePartReferencesResponse(xmlText: string): string[] {
    console.log('🔍 Парсим результаты поиска каталогов по артикулу...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return []
    }

    console.log('📄 XML длина:', xmlText.length)
    console.log('📋 Обработанный результат SOAP длина:', resultData.length)
    console.log('📋 Первые 500 символов:', resultData.substring(0, 500))

    const catalogs: string[] = []
    
    // Ищем элементы CatalogReference с атрибутом code
    const catalogPattern = /<CatalogReference[^>]*?code="([^"]*)"[^>]*?>/g
    let match
    
    while ((match = catalogPattern.exec(resultData)) !== null) {
      const catalogCode = match[1]
      if (catalogCode && !catalogs.includes(catalogCode)) {
        catalogs.push(catalogCode)
        console.log('📦 Найден каталог:', catalogCode)
      }
    }
    
    console.log(`✅ Обработано ${catalogs.length} каталогов`)
    return catalogs
  }

  /**
   * Извлекает значение атрибута из строки атрибутов
   */
  protected extractAttribute(attributesString: string, attributeName: string): string {
    const regex = new RegExp(`${attributeName}="([^"]*)"`, 'i')
    const match = attributesString.match(regex)
    return match ? match[1] : ''
  }
}

export const laximoService = new LaximoService()
export const laximoDocService = new LaximoDocService()

// Добавляем методы для работы с деталями узлов
export class LaximoUnitService extends LaximoService {
  /**
   * Получает информацию об узле
   */
  async getUnitInfo(catalogCode: string, vehicleId: string, unitId: string, ssd?: string): Promise<LaximoUnit | null> {
    try {
      console.log('🔍 Получаем информацию об узле:', unitId)
      console.log('📋 Параметры:', { catalogCode, vehicleId, unitId, ssd: ssd ? `${ssd.substring(0, 30)}...` : 'отсутствует' })
      
      // Используем GetUnitInfo согласно документации Laximo
      let command = `GetUnitInfo:Locale=ru_RU|Catalog=${catalogCode}|VehicleId=${vehicleId}|UnitId=${unitId}`
      
      if (ssd && ssd.trim() !== '') {
        command += `|ssd=${ssd}`
      } else {
        command += `|ssd=`
      }
      
      // Включаем локализацию для получения переведенных названий параметров
      command += `|Localized=true`
      
      const hmac = this.createHMAC(command)
      
      console.log('📝 GetUnitInfo Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      return this.parseUnitInfoResponse(xmlText, unitId)
    } catch (error) {
      console.error('Ошибка получения информации об узле:', error)
      return null
    }
  }

  /**
   * Получает детали узла используя ListDetailByUnit API
   */
  async getUnitDetails(catalogCode: string, vehicleId: string, unitId: string, ssd?: string): Promise<LaximoDetail[]> {
    try {
      console.log('🔍 Получаем детали узла:', unitId)
      console.log('📋 Параметры:', { catalogCode, vehicleId, unitId, ssd: ssd ? `${ssd.substring(0, 30)}...` : 'отсутствует' })
      
      // Используем ListDetailByUnit согласно документации Laximo
      let command = `ListDetailByUnit:Locale=ru_RU|Catalog=${catalogCode}|VehicleId=${vehicleId}|UnitId=${unitId}`
      
      if (ssd && ssd.trim() !== '') {
        command += `|ssd=${ssd}`
      } else {
        command += `|ssd=`
      }
      
      // Включаем локализацию для получения переведенных названий параметров
      command += `|Localized=true`
      
      // Включаем связанные объекты для получения дополнительной информации
      command += `|WithLinks=true`
      
      const hmac = this.createHMAC(command)
      
      console.log('📝 ListDetailByUnit Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      return this.parseUnitDetailsResponse(xmlText)
    } catch (error) {
      console.error('Ошибка получения деталей узла:', error)
      return []
    }
  }

  /**
   * Получает карту изображений узла с координатами используя ListImageMapByUnit API
   */
  async getUnitImageMap(catalogCode: string, vehicleId: string, unitId: string, ssd?: string): Promise<LaximoUnitImageMap | null> {
    try {
      console.log('🔍 Получаем карту изображений узла:', unitId)
      console.log('📋 Параметры:', { catalogCode, vehicleId, unitId, ssd: ssd ? `${ssd.substring(0, 30)}...` : 'отсутствует' })
      
      // Используем ListImageMapByUnit согласно документации Laximo
      let command = `ListImageMapByUnit:Catalog=${catalogCode}|VehicleId=${vehicleId}|UnitId=${unitId}`
      
      if (ssd && ssd.trim() !== '') {
        command += `|ssd=${ssd}`
      } else {
        command += `|ssd=`
      }
      
      // Добавляем WithLinks=true согласно документации
      command += `|WithLinks=true`
      
      const hmac = this.createHMAC(command)
      
      console.log('📝 ListImageMapByUnit Command:', command)
      console.log('🔗 HMAC:', hmac)
      
      const soapEnvelope = this.createSOAP11Envelope(command, this.login, hmac)
      const xmlText = await this.makeBasicSOAPRequest(this.soap11Url, soapEnvelope, 'urn:QueryDataLogin')
      
      return this.parseUnitImageMapResponse(xmlText, unitId)
    } catch (error) {
      console.error('Ошибка получения карты изображений узла:', error)
      return null
    }
  }

  /**
   * Парсит ответ GetUnitInfo с информацией об узле
   */
  private parseUnitInfoResponse(xmlText: string, unitId: string): LaximoUnit | null {
    console.log('🔍 Парсим информацию об узле...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return null
    }

    // Ищем секцию GetUnitInfo
    const unitInfoMatch = resultData.match(/<GetUnitInfo[^>]*>([\s\S]*?)<\/GetUnitInfo>/) ||
                         resultData.match(/<response[^>]*>([\s\S]*?)<\/response>/)
    
    if (!unitInfoMatch) {
      console.log('❌ Не найдена секция GetUnitInfo')
      return null
    }

    const rowPattern = /<row([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/row>)/g
    const match = rowPattern.exec(unitInfoMatch[1])
    
    if (!match) {
      console.log('❌ Не найдена строка с данными узла')
      return null
    }
    
    const attributes = match[1]
    const content = match[2] || ''
    
    // Извлекаем атрибуты согласно документации GetUnitInfo
    const name = this.extractAttribute(attributes, 'name')
    const code = this.extractAttribute(attributes, 'code')
    const imageurl = this.extractAttribute(attributes, 'imageurl')
    const largeimageurl = this.extractAttribute(attributes, 'largeimageurl')
    const currentUnitId = this.extractAttribute(attributes, 'unitid')
    
    // Извлекаем атрибуты из содержимого
    const attributePattern = /<attribute\s+key="([^"]*?)"\s+name="([^"]*?)"\s+value="([^"]*?)"\s*\/?>/g
    const unitAttributes: LaximoDetailAttribute[] = []
    let attrMatch
    
    while ((attrMatch = attributePattern.exec(content)) !== null) {
      unitAttributes.push({
        key: attrMatch[1],
        name: attrMatch[2],
        value: attrMatch[3]
      })
    }
    
    // Ищем примечание в атрибутах
    const noteAttribute = unitAttributes.find(attr => attr.key === 'note')
    const description = noteAttribute?.value || ''
    
    console.log('📦 Найдена информация об узле:', { unitId: currentUnitId, name, code, imageurl })
    console.log('📋 Атрибуты узла:', unitAttributes)
    
    return {
      unitid: currentUnitId || unitId,
      name: name || '',
      code: code || '',
      description: description,
      imageurl: imageurl || undefined,
      largeimageurl: largeimageurl || undefined,
      details: [], // Детали загружаются отдельно
      attributes: unitAttributes
    }
  }

  /**
   * Парсит ответ ListDetailByUnit с деталями узла
   */
  private parseUnitDetailsResponse(xmlText: string): LaximoDetail[] {
    console.log('🔍 Парсим детали узла...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return []
    }

    // Ищем секцию ListDetailsByUnit
    const detailsMatch = resultData.match(/<ListDetailsByUnit[^>]*>([\s\S]*?)<\/ListDetailsByUnit>/) ||
                        resultData.match(/<response[^>]*>([\s\S]*?)<\/response>/)
    
    if (!detailsMatch) {
      console.log('❌ Не найдена секция ListDetailsByUnit')
      return []
    }

    const details: LaximoDetail[] = []
    const rowPattern = /<row([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/row>)/g
    let match
    
    while ((match = rowPattern.exec(detailsMatch[1])) !== null) {
      const attributes = match[1]
      const content = match[2] || ''
      
      // Извлекаем атрибуты детали согласно документации ListDetailByUnit
      const codeonimage = this.extractAttribute(attributes, 'codeonimage')
      const name = this.extractAttribute(attributes, 'name')
      const oem = this.extractAttribute(attributes, 'oem')
      const ssd = this.extractAttribute(attributes, 'ssd')
      
      // Дополнительные атрибуты
      const note = this.extractAttribute(attributes, 'note')
      const filter = this.extractAttribute(attributes, 'filter')
      const flag = this.extractAttribute(attributes, 'flag')
      const match_attr = this.extractAttribute(attributes, 'match')
      const designation = this.extractAttribute(attributes, 'designation')
      const applicablemodels = this.extractAttribute(attributes, 'applicablemodels')
      const partspec = this.extractAttribute(attributes, 'partspec')
      const color = this.extractAttribute(attributes, 'color')
      const shape = this.extractAttribute(attributes, 'shape')
      const standard = this.extractAttribute(attributes, 'standard')
      const material = this.extractAttribute(attributes, 'material')
      const size = this.extractAttribute(attributes, 'size')
      const featuredescription = this.extractAttribute(attributes, 'featuredescription')
      const prodstart = this.extractAttribute(attributes, 'prodstart')
      const prodend = this.extractAttribute(attributes, 'prodend')
      
      // Извлекаем атрибуты из содержимого
      const attributePattern = /<attribute\s+key="([^"]*?)"\s+name="([^"]*?)"\s+value="([^"]*?)"\s*\/?>/g
      const detailAttributes: LaximoDetailAttribute[] = []
      let attrMatch
      
      while ((attrMatch = attributePattern.exec(content)) !== null) {
        detailAttributes.push({
          key: attrMatch[1],
          name: attrMatch[2],
          value: attrMatch[3]
        })
      }
      
      if (codeonimage && name && oem) {
        const detail: LaximoDetail = {
          detailid: codeonimage, // Используем codeonimage как detailid
          name,
          oem,
          brand: '', // Бренд не указан в ListDetailByUnit
          description: note || '',
          applicablemodels: applicablemodels || '',
          note: note || '',
          attributes: detailAttributes
        }
        
        console.log('📦 Найдена деталь узла:', { codeonimage, name, oem, note })
        details.push(detail)
      }
    }
    
    console.log(`✅ Обработано ${details.length} деталей узла`)
    return details
  }

  /**
   * Парсит ответ ListImageMapByUnit с картой изображений узла
   */
  private parseUnitImageMapResponse(xmlText: string, unitId: string): LaximoUnitImageMap | null {
    console.log('🔍 Парсим карту изображений узла...')
    
    const resultData = this.extractResultData(xmlText)
    if (!resultData) {
      console.log('❌ Не удалось извлечь данные результата')
      return null
    }

    // Ищем секцию ListImageMapByUnit
    const imageMapMatch = resultData.match(/<ListImageMapByUnit[^>]*>([\s\S]*?)<\/ListImageMapByUnit>/) ||
                         resultData.match(/<response[^>]*>([\s\S]*?)<\/response>/)
    
    if (!imageMapMatch) {
      console.log('❌ Не найдена секция ListImageMapByUnit')
      return null
    }

    const coordinates: LaximoImageCoordinate[] = []
    const rowPattern = /<row([^>]*?)(?:\s*\/>|>([\s\S]*?)<\/row>)/g
    let match
    
    while ((match = rowPattern.exec(imageMapMatch[1])) !== null) {
      const attributes = match[1]
      
      // Извлекаем атрибуты согласно документации ListImageMapByUnit
      const code = this.extractAttribute(attributes, 'code')
      const type = this.extractAttribute(attributes, 'type')
      const x1 = parseInt(this.extractAttribute(attributes, 'x1') || '0')
      const y1 = parseInt(this.extractAttribute(attributes, 'y1') || '0')
      const x2 = parseInt(this.extractAttribute(attributes, 'x2') || '0')
      const y2 = parseInt(this.extractAttribute(attributes, 'y2') || '0')
      
      if (code) {
        coordinates.push({
          detailid: code, // Используем code как detailid
          codeonimage: code,
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1,
          shape: type === '0' ? 'rect' : 'circle' // Предполагаем, что type=0 это прямоугольник
        })
        
        console.log('📦 Найдена координата:', { code, type, x1, y1, x2, y2 })
      }
    }
    
    console.log(`✅ Обработано ${coordinates.length} координат изображения`)
    
    // Для ListImageMapByUnit изображение получается из GetUnitInfo
    return {
      unitid: unitId,
      imageurl: '', // Изображение берется из GetUnitInfo
      largeimageurl: '',
      coordinates
    }
  }
}

// Создаем экземпляр расширенного сервиса
export const laximoUnitService = new LaximoUnitService() 