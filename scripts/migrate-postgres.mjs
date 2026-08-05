#!/usr/bin/env node
/**
 * TrackBuddy — PostgreSQL Migration Helper
 * =========================================
 * Run this script to:
 *   1. Validate the DATABASE_URL is pointing to PostgreSQL
 *   2. Push the Prisma schema to PostgreSQL
 *   3. Run the database seed
 *
 * Usage:
 *   node scripts/migrate-postgres.mjs
 *   node scripts/migrate-postgres.mjs --seed   (also runs seed after migration)
 *   node scripts/migrate-postgres.mjs --reset  (WARNING: drops all data first)
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

// ── 1. Parse and validate DATABASE_URL ───────────────────────────────────────
let envContent;
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch {
  console.error('❌ Could not find .env file at:', envPath);
  process.exit(1);
}

const dbMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
if (!dbMatch) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const dbUrl = dbMatch[1].trim();

if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
  console.error('❌ DATABASE_URL must be a PostgreSQL connection string.');
  console.error('   Current value starts with:', dbUrl.substring(0, 20) + '...');
  console.error('\n   Expected format:');
  console.error('   postgresql://USER:PASSWORD@HOST:5432/DB_NAME?schema=public');
  process.exit(1);
}

console.log('✅ DATABASE_URL is a valid PostgreSQL connection string.');
console.log('   Host:', dbUrl.match(/@([^:\/]+)/)?.[1] ?? 'unknown');

// ── 2. Handle --reset flag ────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--reset')) {
  console.log('\n⚠️  WARNING: --reset will DROP ALL DATA in the database!');
  console.log('   Proceeding in 3 seconds... (Ctrl+C to abort)\n');
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('🗑️  Resetting database...');
  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl }
    });
  } catch (e) {
    console.error('❌ Reset failed:', e.message);
    process.exit(1);
  }
}

// ── 3. Generate Prisma Client ─────────────────────────────────────────────────
console.log('\n🔧 Generating Prisma Client...');
try {
  execSync('npx prisma generate', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl }
  });
  console.log('✅ Prisma Client generated.');
} catch (e) {
  console.error('❌ prisma generate failed:', e.message);
  process.exit(1);
}

// ── 4. Run Migration ──────────────────────────────────────────────────────────
console.log('\n📦 Running Prisma Migrate Deploy...');
try {
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl }
  });
  console.log('✅ Migrations applied successfully!');
} catch {
  // If no migration history exists, use db push instead (initial setup)
  console.log('\n⚠️  No migration history found. Running prisma db push for initial setup...');
  try {
    execSync('npx prisma db push', {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl }
    });
    console.log('✅ Schema pushed to database!');
  } catch (pushErr) {
    console.error('❌ Schema push failed:', pushErr.message);
    process.exit(1);
  }
}

// ── 5. Optionally seed ────────────────────────────────────────────────────────
if (args.includes('--seed')) {
  console.log('\n🌱 Running database seed...');
  try {
    execSync('npx ts-node --project tsconfig.json prisma/seed.ts', {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl }
    });
    console.log('✅ Database seeded!');
  } catch (e) {
    console.error('⚠️  Seed failed (non-fatal):', e.message);
  }
}

console.log('\n🎉 PostgreSQL migration complete! TrackBuddy is ready.');
console.log('   Run `npm run dev` to start the development server.');
