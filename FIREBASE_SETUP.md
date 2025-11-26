# Firebase Setup Guide

## ⚠️ Important: You need Firebase Admin SDK credentials for the backend

The credentials you provided are for **client-side Firebase** (React app). The backend needs **Firebase Admin SDK** credentials.

## Steps to Get Admin SDK Credentials:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **document-d5572**
3. Click the gear icon (⚙️) → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file

## What the JSON file contains:
```json
{
  "type": "service_account",
  "project_id": "document-d5572",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@document-d5572.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

## After downloading, extract these values:
- `project_id` → FIREBASE_PROJECT_ID
- `client_email` → FIREBASE_CLIENT_EMAIL  
- `private_key` → FIREBASE_PRIVATE_KEY (keep the \n characters!)

## Then update `.env` file in the server directory:
```env
FIREBASE_PROJECT_ID=document-d5572
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@document-d5572.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

---

## Meanwhile, I've created the frontend Firebase config for you!

The client-side config you provided has been added to the frontend. Restart the backend after adding the Admin SDK credentials.
