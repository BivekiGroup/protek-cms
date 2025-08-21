import { gql } from '@apollo/client'

export const GET_USERS = gql`
  query GetUsers {
    users {
      id
      firstName
      lastName
      email
      avatar
      role
      createdAt
      updatedAt
    }
  }
`

export const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      firstName
      lastName
      email
      avatar
      role
      createdAt
      updatedAt
    }
  }
`

export const GET_ME = gql`
  query GetMe {
    me {
      id
      firstName
      lastName
      email
      avatar
      role
      createdAt
      updatedAt
    }
  }
`

export const HAS_USERS = gql`
  query HasUsers {
    hasUsers
  }
`

export const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($limit: Int, $offset: Int) {
    auditLogs(limit: $limit, offset: $offset) {
      id
      userId
      user {
        id
        firstName
        lastName
        email
        avatar
        role
      }
      action
      details
      ipAddress
      userAgent
      createdAt
    }
  }
`

export const GET_AUDIT_LOGS_COUNT = gql`
  query GetAuditLogsCount {
    auditLogsCount
  }
`

// Laximo интеграция
export const GET_LAXIMO_BRANDS = gql`
  query GetLaximoBrands {
    laximoBrands {
      brand
      code
      icon
      name
      supportdetailapplicability
      supportparameteridentification2
      supportquickgroups
      supportvinsearch
      supportframesearch
      vinexample
      frameexample
      features {
        name
        example
      }
      extensions {
        operations {
          description
          kind
          name
          fields {
            description
            example
            name
            pattern
          }
        }
      }
    }
  }
`

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        firstName
        lastName
        email
        avatar
        role
      }
    }
  }
`

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      firstName
      lastName
      email
      avatar
      role
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      firstName
      lastName
      email
      avatar
      role
      createdAt
      updatedAt
    }
  }
`

export const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      firstName
      lastName
      email
      avatar
      role
      createdAt
      updatedAt
    }
  }
`

export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`

export const ADMIN_CHANGE_PASSWORD = gql`
  mutation AdminChangePassword($input: AdminChangePasswordInput!) {
    adminChangePassword(input: $input)
  }
`

// Daily Products queries
export const GET_DAILY_PRODUCTS = gql`
  query GetDailyProducts($displayDate: String!) {
    dailyProducts(displayDate: $displayDate) {
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

export const GET_DAILY_PRODUCT = gql`
  query GetDailyProduct($id: ID!) {
    dailyProduct(id: $id) {
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

export const GET_BEST_PRICE_PRODUCTS = gql`
  query GetBestPriceProducts {
    bestPriceProducts {
      id
      productId
      discount
      isActive
      sortOrder
      product {
        id
        name
        slug
        article
        brand
        retailPrice
        wholesalePrice
        images {
          id
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

export const GET_BEST_PRICE_PRODUCT = gql`
  query GetBestPriceProduct($id: ID!) {
    bestPriceProduct(id: $id) {
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

export const GET_TOP_SALES_PRODUCTS = gql`
  query GetTopSalesProducts {
    topSalesProducts {
      id
      productId
      isActive
      sortOrder
      product {
        id
        name
        slug
        article
        brand
        retailPrice
        wholesalePrice
        images {
          id
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

export const GET_TOP_SALES_PRODUCT = gql`
  query GetTopSalesProduct($id: ID!) {
    topSalesProduct(id: $id) {
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

export const UPLOAD_AVATAR = gql`
  mutation UploadAvatar($file: String!) {
    uploadAvatar(file: $file) {
      id
      firstName
      lastName
      email
      avatar
      role
      createdAt
      updatedAt
    }
  }
`

// Каталог товаров
export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
      slug
      description
      seoTitle
      seoDescription
      image
      isHidden
      includeSubcategoryProducts
      parentId
      level
      children {
        id
        name
        slug
        isHidden
        level
        children {
          id
          name
          slug
          isHidden
          level
          children {
            id
            name
            slug
            isHidden
            level
          }
        }
      }
      _count {
        products
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_CATEGORY = gql`
  query GetCategory($id: ID!) {
    category(id: $id) {
      id
      name
      slug
      description
      seoTitle
      seoDescription
      image
      isHidden
      includeSubcategoryProducts
      parentId
      parent {
        id
        name
        slug
      }
      children {
        id
        name
        slug
        isHidden
        level
      }
      products {
        id
        name
        article
        retailPrice
        wholesalePrice
        stock
        isVisible
        images {
          id
          url
          alt
          order
        }
      }
      level
      createdAt
      updatedAt
    }
  }
`

export const GET_PRODUCTS = gql`
  query GetProducts($categoryId: String, $search: String, $limit: Int, $offset: Int) {
    products(categoryId: $categoryId, search: $search, limit: $limit, offset: $offset) {
      id
      name
      slug
      article
      brand
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
      createdAt
      updatedAt
    }
  }
`

export const GET_PRODUCTS_COUNT = gql`
  query GetProductsCount($categoryId: String, $search: String) {
    productsCount(categoryId: $categoryId, search: $search)
  }
`

export const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    product(id: $id) {
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
      characteristics {
        id
        value
        characteristic {
          id
          name
        }
      }
      relatedProducts {
        id
        name
        article
        retailPrice
        images {
          id
          url
          alt
        }
      }
      accessoryProducts {
        id
        name
        article
        retailPrice
        images {
          id
          url
          alt
        }
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_OPTIONS = gql`
  query GetOptions {
    options {
      id
      name
      type
      values {
        id
        value
        price
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_CHARACTERISTICS = gql`
  query GetCharacteristics {
    characteristics {
      id
      name
      createdAt
      updatedAt
    }
  }
`

// Запросы для клиентов
export const GET_CLIENTS = gql`
  query GetClients($filter: ClientFilterInput, $search: String, $limit: Int, $offset: Int, $sortBy: String, $sortOrder: String) {
    clients(filter: $filter, search: $search, limit: $limit, offset: $offset, sortBy: $sortBy, sortOrder: $sortOrder) {
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

// Dashboard: last orders and recent clients
export const GET_DASHBOARD_ORDERS = gql`
  query GetDashboardOrders($status: OrderStatus, $limit: Int, $offset: Int) {
    orders(status: $status, limit: $limit, offset: $offset) {
      orders {
        id
        orderNumber
        clientName
        clientPhone
        createdAt
        status
        finalAmount
        currency
      }
      total
      hasMore
    }
  }
`

export const GET_DASHBOARD_CLIENTS = gql`
  query GetDashboardClients($filter: ClientFilterInput, $limit: Int, $offset: Int, $sortBy: String, $sortOrder: String) {
    clients(filter: $filter, limit: $limit, offset: $offset, sortBy: $sortBy, sortOrder: $sortOrder) {
      id
      name
      phone
      email
      type
      createdAt
      isConfirmed
    }
    clientsCount(filter: $filter)
  }
`

export const GET_CLIENT = gql`
  query GetClient($id: ID!) {
    client(id: $id) {
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

export const GET_CLIENTS_COUNT = gql`
  query GetClientsCount($filter: ClientFilterInput, $search: String) {
    clientsCount(filter: $filter, search: $search)
  }
`

export const GET_CLIENT_PROFILES = gql`
  query GetClientProfiles {
    clientProfiles {
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
      _count {
        clients
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_CLIENT_PROFILE = gql`
  query GetClientProfile($id: ID!) {
    clientProfile(id: $id) {
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
      clients {
        id
        name
        clientNumber
      }
      _count {
        clients
      }
      createdAt
      updatedAt
    }
  }
`

export const GET_CLIENT_STATUSES = gql`
  query GetClientStatuses {
    clientStatuses {
      id
      name
      color
      description
      createdAt
      updatedAt
    }
  }
`

export const GET_CLIENT_STATUS = gql`
  query GetClientStatus($id: ID!) {
    clientStatus(id: $id) {
      id
      name
      color
      description
      createdAt
      updatedAt
    }
  }
`

export const GET_PRODUCT_HISTORY = gql`
  query GetProductHistory($productId: ID!) {
    productHistory(productId: $productId) {
      id
      action
      changes
      userId
      user {
        id
        firstName
        lastName
        email
      }
      createdAt
    }
  }
`

// Запросы для скидок и промокодов
export const GET_DISCOUNTS = gql`
  query GetDiscounts {
    discounts {
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

export const GET_DISCOUNT = gql`
  query GetDiscount($id: ID!) {
    discount(id: $id) {
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

// Получение клиента с полной информацией для карточки
export const GET_CLIENT_FULL = gql`
  query GetClientFull($id: ID!) {
    client(id: $id) {
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
      managerId
      manager {
        id
        firstName
        lastName
        email
      }
      balance
      comment
      emailNotifications
      smsNotifications
      pushNotifications
      legalEntityType
      legalEntityName
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
      deliveryAddresses {
        id
        name
        address
        deliveryType
        comment
        createdAt
        updatedAt
      }
      contacts {
        id
        phone
        email
        comment
        createdAt
        updatedAt
      }
      contracts {
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
      legalEntities {
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
      bankDetails {
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
      createdAt
      updatedAt
    }
  }
`

// Получение всех пользователей для выбора менеджера
export const GET_USERS_FOR_MANAGER = gql`
  query GetUsersForManager {
    users {
      id
      firstName
      lastName
      email
      role
    }
  }
`

// Запросы для заказов и платежей
export const GET_ORDERS = gql`
  query GetOrders($clientId: String, $status: OrderStatus, $limit: Int, $offset: Int, $search: String) {
    orders(clientId: $clientId, status: $status, limit: $limit, offset: $offset, search: $search) {
      orders {
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
      total
      hasMore
    }
  }
`

export const GET_ORDER = gql`
  query GetOrder($id: ID!) {
    order(id: $id) {
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
          images {
            id
            url
            alt
          }
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
        currency
        paymentMethod
        description
        confirmationUrl
        createdAt
        updatedAt
        paidAt
        canceledAt
      }
      deliveryAddress
      comment
      createdAt
      updatedAt
    }
  }
`

export const GET_ORDER_BY_NUMBER = gql`
  query GetOrderByNumber($orderNumber: String!) {
    orderByNumber(orderNumber: $orderNumber) {
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
          images {
            id
            url
            alt
          }
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
        currency
        paymentMethod
        description
        confirmationUrl
        createdAt
        updatedAt
        paidAt
        canceledAt
      }
      deliveryAddress
      comment
      createdAt
      updatedAt
    }
  }
`

export const GET_PAYMENTS = gql`
  query GetPayments($orderId: String, $status: PaymentStatus) {
    payments(orderId: $orderId, status: $status) {
      id
      orderId
      order {
        id
        orderNumber
        client {
          id
          name
        }
        totalAmount
      }
      yookassaPaymentId
      status
      amount
      currency
      paymentMethod
      description
      confirmationUrl
      createdAt
      updatedAt
      paidAt
      canceledAt
    }
  }
`

export const GET_PAYMENT = gql`
  query GetPayment($id: ID!) {
    payment(id: $id) {
      id
      orderId
      order {
        id
        orderNumber
        client {
          id
          name
          email
          phone
        }
        totalAmount
        items {
          id
          name
          article
          brand
          price
          quantity
          totalPrice
        }
      }
      yookassaPaymentId
      status
      amount
      currency
      paymentMethod
      description
      confirmationUrl
      createdAt
      updatedAt
      paidAt
      canceledAt
    }
  }
`

// Навигационные категории
export const GET_NAVIGATION_CATEGORIES = gql`
  query GetNavigationCategories {
    navigationCategories {
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
`;

export const GET_NAVIGATION_CATEGORY = gql`
  query GetNavigationCategory($id: ID!) {
    navigationCategory(id: $id) {
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
`;

// PartsIndex категории автотоваров
export const GET_PARTSINDEX_CATEGORIES = gql`
  query GetPartsIndexCategories($lang: String) {
    partsIndexCategoriesWithGroups(lang: $lang) {
      id
      name
      image
      groups {
        id
        name
        image
        subgroups {
          id
          name
          image
          entityNames {
            id
            name
          }
        }
        entityNames {
          id
          name
        }
      }
    }
  }
`;

// PartsAPI категории
export const GET_PARTSAPI_CATEGORIES = gql`
  query GetPartsAPICategories($carId: Int!, $carType: CarType) {
    partsAPICategories(carId: $carId, carType: $carType) {
      id
      name
      level
      parentId
      children {
        id
        name
        level
        parentId
        children {
          id
          name
          level
          parentId
        }
      }
    }
  }
`;

// PartsIndex товары каталога
export const GET_PARTSINDEX_CATALOG_ENTITIES = gql`
  query GetPartsIndexCatalogEntities(
    $catalogId: String!
    $groupId: String!
    $lang: String
    $limit: Int
    $page: Int
    $q: String
    $engineId: String
    $generationId: String
    $params: String
  ) {
    partsIndexCatalogEntities(
      catalogId: $catalogId
      groupId: $groupId
      lang: $lang
      limit: $limit
      page: $page
      q: $q
      engineId: $engineId
      generationId: $generationId
      params: $params
    ) {
      list {
        id
        name
        image
        brand
        description
        price
      }
      totalCount
      page
      limit
    }
  }
`;

// PartsAPI артикулы
export const GET_PARTSAPI_ARTICLES = gql`
  query GetPartsAPIArticles($strId: Int!, $carId: Int!, $carType: CarType) {
    partsAPIArticles(strId: $strId, carId: $carId, carType: $carType) {
      supBrand
      supId
      productGroup
      ptId
      artSupBrand
      artArticleNr
      artId
    }
  }
`;

// Кража - мутации для работы с базой данных запчастей
export const FETCH_CATEGORY_PRODUCTS = gql`
  mutation FetchCategoryProducts($input: FetchCategoryProductsInput!) {
    fetchCategoryProducts(input: $input) {
      success
      message
      insertedCount
      tableName
    }
  }
`;

export const GET_CATEGORY_TABLES = gql`
  query GetCategoryTables {
    getCategoryTables {
      tableName
      categoryId
      categoryType
      recordCount
    }
  }
`;

export const DELETE_CATEGORY_TABLE = gql`
  mutation DeleteCategoryTable($categoryId: String!, $categoryType: CategoryType!) {
    deleteCategoryTable(categoryId: $categoryId, categoryType: $categoryType)
  }
`;

export const GET_CATEGORY_PRODUCTS = gql`
  query GetCategoryProducts($categoryId: String!, $categoryType: CategoryType!, $search: String, $limit: Int, $offset: Int) {
    getCategoryProducts(categoryId: $categoryId, categoryType: $categoryType, search: $search, limit: $limit, offset: $offset) {
      products {
        id
        external_id
        name
        brand
        article
        description
        image_url
        price
        category_id
        category_name
        category_type
        group_id
        group_name
        created_at
        updated_at
      }
      total
    }
  }
`;

// Hero Banners queries
export const GET_HERO_BANNERS = gql`
  query GetHeroBanners {
    heroBanners {
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

export const GET_HERO_BANNER = gql`
  query GetHeroBanner($id: String!) {
    heroBanner(id: $id) {
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

 
