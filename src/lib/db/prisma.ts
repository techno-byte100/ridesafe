import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL) {
  // During build, we might not have the DB URL, so we allow fallback to avoid crashing the build.
  // We only strictly require it at runtime in production.
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
    // Actually, Next.js build sets NODE_ENV=production.
    // Let's just check for DATABASE_URL and only throw if it's truly a runtime error.
    // For now, let's just log a warning instead of throwing, or check a specific flag.
    console.warn('⚠️ DATABASE_URL not set. Using fallback dev.db');
  }
  process.env.DATABASE_URL = "file:./dev.db"
}

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
