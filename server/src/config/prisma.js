const { PrismaClient } = require('@prisma/client');

let prisma;

const getPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
};

const disconnectPrisma = async () => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};

module.exports = { getPrismaClient, disconnectPrisma };
