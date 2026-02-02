const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * ECC-based key wrapping using X25519 ECDH
 * 
 * Benefits over RSA-2048:
 * - 10x faster key operations
 * - 87% smaller keys (32 bytes vs 256 bytes)
 * - Constant-time operations (timing-attack resistant)
 * - Post-quantum transition ready (can migrate to Kyber)
 * 
 * How it works:
 * 1. Generate ephemeral key pair for each wrap operation
 * 2. Perform ECDH with public key to derive shared secret
 * 3. Use HKDF to derive wrapping key from shared secret
 * 4. Use AES-256-GCM to encrypt AES key
 * 5. Return: ephemeral_public_key + IV + encrypted_key + auth_tag
 */

let publicKey = null;
let privateKey = null;

const getInlineKey = (envValue) => {
  if (!envValue || !envValue.length) return null;
  return envValue.replace(/\\n/g, '\n').replace(/\r?\n/g, '\n');
};

const loadKeys = () => {
  if (privateKey && publicKey) return;

  // Try inline keys first (for cloud deployment)
  const inlinePrivate = getInlineKey(process.env.X25519_PRIVATE_KEY);
  const inlinePublic = getInlineKey(process.env.X25519_PUBLIC_KEY);

  if (inlinePrivate && inlinePublic) {
    privateKey = crypto.createPrivateKey({
      key: inlinePrivate,
      format: 'pem',
    });
    publicKey = crypto.createPublicKey({
      key: inlinePublic,
      format: 'pem',
    });
    return;
  }

  // Fall back to file-based keys (for local development)
  const privateKeyPath = path.resolve(
    process.cwd(),
    process.env.X25519_PRIVATE_KEY_PATH || 'keys/x25519.private.pem'
  );
  const publicKeyPath = path.resolve(
    process.cwd(),
    process.env.X25519_PUBLIC_KEY_PATH || 'keys/x25519.public.pem'
  );

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    throw new Error('X25519 keys not found. Run: node scripts/generateKeys.js');
  }

  privateKey = crypto.createPrivateKey({
    key: fs.readFileSync(privateKeyPath, 'utf8'),
    format: 'pem',
  });

  publicKey = crypto.createPublicKey({
    key: fs.readFileSync(publicKeyPath, 'utf8'),
    format: 'pem',
  });
};

/**
 * Derive wrapping key using ECDH + HKDF
 * @param {Buffer} sharedSecret - Shared secret from ECDH
 * @param {Buffer} salt - Optional salt for HKDF
 * @returns {Buffer} 32-byte key for AES-256
 */
const deriveWrappingKey = (sharedSecret, salt) => {
  const hkdf = crypto.hkdfSync(
    'sha256',
    sharedSecret,
    salt || Buffer.alloc(0),
    Buffer.from('aes-key-wrap', 'utf8'),
    32
  );
  return hkdf;
};

/**
 * Wrap an AES key using X25519 ECDH
 * Format: ephemeral_public_key (32 bytes) + IV (12) + encrypted_key + auth_tag (16)
 * @param {Buffer} aesKey - AES key to wrap (32 bytes)
 * @returns {string} Base64-encoded wrapped key
 */
const wrapAESKey = (aesKey) => {
  if (!privateKey || !publicKey) loadKeys();

  // 1. Generate ephemeral X25519 key pair
  const { privateKey: ephemeralPrivate, publicKey: ephemeralPublic } =
    crypto.generateKeyPairSync('x25519');

  // 2. Perform ECDH to derive shared secret
  const sharedSecret = crypto.diffieHellman({
    privateKey: ephemeralPrivate,
    publicKey, // Server's public key
  });

  // 3. Derive wrapping key using HKDF
  const wrappingKey = deriveWrappingKey(sharedSecret);

  // 4. Encrypt AES key with derived wrapping key using AES-256-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', wrappingKey, iv);
  const encrypted = Buffer.concat([cipher.update(aesKey), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // 5. Get ephemeral public key in raw format (32 bytes)
  const ephemeralPublicRaw = ephemeralPublic.export({ type: 'spki', format: 'der' }).slice(-32);

  // 6. Combine: ephemeral_public_key + IV + encrypted_key + auth_tag
  const wrapped = Buffer.concat([ephemeralPublicRaw, iv, encrypted, authTag]);

  return wrapped.toString('base64');
};

/**
 * Unwrap an AES key using X25519 ECDH
 * @param {string} wrappedKeyB64 - Base64-encoded wrapped key from wrapAESKey
 * @returns {Buffer} Original AES key (32 bytes)
 */
const unwrapAESKey = (wrappedKeyB64) => {
  if (!privateKey || !publicKey) loadKeys();

  const wrapped = Buffer.from(wrappedKeyB64, 'base64');

  // Extract components
  const ephemeralPublicRaw = wrapped.slice(0, 32);
  const iv = wrapped.slice(32, 44); // 12 bytes
  const encryptedKey = wrapped.slice(44, -16); // All but last 16 bytes (auth tag)
  const authTag = wrapped.slice(-16);

  // Reconstruct ephemeral public key from raw bytes
  // X25519 public key in DER format: 12-byte header + 32-byte key
  const derHeader = Buffer.from([
    0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65,
    0x6e, 0x03, 0x21, 0x00
  ]);
  const ephemeralPublicDer = Buffer.concat([derHeader, ephemeralPublicRaw]);
  const ephemeralPublic = crypto.createPublicKey({
    key: ephemeralPublicDer,
    format: 'der',
    type: 'spki',
  });

  // Perform ECDH with ephemeral public key
  const sharedSecret = crypto.diffieHellman({
    privateKey, // Server's private key
    publicKey: ephemeralPublic,
  });

  // Derive same wrapping key
  const wrappingKey = deriveWrappingKey(sharedSecret);

  // Decrypt
  const decipher = crypto.createDecipheriv('aes-256-gcm', wrappingKey, iv);
  decipher.setAuthTag(authTag);

  try {
    const aesKey = Buffer.concat([decipher.update(encryptedKey), decipher.final()]);
    return aesKey;
  } catch (err) {
    throw new Error('Failed to unwrap AES key: Invalid password or corrupted key');
  }
};

module.exports = {
  loadKeys,
  wrapAESKey,
  unwrapAESKey,
  deriveWrappingKey,
};
