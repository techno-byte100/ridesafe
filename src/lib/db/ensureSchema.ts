import prisma from '@/lib/db/prisma'

let isSchemaEnsured = false

/**
 * Ensures that newly added Super Admin schema columns and tables exist in the live database.
 * This runs idempotently on PostgreSQL (Neon) using IF NOT EXISTS syntax.
 * Safe to call on every cold start; returns immediately if already executed once in this process.
 */
export async function ensureSuperAdminSchema(): Promise<void> {
  if (isSchemaEnsured) return

  try {
    // 1. User table extensions
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
    `).catch(() => {})

    // 2. Organization table quota and tier extensions
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE';
    `).catch(() => {})

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "maxBuses" INTEGER NOT NULL DEFAULT 5;
    `).catch(() => {})

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "maxStudents" INTEGER NOT NULL DEFAULT 100;
    `).catch(() => {})

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER NOT NULL DEFAULT 20;
    `).catch(() => {})

    // 3. AuditLog table creation if it doesn't exist yet
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "target" TEXT,
        "targetId" TEXT,
        "details" TEXT,
        "ipAddress" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {})

    isSchemaEnsured = true
  } catch (err) {
    console.warn('[SchemaSync] Non-fatal schema verification note:', err)
  }
}
