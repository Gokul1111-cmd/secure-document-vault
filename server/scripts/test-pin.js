const bcrypt = require('bcryptjs');
const {getPrismaClient, disconnectPrisma} = require('../src/config/prisma');

(async () => {
  try {
    const email = process.argv[2] || 'gok@gmail.com';
    const pin = process.argv[3] || '123456';
    
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, email: true, name: true, viewPinHash: true }
    });
    
    if (!user) {
      console.log(`User ${email} not found`);
      return;
    }
    
    console.log('User:', user.email, user.name);
    console.log('Has PIN hash:', !!user.viewPinHash);
    
    if (user.viewPinHash) {
      const isValid = await bcrypt.compare(pin, user.viewPinHash);
      console.log(`PIN "${pin}" is ${isValid ? 'VALID ✓' : 'INVALID ✗'}`);
    } else {
      console.log('No PIN set for this user');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await disconnectPrisma();
  }
})();
