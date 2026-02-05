const { PrismaClient } = require('@prisma/client');
const { hashValue } = require('../src/utils/hash');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@securedocs.com' },
  });

  if (!adminExists) {
    const passwordHash = await hashValue('Admin@123');
    await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@securedocs.com',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    console.log('✅ Admin user created:');
    console.log('   Email: admin@securedocs.com');
    console.log('   Password: Admin@123');
    console.log('   Role: ADMIN\n');
  } else {
    console.log('ℹ️  Admin user already exists\n');
  }

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
