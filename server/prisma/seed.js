const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@securedocs.com' },
  });

  if (!adminExists) {
    const passwordHash = await bcrypt.hash('Admin@123', 12);
    await prisma.user.create({
      data: {
        name: 'System Admin',
        email: 'admin@securedocs.com',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    console.log('✓ Admin user created: admin@securedocs.com / Admin@123');
  } else {
    console.log('✓ Admin user already exists');
  }

  const userExists = await prisma.user.findUnique({
    where: { email: 'user@securedocs.com' },
  });

  if (!userExists) {
    const passwordHash = await bcrypt.hash('User@123', 12);
    await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'user@securedocs.com',
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
      },
    });
    console.log('✓ Test user created: user@securedocs.com / User@123');
  } else {
    console.log('✓ Test user already exists');
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
