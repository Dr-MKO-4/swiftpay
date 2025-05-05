// encryptionService.js
import crypto from 'crypto';
import { ENCRYPTION_KEY } from '@env';

console.log('Clé de chiffrement :', ENCRYPTION_KEY);

const algorithm = 'aes-256-gcm';
// Conversion de la clé en Buffer (doit être une clé hexadécimale de 32 octets)
const key = Buffer.from(ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef', 'hex');
const ivLength = 12; // Taille recommandée pour l'IV en mode GCM

/**
 * Chiffre une donnée en clair.
 * @param {string} plainText - Texte à chiffrer.
 * @returns {Object} Un objet contenant l'IV, le tag d'authentification et les données chiffrées.
 */
export function encryptData(plainText) {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encryptedData: encrypted,
  };
}

/**
 * Déchiffre des données chiffrées.
 * @param {Object} encryptedPayload - Objet contenant l'IV, le tag d'authentification et les données chiffrées.
 * @returns {string} Le texte en clair.
 */
export function decryptData(encryptedPayload) {
  const iv = Buffer.from(encryptedPayload.iv, 'hex');
  const authTag = Buffer.from(encryptedPayload.authTag, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedPayload.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
