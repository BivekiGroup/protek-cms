// Wrapper to dynamically load parts-db only on server side
export async function getPartsDb() {
  const { partsDb } = await import('./parts-db')
  return partsDb
}