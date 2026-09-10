// ===========================================
// Event-Gérance Pro — Instance Prisma Client
// ===========================================

import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Instance Prisma singleton pour éviter les connexions multiples en développement
const globalPourPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function creerPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || 'file:./dev.db',
  })

  return new PrismaClient({ adapter })
}

export const prisma = globalPourPrisma.prisma ?? creerPrismaClient()

if (process.env.NODE_ENV !== 'production') globalPourPrisma.prisma = prisma
