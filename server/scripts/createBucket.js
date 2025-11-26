const admin = require('firebase-admin');
require('dotenv').config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Firebase credentials not found in .env');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const bucketName = `${projectId}.appspot.com`;

async function checkAndCreateBucket() {
  try {
    const bucket = admin.storage().bucket(bucketName);
    const [exists] = await bucket.exists();
    
    if (exists) {
      console.log(`✓ Bucket ${bucketName} already exists and is accessible`);
    } else {
      console.log(`✗ Bucket ${bucketName} does not exist`);
      console.log('\nTo create it:');
      console.log('1. Go to: https://console.firebase.google.com/project/' + projectId + '/storage');
      console.log('2. Click "Get started" if Cloud Storage is not enabled');
      console.log('3. Select a location and create the bucket');
    }
  } catch (error) {
    console.error('Error checking bucket:', error.message);
    console.log('\nPossible issues:');
    console.log('1. Cloud Storage not enabled in Firebase Console');
    console.log('2. Service account lacks storage permissions');
    console.log('3. Bucket name is incorrect');
    console.log('\nVisit: https://console.firebase.google.com/project/' + projectId + '/storage');
  }
}

checkAndCreateBucket();
