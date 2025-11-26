const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '..', 'keys');
const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
  console.log('Generating RSA-2048 key pair...');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);
  console.log('✓ RSA key pair generated successfully');
  console.log(`  Private key: ${privateKeyPath}`);
  console.log(`  Public key: ${publicKeyPath}`);
} else {
  console.log('✓ RSA key pair already exists');
}
