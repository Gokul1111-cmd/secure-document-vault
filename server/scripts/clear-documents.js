const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearDocuments() {
  try {
    console.log('🗑️  Clearing all documents from database...\n');

    // Delete audit logs related to documents first
    const deletedLogs = await prisma.auditLog.deleteMany({
      where: {
        docId: { not: null }
      }
    });
    console.log(`✓ Deleted ${deletedLogs.count} document-related audit logs`);

    // Delete all documents
    const deletedDocuments = await prisma.document.deleteMany({});
    console.log(`✓ Deleted ${deletedDocuments.count} documents`);

    console.log('\n✅ All documents cleared successfully!\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing documents:');
    console.error('  ', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

clearDocuments();
