/**
 * fix_db_data.mjs
 * Fixes known data quality issues in the RideSafe database:
 * 1. Typo: "Brighton Internatioanl School" → "Brighton International School" (SA-3/UX-2)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Running database data fixes...\n');

  // Fix 1: Typo in Brighton org name (note: actual DB value has double space + misspelling)
  const brightonFix = await prisma.organization.updateMany({
    where: {
      name: {
        in: [
          'Brighton Internatioanl School',
          'Brighton  Internatioanl School',
          'Brighton  International School',
        ]
      }
    },
    data: { name: 'Brighton International School' },
  });
  if (brightonFix.count > 0) {
    console.log(`✅ Fixed: Brighton org name corrected to "Brighton International School" (${brightonFix.count} record)`);
  } else {
    console.log('ℹ️  Brighton org name either already correct or not found.');
  }

  // Fix 2: Show all organizations and their counts for verification
  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { users: true, students: true, buses: true, routes: true } },
    },
    orderBy: { name: 'asc' },
  });

  console.log('\n📊 Organization counts:\n');
  for (const org of orgs) {
    console.log(`  ${org.name}`);
    console.log(`    Users: ${org._count.users} | Students: ${org._count.students} | Buses: ${org._count.buses} | Routes: ${org._count.routes}`);
  }

  console.log('\n✅ Data fixes complete!');
}

main()
  .catch((e) => {
    console.error('❌ Fix script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
