import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

export class MessageEncryption {
  static generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    return { publicKey, privateKey };
  }

  static async generateSharedSecret(privateKey, otherPublicKey) {
    const sharedSecret = crypto.createECDH('secp256k1');
    await sharedSecret.generateKeys();
    return sharedSecret.computeSecret(otherPublicKey);
  }

  static async encryptMessage(message, sharedSecret) {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const key = crypto.pbkdf2Sync(sharedSecret, salt, 100000, KEY_LENGTH, 'sha512');
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encryptedContent = cipher.update(message, 'utf8', 'hex');
    encryptedContent += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedContent,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  static async decryptMessage(encryptedData, sharedSecret) {
    try {
      const { encryptedContent, iv, salt, authTag } = encryptedData;
      
      const key = crypto.pbkdf2Sync(
        sharedSecret,
        Buffer.from(salt, 'hex'),
        100000,
        KEY_LENGTH,
        'sha512'
      );
      
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }
}
