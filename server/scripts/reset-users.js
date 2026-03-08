const { PrismaClient } = require('@prisma/client');
const { hashValue } = require('../src/utils/hash');

const prisma = new PrismaClient();

async function resetUsers() {
  try {
    console.log('🧹 Resetting users...\n');

    const deletedPasswordResets = await prisma.passwordReset.deleteMany({});
    console.log(`✓ Deleted ${deletedPasswordResets.count} password reset tokens`);

    const deletedLogs = await prisma.auditLog.deleteMany({});
    console.log(`✓ Deleted ${deletedLogs.count} audit logs`);

    const deletedDocuments = await prisma.document.deleteMany({});
    console.log(`✓ Deleted ${deletedDocuments.count} documents`);

    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✓ Deleted ${deletedUsers.count} users`);

    const normalUserPasswordHash = await hashValue('Followsrules1!');
    const normalUserPinHash = await hashValue('159753');
    const adminPasswordHash = await hashValue('Admin@123');
    const adminPinHash = await hashValue('159753');

    const normalUser = await prisma.user.create({
      data: {
        name: 'Deekshitha',
        email: 'deekshi858@gmail.com',
        passwordHash: normalUserPasswordHash,
        viewPinHash: normalUserPinHash,
        role: 'USER',
        status: 'ACTIVE',
      },
    });

    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@securedocs.com',
        passwordHash: adminPasswordHash,
        viewPinHash: adminPinHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log('\n✅ Users recreated successfully:');
    console.log(`   USER  -> ${normalUser.email}`);
    console.log(`   ADMIN -> ${adminUser.email}`);
  } catch (error) {
    console.error('❌ Failed to reset users:', error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

resetUsers();