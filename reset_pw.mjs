import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // Update all admins
  const res = await prisma.user.updateMany({
    where: {
      email: {
        in: ['admin@ridesafe.com', 'superadmin@ridesafe.com.my', 'superadmin@ridesafe.com']
      }
    },
    data: {
      password: passwordHash
    }
  });
  
  console.log(`Updated ${res.count} users to use password 'password123'.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
