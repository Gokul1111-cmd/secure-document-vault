const crypto = require('crypto');
const { Transform, PassThrough } = require('stream');
const { wrapAESKey: eccWrapKey, unwrapAESKey: eccUnwrapKey } = require('./eccKeyWrapping.service');

const generateAESKey = () => crypto.randomBytes(32);

// Determine cipher algorithm from environment or default to ChaCha20-Poly1305
const getDefaultCipher = () => {
  const cipher = process.env.ENCRYPTION_CIPHER || 'chacha20-poly1305';
  return cipher === 'aes-256-gcm' ? 'aes-256-gcm' : 'chacha20-poly1305';
};

// STREAMING ENCRYPTION with cipher selection
// Format: Cipher Flag (1 byte) + Nonce (12 or 24 bytes) + Encrypted Data + Auth Tag (16 bytes)
// Cipher Flag: 0x01 = AES-256-GCM, 0x02 = ChaCha20-Poly1305
const createEncryptStream = (aesKey, cipherType = null) => {
  const cipher = cipherType || getDefaultCipher();
  const isChaCha = cipher === 'chacha20-poly1305';
  
  // ChaCha20 uses 96-bit (12 bytes) nonce, same as AES-GCM
  const nonce = crypto.randomBytes(12);
  const cipherFlag = Buffer.from([isChaCha ? 0x02 : 0x01]);
  
  const cipherInstance = crypto.createCipheriv(cipher, aesKey, nonce);
  
  const output = new PassThrough();
  
  // 1. Write cipher flag (1 byte) + nonce (12 bytes) to the beginning
  output.write(cipherFlag);
  output.write(nonce);
  
  // 2. Pipe cipher data to output
  cipherInstance.on('data', (chunk) => output.write(chunk));
  
  // 3. On completion, append AuthTag and end stream
  cipherInstance.on('end', () => {
    output.write(cipherInstance.getAuthTag());
    output.end();
  });

  return { cipher: cipherInstance, output, cipherType: cipher };
};

// STREAMING DECRYPTION with automatic cipher detection
// Handles parsing cipher flag, nonce, and auth tag
const createDecryptStream = (aesKey) => {
  const cipherFlagLength = 1;
  const nonceLength = 12;
  const tagLength = 16;
  let cipherFlagRead = false;
  let nonceRead = false;
  let headerBuffer = Buffer.alloc(0);
  let tagBuffer = Buffer.alloc(0);
  let decipher = null;
  let cipherType = null;

  return new Transform({
    transform(chunk, encoding, callback) {
      let data = chunk;

      // 1. Extract cipher flag (1 byte) and nonce (12 bytes) from start
      if (!nonceRead) {
        headerBuffer = Buffer.concat([headerBuffer, data]);
        const headerLength = cipherFlagLength + nonceLength;
        
        if (headerBuffer.length >= headerLength) {
          const cipherFlag = headerBuffer[0];
          const nonce = headerBuffer.slice(cipherFlagLength, headerLength);
          
          // Determine cipher from flag
          cipherType = cipherFlag === 0x02 ? 'chacha20-poly1305' : 'aes-256-gcm';
          
          decipher = crypto.createDecipheriv(cipherType, aesKey, nonce);
          nonceRead = true;
          data = headerBuffer.slice(headerLength); // Process remaining data
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
  // Use X25519 ECDH-based wrapping (10x faster, 87% smaller keys)
  return eccWrapKey(aesKey);
};

const unwrapAESKey = (wrappedKey) => {
  // Use X25519 ECDH-based unwrapping
  return eccUnwrapKey(wrappedKey);
};

module.exports = {
  generateAESKey,
  getDefaultCipher,
  createEncryptStream,
  createDecryptStream,
  wrapAESKey,
  unwrapAESKey,
};