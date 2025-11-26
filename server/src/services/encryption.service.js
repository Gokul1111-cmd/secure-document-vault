const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let privateKey = null;
let publicKey = null;

const loadKeys = () => {
  const privateKeyPath = path.resolve(process.cwd(), process.env.RSA_PRIVATE_KEY_PATH || 'keys/private.pem');
  const publicKeyPath = path.resolve(process.cwd(), process.env.RSA_PUBLIC_KEY_PATH || 'keys/public.pem');

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    throw new Error('RSA keys not found. Run: node scripts/generateKeys.js');
  }

  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
};

const generateAESKey = () => {
  return crypto.randomBytes(32);
};

const encryptFileBuffer = (fileBuffer, aesKey) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);

  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
};

const decryptFileBuffer = (encryptedBuffer, aesKey) => {
  const iv = encryptedBuffer.slice(0, 12);
  const authTag = encryptedBuffer.slice(12, 28);
  const encrypted = encryptedBuffer.slice(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

const wrapAESKey = (aesKey) => {
  if (!publicKey) loadKeys();

  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    aesKey,
  );

  return encrypted.toString('base64');
};

const unwrapAESKey = (wrappedKey) => {
  if (!privateKey) loadKeys();

  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(wrappedKey, 'base64'),
  );

  return decrypted;
};

module.exports = {
  loadKeys,
  generateAESKey,
  encryptFileBuffer,
  decryptFileBuffer,
  wrapAESKey,
  unwrapAESKey,
};
