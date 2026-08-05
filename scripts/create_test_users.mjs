import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating/Updating test development accounts...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const testAccounts = [
    {
      name: 'Super Admin Test Account',
      email: 'superadmin@ridesafe.com',
      password: passwordHash,
      role: 'SUPER_ADMIN',
      phone: '+1 555-000-0099',
    },
    {
      name: 'Admin Test Account',
      email: 'admin@ridesafe.com',
      password: passwordHash,
      role: 'ADMIN',
      phone: '+1 555-000-0001',
    },
    {
      name: 'Driver Test Account',
      email: 'driver@ridesafe.com',
      password: passwordHash,
      role: 'DRIVER',
      phone: '+1 555-000-0002',
    },
    {
      name: 'Parent Test Account',
      email: 'parent@ridesafe.com',
      password: passwordHash,
      role: 'PARENT',
      phone: '+1 555-111-2222',
    },
  ];

  for (const account of testAccounts) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        password: account.password,
        role: account.role,
        phone: account.phone,
      },
      create: account,
    });
    console.log(`✅ [${user.role}] Created/Updated: ${user.email}`);
  }

  console.log('\n--- Development Test Accounts Ready ---');
  console.log('Password for all accounts: password123');
}

main()
  .catch((e) => {
    console.error('Error creating test accounts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
