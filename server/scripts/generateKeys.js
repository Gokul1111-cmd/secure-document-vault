const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '..', 'keys');

// X25519 ECC keys (for ECDH key wrapping) - 10x faster, 87% smaller than RSA
const x25519PrivateKeyPath = path.join(keysDir, 'x25519.private.pem');
const x25519PublicKeyPath = path.join(keysDir, 'x25519.public.pem');

// Legacy RSA keys (kept for backward compatibility if needed)
const rsaPrivateKeyPath = path.join(keysDir, 'private.pem');
const rsaPublicKeyPath = path.join(keysDir, 'public.pem');

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Generate X25519 keys (primary)
if (!fs.existsSync(x25519PrivateKeyPath) || !fs.existsSync(x25519PublicKeyPath)) {
  console.log('🔐 Generating X25519 ECC key pair (ECDH key wrapping)...');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519');

  const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' });
  const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' });

  fs.writeFileSync(x25519PrivateKeyPath, privateKeyPem);
  fs.writeFileSync(x25519PublicKeyPath, publicKeyPem);
  console.log('✓ X25519 key pair generated successfully');
  console.log(`  Private key: ${x25519PrivateKeyPath}`);
  console.log(`  Public key: ${x25519PublicKeyPath}`);
} else {
  console.log('✓ X25519 key pair already exists');
}

// Generate RSA keys (for backward compatibility, kept as optional)
if (!fs.existsSync(rsaPrivateKeyPath) || !fs.existsSync(rsaPublicKeyPath)) {
  console.log('🔐 Generating RSA-2048 key pair (legacy, for backward compatibility)...');
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

  fs.writeFileSync(rsaPrivateKeyPath, privateKey);
  fs.writeFileSync(rsaPublicKeyPath, publicKey);
  console.log('✓ RSA key pair generated successfully');
  console.log(`  Private key: ${rsaPrivateKeyPath}`);
  console.log(`  Public key: ${rsaPublicKeyPath}`);
} else {
  console.log('✓ RSA key pair already exists');
}

console.log('\n✨ Key generation complete!');
console.log('  X25519 (ECC): Used for ECDH-based key wrapping (primary)');
console.log('  RSA-2048: Kept for legacy backward compatibility');
console.log('\n💡 Benefits of X25519 over RSA-2048:');
console.log('   • 10x faster key operations');
console.log('   • 87% smaller keys (32 bytes vs 256 bytes)');
console.log('   • Constant-time operations (timing-attack resistant)');
console.log('   • Post-quantum transition ready (migration path to Kyber)');
