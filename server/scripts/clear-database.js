const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('🗑️  Clearing database...\n');

    // Delete in correct order to respect foreign key constraints
    const deletedPasswordResets = await prisma.passwordReset.deleteMany({});
    console.log(`✓ Deleted ${deletedPasswordResets.count} password reset tokens`);

    const deletedLogs = await prisma.auditLog.deleteMany({});
    console.log(`✓ Deleted ${deletedLogs.count} audit logs`);

    const deletedDocuments = await prisma.document.deleteMany({});
    console.log(`✓ Deleted ${deletedDocuments.count} documents`);

    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✓ Deleted ${deletedUsers.count} users`);

    console.log('\n✅ Database cleared successfully!');
    console.log('You can now register new accounts.\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:');
    console.error('  ', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

clearDatabase();
