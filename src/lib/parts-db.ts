// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

// Temporary no-op implementation to avoid requiring 'pg' when parts index is disabled.
class NoopPartsDatabase {
  constructor() {
    console.warn('Parts DB disabled: using no-op implementation')
  }

  async createCategoryTable() {
    return
  }

  async insertProducts(_categoryId, _categoryName, _categoryType, products) {
    console.warn(`Parts DB noop: insertProducts called for ${products?.length || 0} items`)
    return 0
  }

  async getProducts(_categoryId, _categoryType, _options = {}) {
    return { products: [], total: 0 }
  }

  async getCategoryTables() {
    return []
  }

  async deleteCategoryTable() {
    return
  }

  async testConnection() {
    return true
  }

  async close() {
    return
  }

  // Keep signature compatibility with previous helper
  getCategoryTableName(categoryId, categoryType) {
    const sanitizedId = String(categoryId || '').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
    return `category_${categoryType}_${sanitizedId}`
  }
}

export const partsDb = new NoopPartsDatabase()
