import { gql } from '@apollo/client'

export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: ProductInput!, $images: [ProductImageInput!], $characteristics: [CharacteristicInput!], $options: [ProductOptionInput!]) {
    createProduct(input: $input, images: $images, characteristics: $characteristics, options: $options) {
      id
      name
      slug
      article
      description
      videoUrl
      wholesalePrice
      retailPrice
      weight
      dimensions
      unit
      isVisible
      applyDiscounts
      stock
      brand
      createdAt
      updatedAt
      categories {
        id
        name
        slug
      }
      images {
        id
        url
        alt
        order
      }
      characteristics {
        id
        value
        characteristic {
          id
          name
        }
      }
      options {
        id
        option {
          id
          name
          type
        }
        optionValue {
          id
          value
          price
        }
      }
    }
  }
`

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: ProductInput!, $images: [ProductImageInput!], $characteristics: [CharacteristicInput!], $options: [ProductOptionInput!]) {
    updateProduct(id: $id, input: $input, images: $images, characteristics: $characteristics, options: $options) {
      id
      name
      slug
      article
      description
      videoUrl
      wholesalePrice
      retailPrice
      weight
      dimensions
      unit
      isVisible
      applyDiscounts
      stock
      brand
      createdAt
      updatedAt
      categories {
        id
        name
        slug
      }
      images {
        id
        url
        alt
        order
      }
      characteristics {
        id
        value
        characteristic {
          id
          name
        }
      }
      options {
        id
        option {
          id
          name
          type
        }
        optionValue {
          id
          value
          price
        }
      }
    }
  }
`

export const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`

export const UPDATE_PRODUCT_VISIBILITY = gql`
  mutation UpdateProductVisibility($id: ID!, $isVisible: Boolean!) {
    updateProductVisibility(id: $id, isVisible: $isVisible) {
      id
      isVisible
    }
  }
`

export const CREATE_CATEGORY = gql`
  mutation CreateCategory($input: CategoryInput!) {
    createCategory(input: $input) {
      id
      name
      slug
      description
      seoTitle
      seoDescription
      image
      icon
      isHidden
      includeSubcategoryProducts
      parentId
      level
      createdAt
      updatedAt
      _count {
        products
      }
    }
  }
`

export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($id: ID!, $input: CategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
      name
      slug
      description
      seoTitle
      seoDescription
      image
      icon
      isHidden
      includeSubcategoryProducts
      parentId
      level
      createdAt
      updatedAt
      _count {
        products
      }
    }
  }
`

export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`

// Навигационные категории
export const CREATE_NAVIGATION_CATEGORY = gql`
  mutation CreateNavigationCategory($input: NavigationCategoryInput!) {
    createNavigationCategory(input: $input) {
      id
      partsIndexCatalogId
      partsIndexGroupId
      icon
      isHidden
      sortOrder
      createdAt
      updatedAt
      name
      catalogName
      groupName
    }
  }
`

export const UPDATE_NAVIGATION_CATEGORY = gql`
  mutation UpdateNavigationCategory($id: ID!, $input: NavigationCategoryInput!) {
    updateNavigationCategory(id: $id, input: $input) {
      id
      partsIndexCatalogId
      partsIndexGroupId
      icon
      isHidden
      sortOrder
      createdAt
      updatedAt
      name
      catalogName
      groupName
    }
  }
`

export const DELETE_NAVIGATION_CATEGORY = gql`
  mutation DeleteNavigationCategory($id: ID!) {
    deleteNavigationCategory(id: $id)
  }
`

export const DELETE_PRODUCTS = gql`
  mutation DeleteProducts($ids: [ID!]!) {
    deleteProducts(ids: $ids) {
      count
    }
  }
`

export const UPDATE_PRODUCTS_VISIBILITY = gql`
  mutation UpdateProductsVisibility($ids: [ID!]!, $isVisible: Boolean!) {
    updateProductsVisibility(ids: $ids, isVisible: $isVisible) {
      count
    }
  }
`

export const MOVE_PRODUCTS_TO_CATEGORY = gql`
  mutation MoveProductsToCategory($productIds: [ID!]!, $categoryId: ID!) {
    moveProductsToCategory(productIds: $productIds, categoryId: $categoryId) {
      count
      movedProducts {
        id
        name
        categories {
          id
          name
        }
      }
    }
  }
`

export const EXPORT_PRODUCTS = gql`
  mutation ExportProducts($categoryId: String, $search: String, $format: String) {
    exportProducts(categoryId: $categoryId, search: $search, format: $format) {
      url
      filename
      count
    }
  }
`

export const IMPORT_PRODUCTS = gql`
  mutation ImportProducts($input: ImportProductsInput!) {
    importProducts(input: $input) {
      success
      errors
      total
      warnings
    }
  }
`

// Мутации для клиентов
export const CREATE_CLIENT = gql`
  mutation CreateClient($input: ClientInput!, $vehicles: [ClientVehicleInput!], $discounts: [ClientDiscountInput!]) {
    createClient(input: $input, vehicles: $vehicles, discounts: $discounts) {
      id
      clientNumber
      type
      name
      email
      phone
      city
      markup
      isConfirmed
      profileId
      profile {
        id
        name
        baseMarkup
      }
      legalEntityType
      inn
      kpp
      ogrn
      okpo
      legalAddress
      actualAddress
      bankAccount
      bankName
      bankBik
      correspondentAccount
      vehicles {
        id
        vin
        frame
        licensePlate
        brand
        model
        year
      }
      discounts {
        id
        name
        type
        value
        isActive
        validFrom
        validTo
      }
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CLIENT = gql`
  mutation UpdateClient($id: ID!, $input: ClientInput!, $vehicles: [ClientVehicleInput!], $discounts: [ClientDiscountInput!]) {
    updateClient(id: $id, input: $input, vehicles: $vehicles, discounts: $discounts) {
      id
      clientNumber
      type
      name
      email
      phone
      city
      markup
      isConfirmed
      profileId
      profile {
        id
        name
        baseMarkup
      }
      legalEntityType
      inn
      kpp
      ogrn
      okpo
      legalAddress
      actualAddress
      bankAccount
      bankName
      bankBik
      correspondentAccount
      vehicles {
        id
        vin
        frame
        licensePlate
        brand
        model
        year
      }
      discounts {
        id
        name
        type
        value
        isActive
        validFrom
        validTo
      }
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CLIENT = gql`
  mutation DeleteClient($id: ID!) {
    deleteClient(id: $id)
  }
`

export const CONFIRM_CLIENT = gql`
  mutation ConfirmClient($id: ID!) {
    confirmClient(id: $id) {
      id
      isConfirmed
    }
  }
`

export const EXPORT_CLIENTS = gql`
  mutation ExportClients($filter: ClientFilterInput, $search: String, $format: String) {
    exportClients(filter: $filter, search: $search, format: $format) {
      url
      filename
      count
    }
  }
`

// Мутации для профилей клиентов
export const CREATE_CLIENT_PROFILE = gql`
  mutation CreateClientProfile($input: ClientProfileInput!) {
    createClientProfile(input: $input) {
      id
      code
      name
      description
      baseMarkup
      autoSendInvoice
      vinRequestModule
      priceRangeMarkups {
        id
        priceFrom
        priceTo
        markupType
        markupValue
      }
      orderDiscounts {
        id
        minOrderSum
        discountType
        discountValue
      }
      supplierMarkups {
        id
        supplierName
        markupType
        markupValue
      }
      brandMarkups {
        id
        brandName
        markupType
        markupValue
      }
      categoryMarkups {
        id
        categoryName
        markupType
        markupValue
      }
      excludedBrands {
        id
        brandName
      }
      excludedCategories {
        id
        categoryName
      }
      paymentTypes {
        id
        paymentType
        isEnabled
      }
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CLIENT_PROFILE = gql`
  mutation UpdateClientProfile($id: ID!, $input: ClientProfileInput!) {
    updateClientProfile(id: $id, input: $input) {
      id
      code
      name
      description
      baseMarkup
      autoSendInvoice
      vinRequestModule
      priceRangeMarkups {
        id
        priceFrom
        priceTo
        markupType
        markupValue
      }
      orderDiscounts {
        id
        minOrderSum
        discountType
        discountValue
      }
      supplierMarkups {
        id
        supplierName
        markupType
        markupValue
      }
      brandMarkups {
        id
        brandName
        markupType
        markupValue
      }
      categoryMarkups {
        id
        categoryName
        markupType
        markupValue
      }
      excludedBrands {
        id
        brandName
      }
      excludedCategories {
        id
        categoryName
      }
      paymentTypes {
        id
        paymentType
        isEnabled
      }
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CLIENT_PROFILE = gql`
  mutation DeleteClientProfile($id: ID!) {
    deleteClientProfile(id: $id)
  }
`

// Мутации для статусов клиентов
export const CREATE_CLIENT_STATUS = gql`
  mutation CreateClientStatus($input: ClientStatusInput!) {
    createClientStatus(input: $input) {
      id
      name
      color
      description
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CLIENT_STATUS = gql`
  mutation UpdateClientStatus($id: ID!, $input: ClientStatusInput!) {
    updateClientStatus(id: $id, input: $input) {
      id
      name
      color
      description
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CLIENT_STATUS = gql`
  mutation DeleteClientStatus($id: ID!) {
    deleteClientStatus(id: $id)
  }
`

// Мутации для скидок и промокодов
export const CREATE_DISCOUNT = gql`
  mutation CreateDiscount($input: DiscountInput!) {
    createDiscount(input: $input) {
      id
      name
      type
      code
      minOrderAmount
      discountType
      discountValue
      isActive
      validFrom
      validTo
      profiles {
        id
        profile {
          id
          name
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_DISCOUNT = gql`
  mutation UpdateDiscount($id: ID!, $input: DiscountInput!) {
    updateDiscount(id: $id, input: $input) {
      id
      name
      type
      code
      minOrderAmount
      discountType
      discountValue
      isActive
      validFrom
      validTo
      profiles {
        id
        profile {
          id
          name
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const DELETE_DISCOUNT = gql`
  mutation DeleteDiscount($id: ID!) {
    deleteDiscount(id: $id)
  }
`

// Обновление баланса клиента
export const UPDATE_CLIENT_BALANCE = gql`
  mutation UpdateClientBalance($id: ID!, $newBalance: Float!, $comment: String) {
    updateClientBalance(id: $id, newBalance: $newBalance, comment: $comment) {
      id
      balance
      balanceHistory {
        id
        userId
        user {
          id
          firstName
          lastName
          email
        }
        oldValue
        newValue
        comment
        createdAt
      }
    }
  }
`

// Транспорт клиента
export const CREATE_CLIENT_VEHICLE = gql`
  mutation CreateClientVehicle($clientId: ID!, $input: ClientVehicleInput!) {
    createClientVehicle(clientId: $clientId, input: $input) {
      id
      name
      vin
      frame
      licensePlate
      brand
      model
      modification
      year
      mileage
      comment
      createdAt
    }
  }
`

export const UPDATE_CLIENT_VEHICLE = gql`
  mutation UpdateClientVehicle($id: ID!, $input: ClientVehicleInput!) {
    updateClientVehicle(id: $id, input: $input) {
      id
      name
      vin
      frame
      licensePlate
      brand
      model
      modification
      year
      mileage
      comment
      createdAt
    }
  }
`

export const DELETE_CLIENT_VEHICLE = gql`
  mutation DeleteClientVehicle($id: ID!) {
    deleteClientVehicle(id: $id)
  }
`

// Адреса доставки
export const CREATE_CLIENT_DELIVERY_ADDRESS = gql`
  mutation CreateClientDeliveryAddress($clientId: ID!, $input: ClientDeliveryAddressInput!) {
    createClientDeliveryAddress(clientId: $clientId, input: $input) {
      id
      name
      address
      deliveryType
      comment
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CLIENT_DELIVERY_ADDRESS = gql`
  mutation UpdateClientDeliveryAddress($id: ID!, $input: ClientDeliveryAddressInput!) {
    updateClientDeliveryAddress(id: $id, input: $input) {
      id
      name
      address
      deliveryType
      comment
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CLIENT_DELIVERY_ADDRESS = gql`
  mutation DeleteClientDeliveryAddress($id: ID!) {
    deleteClientDeliveryAddress(id: $id)
  }
`

// Контакты клиента
export const CREATE_CLIENT_CONTACT = gql`
  mutation CreateClientContact($clientId: ID!, $input: ClientContactInput!) {
    createClientContact(clientId: $clientId, input: $input) {
      id
      phone
      email
      comment
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CLIENT_CONTACT = gql`
  mutation UpdateClientContact($id: ID!, $input: ClientContactInput!) {
    updateClientContact(id: $id, input: $input) {
      id
      phone
      email
      comment
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CLIENT_CONTACT = gql`
  mutation DeleteClientContact($id: ID!) {
    deleteClientContact(id: $id)
  }
`

// Договоры
export const CREATE_CLIENT_CONTRACT = gql`
  mutation CreateClientContract($clientId: ID!, $input: ClientContractInput!) {
    createClientContract(clientId: $clientId, input: $input) {
      id
      contractNumber
      contractDate
      name
      ourLegalEntity
      clientLegalEntity
      balance
      currency
      isActive
      isDefault
      contractType
      relationship
      paymentDelay
      creditLimit
      delayDays
      fileUrl
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CLIENT_CONTRACT = gql`
  mutation UpdateClientContract($id: ID!, $input: ClientContractInput!) {
    updateClientContract(id: $id, input: $input) {
      id
      contractNumber
      contractDate
      name
      ourLegalEntity
      clientLegalEntity
      balance
      currency
      isActive
      isDefault
      contractType
      relationship
      paymentDelay
      creditLimit
      delayDays
      fileUrl
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CLIENT_CONTRACT = gql`
  mutation DeleteClientContract($id: ID!) {
    deleteClientContract(id: $id)
  }
`

// Юридические лица
export const CREATE_CLIENT_LEGAL_ENTITY = gql`
  mutation CreateClientLegalEntity($clientId: ID!, $input: ClientLegalEntityInput!) {
    createClientLegalEntity(clientId: $clientId, input: $input) {
      id
      shortName
      fullName
      form
      legalAddress
      actualAddress
      taxSystem
      responsiblePhone
      responsiblePosition
      responsibleName
      accountant
      signatory
      registrationReasonCode
      ogrn
      inn
      vatPercent
      bankDetails {
        id
        name
        accountNumber
        bankName
        bik
        correspondentAccount
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CLIENT_LEGAL_ENTITY = gql`
  mutation UpdateClientLegalEntity($id: ID!, $input: ClientLegalEntityInput!) {
    updateClientLegalEntity(id: $id, input: $input) {
      id
      shortName
      fullName
      form
      legalAddress
      actualAddress
      taxSystem
      responsiblePhone
      responsiblePosition
      responsibleName
      accountant
      signatory
      registrationReasonCode
      ogrn
      inn
      vatPercent
      bankDetails {
        id
        name
        accountNumber
        bankName
        bik
        correspondentAccount
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CLIENT_LEGAL_ENTITY = gql`
  mutation DeleteClientLegalEntity($id: ID!) {
    deleteClientLegalEntity(id: $id)
  }
`

// Банковские реквизиты
export const CREATE_CLIENT_BANK_DETAILS = gql`
  mutation CreateClientBankDetails($legalEntityId: ID!, $input: ClientBankDetailsInput!) {
    createClientBankDetails(legalEntityId: $legalEntityId, input: $input) {
      id
      legalEntityId
      legalEntity {
        id
        shortName
        inn
      }
      name
      accountNumber
      bankName
      bik
      correspondentAccount
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_CLIENT_BANK_DETAILS = gql`
  mutation UpdateClientBankDetails($id: ID!, $input: ClientBankDetailsInput!) {
    updateClientBankDetails(id: $id, input: $input) {
      id
      legalEntityId
      legalEntity {
        id
        shortName
        inn
      }
      name
      accountNumber
      bankName
      bik
      correspondentAccount
      createdAt
      updatedAt
    }
  }
`

export const DELETE_CLIENT_BANK_DETAILS = gql`
  mutation DeleteClientBankDetails($id: ID!) {
    deleteClientBankDetails(id: $id)
  }
`

// Авторизация клиентов
export const CHECK_CLIENT_BY_PHONE = gql`
  mutation CheckClientByPhone($phone: String!) {
    checkClientByPhone(phone: $phone) {
      exists
      client {
        id
        clientNumber
        name
        phone
        email
      }
      sessionId
    }
  }
`

export const SEND_SMS_CODE = gql`
  mutation SendSMSCode($phone: String!, $sessionId: String) {
    sendSMSCode(phone: $phone, sessionId: $sessionId) {
      success
      sessionId
      code
    }
  }
`

export const VERIFY_CODE = gql`
  mutation VerifyCode($phone: String!, $code: String!, $sessionId: String!) {
    verifyCode(phone: $phone, code: $code, sessionId: $sessionId) {
      success
      client {
        id
        clientNumber
        name
        phone
        email
      }
      token
    }
  }
`

export const REGISTER_NEW_CLIENT = gql`
  mutation RegisterNewClient($phone: String!, $name: String!, $sessionId: String!) {
    registerNewClient(phone: $phone, name: $name, sessionId: $sessionId) {
      success
      client {
        id
        clientNumber
        name
        phone
        email
      }
      token
    }
  }
`

// Мутации для заказов и платежей
export const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      orderNumber
      clientId
      client {
        id
        name
        email
        phone
      }
      clientEmail
      clientPhone
      clientName
      status
      totalAmount
      discountAmount
      finalAmount
      currency
      items {
        id
        productId
        product {
          id
          name
          article
        }
        externalId
        name
        article
        brand
        price
        quantity
        totalPrice
      }
      payments {
        id
        yookassaPaymentId
        status
        amount
        confirmationUrl
      }
      deliveryAddress
      comment
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: OrderStatus!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      orderNumber
      status
      updatedAt
    }
  }
`

export const CANCEL_ORDER = gql`
  mutation CancelOrder($id: ID!) {
    cancelOrder(id: $id) {
      id
      orderNumber
      status
      updatedAt
    }
  }
`

export const CREATE_PAYMENT = gql`
  mutation CreatePayment($input: CreatePaymentInput!) {
    createPayment(input: $input) {
      payment {
        id
        orderId
        yookassaPaymentId
        status
        amount
        currency
        description
        confirmationUrl
        createdAt
      }
      confirmationUrl
    }
  }
`

export const CANCEL_PAYMENT = gql`
  mutation CancelPayment($id: ID!) {
    cancelPayment(id: $id) {
      id
      yookassaPaymentId
      status
      canceledAt
      updatedAt
    }
  }
`

export const DELETE_ORDER = gql`
  mutation DeleteOrder($id: ID!) {
    deleteOrder(id: $id)
  }
`

// Мутации для избранного
export const ADD_TO_FAVORITES = gql`
  mutation AddToFavorites($input: FavoriteInput!) {
    addToFavorites(input: $input) {
      id
      clientId
      productId
      offerKey
      name
      brand
      article
      price
      currency
      image
      createdAt
    }
  }
`

export const REMOVE_FROM_FAVORITES = gql`
  mutation RemoveFromFavorites($id: ID!) {
    removeFromFavorites(id: $id)
  }
`

export const CLEAR_FAVORITES = gql`
  mutation ClearFavorites {
    clearFavorites
  }
`

export const GET_FAVORITES = gql`
  query GetFavorites {
    favorites {
      id
      clientId
      productId
      offerKey
      name
      brand
      article
      price
      currency
      image
      createdAt
    }
  }
`

export const UPDATE_CONTRACT_BALANCE = gql`
  mutation UpdateContractBalance($contractId: ID!, $amount: Float!, $comment: String) {
    updateContractBalance(contractId: $contractId, amount: $amount, comment: $comment) {
      id
      balance
      updatedAt
    }
  }
`

export const CREATE_BALANCE_INVOICE = gql`
  mutation CreateBalanceInvoice($contractId: String!, $amount: Float!) {
    createBalanceInvoice(contractId: $contractId, amount: $amount) {
      id
      invoiceNumber
      amount
      status
      createdAt
    }
  }
`

export const GET_INVOICE_PDF = gql`
  mutation GetInvoicePDF($invoiceId: String!) {
    getInvoicePDF(invoiceId: $invoiceId) {
      success
      pdfBase64
      filename
      error
    }
  }
`

export const UPDATE_INVOICE_STATUS = gql`
  mutation UpdateInvoiceStatus($invoiceId: String!, $status: InvoiceStatus!) {
    updateInvoiceStatus(invoiceId: $invoiceId, status: $status) {
      id
      status
      updatedAt
    }
  }
`

export const GET_DELIVERY_OFFERS = gql`
  mutation GetDeliveryOffers($input: DeliveryOffersInput!) {
    getDeliveryOffers(input: $input) {
      success
      message
      error
      offers {
        id
        name
        deliveryDate
        deliveryTime
        cost
        description
        type
        expiresAt
      }
    }
  }
`

// Daily Products mutations
export const CREATE_DAILY_PRODUCT = gql`
  mutation CreateDailyProduct($input: DailyProductInput!) {
    createDailyProduct(input: $input) {
      id
      productId
      displayDate
      discount
      isActive
      sortOrder
      product {
        id
        name
        article
        brand
        retailPrice
        images {
          url
          alt
          order
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_DAILY_PRODUCT = gql`
  mutation UpdateDailyProduct($id: ID!, $input: DailyProductUpdateInput!) {
    updateDailyProduct(id: $id, input: $input) {
      id
      productId
      displayDate
      discount
      isActive
      sortOrder
      product {
        id
        name
        article
        brand
        retailPrice
        images {
          url
          alt
          order
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const DELETE_DAILY_PRODUCT = gql`
  mutation DeleteDailyProduct($id: ID!) {
    deleteDailyProduct(id: $id)
  }
`

export const CREATE_BEST_PRICE_PRODUCT = gql`
  mutation CreateBestPriceProduct($input: BestPriceProductInput!) {
    createBestPriceProduct(input: $input) {
      id
      productId
      discount
      isActive
      sortOrder
      product {
        id
        name
        article
        brand
        retailPrice
        images {
          url
          alt
          order
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_BEST_PRICE_PRODUCT = gql`
  mutation UpdateBestPriceProduct($id: ID!, $input: BestPriceProductInput!) {
    updateBestPriceProduct(id: $id, input: $input) {
      id
      productId
      discount
      isActive
      sortOrder
      product {
        id
        name
        article
        brand
        retailPrice
        images {
          url
          alt
          order
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const DELETE_BEST_PRICE_PRODUCT = gql`
  mutation DeleteBestPriceProduct($id: ID!) {
    deleteBestPriceProduct(id: $id)
  }
`

export const CREATE_TOP_SALES_PRODUCT = gql`
  mutation CreateTopSalesProduct($input: TopSalesProductInput!) {
    createTopSalesProduct(input: $input) {
      id
      productId
      isActive
      sortOrder
      product {
        id
        name
        article
        brand
        retailPrice
        images {
          url
          alt
          order
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_TOP_SALES_PRODUCT = gql`
  mutation UpdateTopSalesProduct($id: ID!, $input: TopSalesProductUpdateInput!) {
    updateTopSalesProduct(id: $id, input: $input) {
      id
      productId
      isActive
      sortOrder
      product {
        id
        name
        article
        brand
        retailPrice
        images {
          url
          alt
          order
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const DELETE_TOP_SALES_PRODUCT = gql`
  mutation DeleteTopSalesProduct($id: ID!) {
    deleteTopSalesProduct(id: $id)
  }
`

// Hero Banners mutations
export const CREATE_HERO_BANNER = gql`
  mutation CreateHeroBanner($input: HeroBannerInput!) {
    createHeroBanner(input: $input) {
      id
      title
      subtitle
      imageUrl
      linkUrl
      isActive
      sortOrder
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_HERO_BANNER = gql`
  mutation UpdateHeroBanner($id: String!, $input: HeroBannerUpdateInput!) {
    updateHeroBanner(id: $id, input: $input) {
      id
      title
      subtitle
      imageUrl
      linkUrl
      isActive
      sortOrder
      createdAt
      updatedAt
    }
  }
`

export const DELETE_HERO_BANNER = gql`
  mutation DeleteHeroBanner($id: String!) {
    deleteHeroBanner(id: $id)
  }
` 