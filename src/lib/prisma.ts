// ===========================================
// Isy Lok — Instance Prisma Client (Neon PostgreSQL)
// ===========================================

import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalPourPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pgPool: Pool | undefined
}

function creerPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  const pool = globalPourPrisma.pgPool ?? new Pool({ connectionString })
  if (process.env.NODE_ENV !== 'production') {
    globalPourPrisma.pgPool = pool
  }

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalPourPrisma.prisma ?? creerPrismaClient()

if (process.env.NODE_ENV !== 'production') globalPourPrisma.prisma = prisma
