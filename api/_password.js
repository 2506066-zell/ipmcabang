const crypto = require('crypto');

const SCRYPT_KEYLEN = 64;
const PBKDF2_ITERS = 1000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

function randomSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function safeEqualHex(a, b) {
  const aHex = String(a || '');
  const bHex = String(b || '');
  if (!aHex || !bHex || aHex.length !== bHex.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(aHex, 'hex'), Buffer.from(bHex, 'hex'));
  } catch {
    return false;
  }
}

function scryptHash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(password || ''), String(salt || ''), SCRYPT_KEYLEN, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

function pbkdf2Hash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      String(password || ''),
      String(salt || ''),
      PBKDF2_ITERS,
      PBKDF2_KEYLEN,
      PBKDF2_DIGEST,
      (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey.toString('hex'));
      }
    );
  });
}

async function hashPassword(password, salt = randomSalt()) {
  const cleanSalt = String(salt || randomSalt());
  const hash = await scryptHash(password, cleanSalt);
  return { salt: cleanSalt, hash };
}

async function verifyPassword(password, salt, storedHash) {
  const cleanSalt = String(salt || '');
  const cleanHash = String(storedHash || '');
  if (!cleanSalt || !cleanHash) return { ok: false, legacy: false };

  const scryptCandidate = await scryptHash(password, cleanSalt);
  if (safeEqualHex(scryptCandidate, cleanHash)) {
    return { ok: true, legacy: false };
  }

  // Legacy fallback for old hashes generated via PBKDF2.
  const legacyCandidate = await pbkdf2Hash(password, cleanSalt);
  if (safeEqualHex(legacyCandidate, cleanHash)) {
    return { ok: true, legacy: true };
  }

  return { ok: false, legacy: false };
}

module.exports = { hashPassword, verifyPassword };
