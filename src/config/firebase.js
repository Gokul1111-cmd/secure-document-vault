import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDaAiEXnIf0fitqeLyNMI57FlHasKWBARM",
  authDomain: "document-d5572.firebaseapp.com",
  projectId: "document-d5572",
  storageBucket: "document-d5572.firebasestorage.app",
  messagingSenderId: "235750654492",
  appId: "1:235750654492:web:f1568c231bb6494a9855d9",
  measurementId: "G-SMQ5NZJZTQ"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

export default app;
