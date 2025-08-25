#!/usr/bin/env node

import { fileURLToPath } from 'url'
import { dirname } from 'path'
import process from 'process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  const argEmail = process.argv.find(a => a.startsWith('--email='))
  const email = argEmail ? argEmail.split('=')[1] : process.env.ADMIN_EMAIL

  if (!email) {
    console.error('Usage: node scripts/make-admin.mjs --email=user@example.com')
    console.error('Or set ADMIN_EMAIL env var.')
    process.exit(1)
  }

  console.log('Promoting user to ADMIN:', email)

  // Lazy import Prisma client generated into src
  const { PrismaClient } = await import('../src/generated/prisma/index.js')
  const prisma = new PrismaClient()
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.error('User not found:', email)
      process.exit(2)
    }
    if (user.role === 'ADMIN') {
      console.log('User is already ADMIN')
      process.exit(0)
    }
    const updated = await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } })
    console.log('✅ Updated:', { id: updated.id, email: updated.email, role: updated.role })
  } catch (e) {
    console.error('Failed to promote user:', e)
    process.exit(3)
  } finally {
    await prisma.$disconnect()
  }
}

main()

