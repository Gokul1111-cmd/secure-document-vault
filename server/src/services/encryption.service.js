const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Transform, PassThrough } = require('stream');

let privateKey = null;
let publicKey = null;

const getInlineKey = (envValue) => {
  if (!envValue || !envValue.length) return null;
  return envValue.replace(/\\n/g, '\n').replace(/\r?\n/g, '\n');
};

const loadKeys = () => {
  if (privateKey && publicKey) return;

  const inlinePrivate = getInlineKey(process.env.RSA_PRIVATE_KEY);
  const inlinePublic = getInlineKey(process.env.RSA_PUBLIC_KEY);

  if (inlinePrivate && inlinePublic) {
    privateKey = inlinePrivate;
    publicKey = inlinePublic;
    return;
  }

  const privateKeyPath = path.resolve(process.cwd(), process.env.RSA_PRIVATE_KEY_PATH || 'keys/private.pem');
  const publicKeyPath = path.resolve(process.cwd(), process.env.RSA_PUBLIC_KEY_PATH || 'keys/public.pem');

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    throw new Error('RSA keys not found. Run: node scripts/generateKeys.js');
  }

  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
};

const generateAESKey = () => crypto.randomBytes(32);

// STREAMING ENCRYPTION
// Format: IV (12 bytes) + Encrypted Data + Auth Tag (16 bytes)
const createEncryptStream = (aesKey) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  
  const output = new PassThrough();
  
  // 1. Write IV to the beginning of the stream
  output.write(iv);
  
  // 2. Pipe cipher data to output
  cipher.on('data', (chunk) => output.write(chunk));
  
  // 3. On completion, append AuthTag and end stream
  cipher.on('end', () => {
    output.write(cipher.getAuthTag());
    output.end();
  });

  return { cipher, output };
};

// STREAMING DECRYPTION
// Handles parsing IV from start and Tag from end
const createDecryptStream = (aesKey) => {
  const ivLength = 12;
  const tagLength = 16;
  let ivRead = false;
  let ivBuffer = Buffer.alloc(0);
  let tagBuffer = Buffer.alloc(0);
  let decipher = null;

  return new Transform({
    transform(chunk, encoding, callback) {
      let data = chunk;

      // 1. Extract IV from the start of the stream
      if (!ivRead) {
        ivBuffer = Buffer.concat([ivBuffer, data]);
        if (ivBuffer.length >= ivLength) {
          const iv = ivBuffer.slice(0, ivLength);
          decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
          ivRead = true;
          data = ivBuffer.slice(ivLength); // Process remaining data in this chunk
        } else {
          return callback(); // Wait for more data
        }
      }

      if (data.length === 0) return callback();

      // 2. Buffer the last 16 bytes (Auth Tag)
      const total = Buffer.concat([tagBuffer, data]);
      
      if (total.length > tagLength) {
        // Everything except the last 16 bytes is ciphertext
        const toDecrypt = total.slice(0, total.length - tagLength);
        tagBuffer = total.slice(total.length - tagLength);
        
        try {
          const decrypted = decipher.update(toDecrypt);
          this.push(decrypted);
        } catch (err) {
          return callback(err);
        }
      } else {
        tagBuffer = total;
      }
      
      callback();
    },

    flush(callback) {
      if (!decipher) return callback(new Error('Stream too short or empty'));
      
      try {
        // 3. Set Auth Tag and finalize
        decipher.setAuthTag(tagBuffer);
        const final = decipher.final();
        this.push(final);
        callback();
      } catch (err) {
        callback(new Error('Decryption failed: Invalid password or corrupted file'));
      }
    }
  });
};

const wrapAESKey = (aesKey) => {
  if (!publicKey) loadKeys();
  return crypto.publicEncrypt(
    { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey
  ).toString('base64');
};

const unwrapAESKey = (wrappedKey) => {
  if (!privateKey) loadKeys();
  return crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(wrappedKey, 'base64')
  );
};

module.exports = {
  loadKeys,
  generateAESKey,
  createEncryptStream,
  createDecryptStream,
  wrapAESKey,
  unwrapAESKey,
};