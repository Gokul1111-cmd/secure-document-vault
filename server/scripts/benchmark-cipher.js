const crypto = require('crypto');

/**
 * Performance benchmark: AES-256-GCM vs ChaCha20-Poly1305
 * Tests encryption speed for 100MB file simulation
 */

const FILE_SIZE = 100 * 1024 * 1024; // 100MB
const CHUNK_SIZE = 64 * 1024; // 64KB chunks
const key = crypto.randomBytes(32);
const data = crypto.randomBytes(CHUNK_SIZE);

console.log('🔐 Encryption Performance Benchmark');
console.log('=' .repeat(60));
console.log(`File size: ${FILE_SIZE / (1024 * 1024)}MB`);
console.log(`Chunk size: ${CHUNK_SIZE / 1024}KB`);
console.log('');

// Benchmark AES-256-GCM
console.log('Testing AES-256-GCM...');
const aesStart = Date.now();
let aesIterations = Math.floor(FILE_SIZE / CHUNK_SIZE);
for (let i = 0; i < aesIterations; i++) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  cipher.update(data);
  cipher.final();
  cipher.getAuthTag();
}
const aesTime = Date.now() - aesStart;
const aesThroughput = (FILE_SIZE / aesTime / 1024).toFixed(2);

console.log(`✓ AES-256-GCM: ${aesTime}ms (${aesThroughput} MB/s)`);
console.log('');

// Benchmark ChaCha20-Poly1305
console.log('Testing ChaCha20-Poly1305...');
const chachaStart = Date.now();
let chachaIterations = Math.floor(FILE_SIZE / CHUNK_SIZE);
for (let i = 0; i < chachaIterations; i++) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('chacha20-poly1305', key, nonce);
  cipher.update(data);
  cipher.final();
  cipher.getAuthTag();
}
const chachaTime = Date.now() - chachaStart;
const chachaThroughput = (FILE_SIZE / chachaTime / 1024).toFixed(2);

console.log(`✓ ChaCha20-Poly1305: ${chachaTime}ms (${chachaThroughput} MB/s)`);
console.log('');

// Results
console.log('=' .repeat(60));
console.log('📊 Results:');
console.log(`AES-256-GCM:        ${aesTime}ms (${aesThroughput} MB/s)`);
console.log(`ChaCha20-Poly1305:  ${chachaTime}ms (${chachaThroughput} MB/s)`);
console.log('');

const speedup = (aesTime / chachaTime).toFixed(2);
const slower = (chachaTime / aesTime).toFixed(2);

if (chachaTime < aesTime) {
  console.log(`🚀 ChaCha20-Poly1305 is ${speedup}x FASTER than AES-256-GCM`);
  console.log('   (Better on ARM/mobile devices without AES-NI)');
} else {
  console.log(`⚡ AES-256-GCM is ${slower}x faster than ChaCha20-Poly1305`);
  console.log('   (Hardware-accelerated on x86 CPUs with AES-NI)');
}

console.log('');
console.log('💡 Recommendation:');
if (chachaTime < aesTime) {
  console.log('   Use ChaCha20-Poly1305 for mobile/ARM deployments');
} else {
  console.log('   Your CPU has AES-NI hardware acceleration');
  console.log('   Both ciphers are suitable, but AES-256-GCM is slightly faster');
}
