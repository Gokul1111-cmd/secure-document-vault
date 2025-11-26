/* End-to-end test: register, login, upload, download */
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const { loadKeys } = require('../src/services/encryption.service');
const { initializeFirebase } = require('../src/services/storage.service');
const { getPrismaClient, disconnectPrisma } = require('../src/config/prisma');

(async () => {
  try {
    loadKeys();
    initializeFirebase();
    const prisma = getPrismaClient();

    // Test credentials from user request (screenshot)
    const name = 'goku';
    const email = 'gok@gmail.com';
    const password = 'aaaaaa'; // >=6 chars per backend rule
    const pin = '123456'; // 6-digit PIN

    // Clean existing test user if exists for idempotency
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.auditLog.deleteMany({ where: { userId: existing.id } });
      await prisma.document.deleteMany({ where: { ownerUserId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    // Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ name, email, password, pin })
      .expect(201);
    console.log('REGISTER_OK', regRes.body.data);

    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    console.log('LOGIN_OK user', loginRes.body.data.user.email);
    const accessToken = loginRes.body.data.accessToken;

    // Prepare file
    const samplePath = path.resolve(process.cwd(), 'sample.txt');
    if (!fs.existsSync(samplePath)) {
      fs.writeFileSync(samplePath, 'Sample document content');
    }

    // Upload
    const uploadRes = await request(app)
      .post('/api/docs/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', samplePath)
      .expect(201);
    console.log('UPLOAD_OK docId', uploadRes.body.data.id);
    const docId = uploadRes.body.data.id;

    // List docs
    const listRes = await request(app)
      .get('/api/docs')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    console.log('DOCS_COUNT', listRes.body.data.length);

    // View (requires PIN)
    const viewRes = await request(app)
      .post(`/api/docs/${docId}/view`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pin })
      .expect(200);
    console.log('VIEW_OK length', viewRes.headers['content-length'] || viewRes.body.length || 'unknown');

    // Download (requires PIN in body)
    const dlRes = await request(app)
      .post(`/api/docs/${docId}/download`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ pin })
      .expect(200);
    console.log('DOWNLOAD_OK size', dlRes.headers['content-length'] || dlRes.body.length || 'unknown');

    // Basic assertions
    if (!dlRes.headers['content-type']) throw new Error('Missing content-type on download');

    console.log('E2E_SUCCESS');
  } catch (err) {
    console.error('E2E_FAILED', err.message);
    process.exitCode = 1;
  } finally {
    await disconnectPrisma().catch(()=>{});
  }
})();
