const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✓ Database connected successfully');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✓ Query executed:', result);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('✗ Database connection failed:');
    console.error('  Error:', error.message);
    console.error('  Code:', error.code);
    process.exit(1);
  }
}

testConnection();
