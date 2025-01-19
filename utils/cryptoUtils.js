const crypto = require('crypto');

// Server-side pepper (store securely, e.g., in environment variables)
const PEPPER = process.env.PEPPER || 'super_secret_pepper';

/**
 * Generate a random salt.
 */
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash a message with salt and pepper using SHA-3.
 */
function hashMessage(message, salt) {
  const hash = crypto.createHash('sha3-512');
  hash.update(message + salt + PEPPER);
  return hash.digest('hex');
}

/**
 * Validate a message against a stored hash.
 */
function validateMessage(message, salt, storedHash) {
  const hash = hashMessage(message, salt);
  return hash === storedHash;
}

module.exports = { generateSalt, hashMessage, validateMessage };
