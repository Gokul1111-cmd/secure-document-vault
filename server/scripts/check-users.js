const {getPrismaClient, disconnectPrisma} = require('../src/config/prisma');

(async () => {
  try {
    const prisma = getPrismaClient();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        viewPinHash: true,
        createdAt: true
      }
    });
    console.log('Registered Users:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await disconnectPrisma();
  }
})();
