const {getPrismaClient, disconnectPrisma} = require('../src/config/prisma');

(async () => {
  try {
    const prisma = getPrismaClient();
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@securedocs.com' },
      select: { email: true, role: true, status: true, name: true }
    });
    console.log('Admin user details:');
    console.log(JSON.stringify(admin, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await disconnectPrisma();
  }
})();
