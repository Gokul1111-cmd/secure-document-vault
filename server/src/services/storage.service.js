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
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket: storageBucket || `${projectId}.appspot.com`,
    });
    bucket = admin.storage().bucket();
    console.log('✓ Firebase Storage initialized');
  } catch (error) {
    console.error('Firebase initialization error:', error.message);
  }
};

const uploadEncryptedStream = (readStream, fileName, mimeType) => {
  if (!bucket) throw new Error('Firebase Storage not initialized');

  const uniqueFileName = `${uuidv4()}_${fileName}`;
  const file = bucket.file(`encrypted/${uniqueFileName}`);
  const writeStream = file.createWriteStream({
    metadata: {
      contentType: 'application/octet-stream',
      metadata: { originalName: fileName, originalMimeType: mimeType },
    },
    resumable: false // Set to true for very large files if needed
  });

  return new Promise((resolve, reject) => {
    readStream.pipe(writeStream)
      .on('error', reject)
      .on('finish', () => resolve(`encrypted/${uniqueFileName}`));
  });
};

const getDownloadStream = (storagePath) => {
  if (!bucket) throw new Error('Firebase Storage not initialized');
  const file = bucket.file(storagePath);
  return file.createReadStream();
};

const deleteFile = async (storagePath) => {
  if (!bucket) throw new Error('Firebase Storage not initialized');
  const file = bucket.file(storagePath);
  await file.delete();
};

module.exports = {
  initializeFirebase,
  uploadEncryptedStream,
  getDownloadStream,
  deleteFile,
};