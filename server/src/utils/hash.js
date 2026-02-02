const bcrypt = require('bcryptjs');
const argon2 = require('argon2');

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  timeCost: 2,
  memoryCost: 19456,
  parallelism: 1,
};

const isBcryptHash = (hash) => typeof hash === 'string' && hash.startsWith('$2');
const isArgon2Hash = (hash) => typeof hash === 'string' && hash.startsWith('$argon2');

const hashValue = (value) => argon2.hash(value, ARGON2_OPTIONS);

const verifyHash = async (value, hash) => {
  if (!hash) return false;
  if (isArgon2Hash(hash)) {
    return argon2.verify(hash, value);
  }
  if (isBcryptHash(hash)) {
    return bcrypt.compare(value, hash);
  }
  return false;
};

const verifyAndUpgradeHash = async (value, hash, upgradeFn) => {
  const isValid = await verifyHash(value, hash);
  if (!isValid) return false;

  if (isBcryptHash(hash) && typeof upgradeFn === 'function') {
    const newHash = await hashValue(value);
    await upgradeFn(newHash);
  }

  return true;
};

module.exports = {
  ARGON2_OPTIONS,
  hashValue,
  verifyHash,
  verifyAndUpgradeHash,
};