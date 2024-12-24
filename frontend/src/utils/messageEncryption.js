// This is a browser-compatible version of the encryption utility
export class MessageEncryption {
  static async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    const publicKey = await window.crypto.subtle.exportKey(
      'spki',
      keyPair.publicKey
    );
    const privateKey = await window.crypto.subtle.exportKey(
      'pkcs8',
      keyPair.privateKey
    );

    return {
      publicKey: this._arrayBufferToBase64(publicKey),
      privateKey: this._arrayBufferToBase64(privateKey),
    };
  }

  static async generateSharedSecret(privateKey, otherPublicKey) {
    const importedPrivateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      this._base64ToArrayBuffer(privateKey),
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    const importedPublicKey = await window.crypto.subtle.importKey(
      'spki',
      this._base64ToArrayBuffer(otherPublicKey),
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      false,
      []
    );

    const sharedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: importedPublicKey,
      },
      importedPrivateKey,
      256
    );

    return this._arrayBufferToBase64(sharedBits);
  }

  static async encryptMessage(message, sharedSecret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const salt = window.crypto.getRandomValues(new Uint8Array(16));

    const key = await this._deriveKey(sharedSecret, salt);

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    return {
      encryptedContent: this._arrayBufferToBase64(encrypted),
      iv: this._arrayBufferToBase64(iv),
      salt: this._arrayBufferToBase64(salt),
    };
  }

  static async decryptMessage(encryptedData, sharedSecret) {
    try {
      const key = await this._deriveKey(
        sharedSecret,
        this._base64ToArrayBuffer(encryptedData.salt)
      );

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: this._base64ToArrayBuffer(encryptedData.iv),
        },
        key,
        this._base64ToArrayBuffer(encryptedData.encryptedContent)
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  static async _deriveKey(sharedSecret, salt) {
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      this._base64ToArrayBuffer(sharedSecret),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  static _base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
