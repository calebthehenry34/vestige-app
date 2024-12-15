
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

export class IpEncryption {
  constructor(encryptionKey) {
    if (Buffer.from(encryptionKey, 'hex').length !== KEY_LENGTH) {
      throw new Error('Invalid encryption key length');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  encrypt(ipAddress) {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
      
      let encrypted = cipher.update(ipAddress, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      // Format: iv:encrypted:authTag
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt IP address');
    }
  }

  decrypt(encryptedData) {
    try {
      const [ivHex, encrypted, authTagHex] = encryptedData.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt IP address');
    }
  }
}

