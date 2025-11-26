const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

let firebaseApp = null;
let bucket = null;

const initializeFirebase = () => {
  if (firebaseApp) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase credentials not configured. File storage disabled.');
    return;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: storageBucket || `${projectId}.appspot.com`,
    });

    bucket = admin.storage().bucket();
    console.log('✓ Firebase Storage initialized');
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }
};


const uploadEncryptedFile = async (encryptedBuffer, fileName, mimeType) => {
  if (!bucket) {
    throw new Error('Firebase Storage not initialized');
  }

  const uniqueFileName = `${uuidv4()}_${fileName}`;
  const file = bucket.file(`encrypted/${uniqueFileName}`);

  await file.save(encryptedBuffer, {
    metadata: {
      contentType: 'application/octet-stream',
      metadata: {
        originalName: fileName,
        originalMimeType: mimeType,
      },
    },
  });

  return `encrypted/${uniqueFileName}`;
};

const downloadEncryptedFile = async (storagePath) => {
  if (!bucket) {
    throw new Error('Firebase Storage not initialized');
  }

  const file = bucket.file(storagePath);
  const [buffer] = await file.download();
  return buffer;
};

const deleteFile = async (storagePath) => {
  if (!bucket) {
    throw new Error('Firebase Storage not initialized');
  }

  const file = bucket.file(storagePath);
  await file.delete();
};

module.exports = {
  initializeFirebase,
  uploadEncryptedFile,
  downloadEncryptedFile,
  deleteFile,
};
