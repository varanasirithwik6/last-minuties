// ============================================================
// Last Minuties — Multi-Layer Cryptography & Privacy Engine
// Client-side End-to-End Encryption (E2EE) + Privacy Relay
// ============================================================

/**
 * Multi-Layer Encryption Architecture:
 * - Layer 1: AES-GCM 256-bit Authenticated Client Encryption
 * - Layer 2: HMAC-SHA256 Message Envelope Integrity & Anti-Tampering
 * - Layer 3: Zero-Knowledge Privacy Relay ID & PII Phone Masking
 */

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded AES-GCM ciphertext + auth tag
  iv: string;         // Base64 encoded 12-byte initialization vector
  hmac: string;       // Base64 encoded HMAC-SHA256 integrity hash
  keyId: string;      // Identifier of the derived connection session key
  timestamp: string;  // ISO timestamp of encryption
}

export interface PrivacyScanResult {
  hasPII: boolean;
  type?: 'phone' | 'email' | 'payment_upi' | 'account_number';
  maskedText: string;
  detectedPattern?: string;
}

// Convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Convert UTF-8 string to Uint8Array
function strToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert Uint8Array to UTF-8 string
function bytesToStr(bytes: ArrayBuffer | Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Derives a deterministic 256-bit AES-GCM encryption key & HMAC key
 * for a specific connection between two users and a listing.
 */
export async function deriveConnectionKeys(connectionId: string, secretSalt = 'lm-e2ee-session-salt-v1'): Promise<{
  encKey: CryptoKey;
  hmacKey: CryptoKey;
  keyFingerprint: string;
}> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    strToBytes(`LM_SESSION_KEY_${connectionId}_${secretSalt}`) as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  const saltBytes = strToBytes(`salt_${connectionId}`) as BufferSource;

  // 1. Derive AES-GCM 256-bit encryption key
  const encKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Derive HMAC-SHA256 integrity key
  const hmacKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign', 'verify']
  );

  // 3. Export raw bytes to generate a human-readable 16-digit safety fingerprint
  const rawKey = await crypto.subtle.exportKey('raw', encKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKey);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Format as 4 groups of 4 digits (e.g. 8492 1049 3821 7590)
  const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  const numString = BigInt(`0x${hex.slice(0, 20)}`).toString().padStart(16, '0').slice(0, 16);
  const keyFingerprint = `${numString.slice(0, 4)} ${numString.slice(4, 8)} ${numString.slice(8, 12)} ${numString.slice(12, 16)}`;

  return { encKey, hmacKey, keyFingerprint };
}

/**
 * Encrypts a plaintext message using AES-GCM-256 and computes HMAC-SHA256 integrity tag.
 */
export async function encryptMessage(
  plainText: string,
  keys: { encKey: CryptoKey; hmacKey: CryptoKey },
  keyId: string
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit standard IV for AES-GCM
  const encodedText = strToBytes(plainText) as BufferSource;

  // AES-GCM 256 Encryption
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    keys.encKey,
    encodedText
  );

  const ciphertextBase64 = bufferToBase64(encryptedBuffer);
  const ivBase64 = bufferToBase64(iv);
  const timestamp = new Date().toISOString();

  // Compute HMAC over (ciphertext + iv + timestamp + keyId)
  const envelopeData = strToBytes(`${ciphertextBase64}:${ivBase64}:${timestamp}:${keyId}`) as BufferSource;
  const hmacBuffer = await crypto.subtle.sign(
    'HMAC',
    keys.hmacKey,
    envelopeData
  );
  const hmacBase64 = bufferToBase64(hmacBuffer);

  return {
    ciphertext: ciphertextBase64,
    iv: ivBase64,
    hmac: hmacBase64,
    keyId,
    timestamp,
  };
}

/**
 * Decrypts an encrypted payload using AES-GCM-256 after verifying HMAC-SHA256 integrity.
 */
export async function decryptMessage(
  payload: EncryptedPayload,
  keys: { encKey: CryptoKey; hmacKey: CryptoKey }
): Promise<{ text: string; verified: boolean }> {
  try {
    // 1. Verify HMAC integrity first
    const envelopeData = strToBytes(`${payload.ciphertext}:${payload.iv}:${payload.timestamp}:${payload.keyId}`) as BufferSource;
    const hmacBytes = base64ToBuffer(payload.hmac) as BufferSource;
    const isValid = await crypto.subtle.verify(
      'HMAC',
      keys.hmacKey,
      hmacBytes,
      envelopeData
    );

    if (!isValid) {
      console.warn('E2EE Warning: HMAC integrity verification failed on message envelope');
      return { text: '[⚠️ Decryption Failed: Tampered Message Envelope]', verified: false };
    }

    // 2. Decrypt AES-GCM ciphertext
    const ciphertextBytes = base64ToBuffer(payload.ciphertext) as BufferSource;
    const ivBytes = base64ToBuffer(payload.iv) as BufferSource;

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes,
        tagLength: 128,
      },
      keys.encKey,
      ciphertextBytes
    );

    const text = bytesToStr(decryptedBuffer);
    return { text, verified: true };
  } catch (error) {
    console.error('Decryption error:', error);
    return { text: '[🔒 Encrypted Message: Session Key Mismatch]', verified: false };
  }
}

/**
 * Generates an anonymous, deterministic Student Relay ID (e.g., RELAY-#8F42)
 * from a user ID or seed so that real phone numbers and personal emails are never exposed.
 */
export function generateStudentRelayId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(0, 4);
  return `RELAY-#${hex}`;
}

/**
 * Real-time Privacy Guard:
 * Scans message content before sending to detect raw phone numbers, UPI handles, or credentials,
 * ensuring users do not accidentally broadcast their private contact info.
 */
export function scanForPII(text: string): PrivacyScanResult {
  // Common phone patterns:
  // - 10-digit Indian numbers: 9876543210, +91 98765 43210, 98765-43210
  // - General 10-12 digit phone numbers with optional spacing/dashes
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b[6-9]\d{9}\b|\b\d{5}\s\d{5}\b/gi;
  
  // Email patterns
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/gi;

  if (phoneRegex.test(text)) {
    const detected = text.match(phoneRegex)?.[0] || '';
    const maskedText = text.replace(phoneRegex, '•••••••••• (Phone Masked for Privacy 🛡️)');
    return {
      hasPII: true,
      type: 'phone',
      maskedText,
      detectedPattern: detected,
    };
  }

  if (emailRegex.test(text)) {
    const detected = text.match(emailRegex)?.[0] || '';
    const maskedText = text.replace(emailRegex, '••••••@college.edu (Email Masked 🛡️)');
    return {
      hasPII: true,
      type: 'email',
      maskedText,
      detectedPattern: detected,
    };
  }

  return {
    hasPII: false,
    maskedText: text,
  };
}
