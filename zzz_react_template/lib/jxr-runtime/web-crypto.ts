/**
 * JXR.js — Web Crypto Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Layer: Core Runtime / Security
 *
 * Architecture:
 *   Universal Web Crypto API wrapper providing:
 *   - Module integrity verification (SHA-256/SHA-384 hashing)
 *   - Signed module manifests (ECDSA P-256)
 *   - Encrypted module caching (AES-GCM 256)
 *   - Key derivation for per-project isolation (HKDF)
 *   - Random nonce generation for replay protection
 *
 * All operations use the native SubtleCrypto API — no dependencies,
 * runs in any modern browser, Cloudflare Worker, or Deno runtime.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const subtle = globalThis.crypto.subtle;

export interface ModuleHash {
  algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512';
  digest: string; // hex-encoded
  size: number;
  timestamp: number;
}

export interface SignedManifest {
  modules: Record<string, ModuleHash>;
  projectId: string;
  version: string;
  signedAt: number;
  signature: string; // base64url-encoded ECDSA signature
  publicKey: string; // base64url-encoded SPKI public key
}

export interface EncryptedModule {
  ciphertext: string; // base64url
  iv: string;         // base64url, 12 bytes for AES-GCM
  tag: string;        // base64url, 16 bytes auth tag
  keyId: string;
}

export interface CryptoKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyExported: string; // base64url SPKI
}

/**
 * JXRCrypto — Universal Web Crypto API abstraction
 */
export class JXRCrypto {
  private signingKeyPair: CryptoKeyPair | null = null;
  private encryptionKeys: Map<string, CryptoKey> = new Map();
  private hashCache: Map<string, ModuleHash> = new Map();

  /** Generate an ECDSA P-256 signing key pair for module manifests */
  async generateSigningKeyPair(): Promise<CryptoKeyPair> {
    const keyPair = await subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    const spki = await subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyExported = this.toBase64Url(spki);

    this.signingKeyPair = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicKeyExported,
    };

    return this.signingKeyPair;
  }

  /** Hash a module's source code for integrity verification */
  async hashModule(
    source: string,
    algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'
  ): Promise<ModuleHash> {
    const cacheKey = `${algorithm}:${source.length}:${source.slice(0, 64)}`;
    const cached = this.hashCache.get(cacheKey);
    if (cached) return cached;

    const encoded = new TextEncoder().encode(source);
    const hashBuffer = await subtle.digest(algorithm, encoded);
    const digest = this.toHex(hashBuffer);

    const result: ModuleHash = {
      algorithm,
      digest,
      size: encoded.byteLength,
      timestamp: Date.now(),
    };

    this.hashCache.set(cacheKey, result);
    return result;
  }

  /** Verify a module's integrity against a known hash */
  async verifyModule(source: string, expected: ModuleHash): Promise<boolean> {
    const actual = await this.hashModule(source, expected.algorithm);
    return actual.digest === expected.digest;
  }

  /** Sign a module manifest with ECDSA P-256 */
  async signManifest(
    modules: Record<string, ModuleHash>,
    projectId: string,
    version: string
  ): Promise<SignedManifest> {
    if (!this.signingKeyPair) {
      await this.generateSigningKeyPair();
    }

    const manifest = {
      modules,
      projectId,
      version,
      signedAt: Date.now(),
    };

    const data = new TextEncoder().encode(JSON.stringify(manifest));
    const signatureBuffer = await subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      this.signingKeyPair!.privateKey,
      data
    );

    return {
      ...manifest,
      signature: this.toBase64Url(signatureBuffer),
      publicKey: this.signingKeyPair!.publicKeyExported,
    };
  }

  /** Verify a signed manifest */
  async verifyManifest(manifest: SignedManifest): Promise<boolean> {
    try {
      const spki = this.fromBase64Url(manifest.publicKey);
      const publicKey = await subtle.importKey(
        'spki',
        spki,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      );

      const { signature, publicKey: _pk, ...rest } = manifest;
      const data = new TextEncoder().encode(JSON.stringify(rest));
      const sigBuffer = this.fromBase64Url(signature);

      return await subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        sigBuffer,
        data
      );
    } catch {
      return false;
    }
  }

  /** Generate or retrieve an AES-GCM-256 encryption key for a project */
  async getEncryptionKey(keyId: string, projectSeed?: string): Promise<CryptoKey> {
    const existing = this.encryptionKeys.get(keyId);
    if (existing) return existing;

    let key: CryptoKey;

    if (projectSeed) {
      // Derive key from project seed using HKDF
      const seedBytes = new TextEncoder().encode(projectSeed);
      const baseKey = await subtle.importKey('raw', seedBytes, 'HKDF', false, ['deriveKey']);
      const salt = new TextEncoder().encode(`jxr-project-${keyId}`);
      const info = new TextEncoder().encode('JXR.js Module Cache v1');

      key = await subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt, info },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } else {
      key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ]);
    }

    this.encryptionKeys.set(keyId, key);
    return key;
  }

  /** Encrypt a module for secure caching */
  async encryptModule(source: string, keyId: string): Promise<EncryptedModule> {
    const key = await this.getEncryptionKey(keyId);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(source);

    const cipherBuffer = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    // AES-GCM appends 16-byte auth tag to ciphertext
    const ciphertext = cipherBuffer.slice(0, cipherBuffer.byteLength - 16);
    const tag = cipherBuffer.slice(cipherBuffer.byteLength - 16);

    return {
      ciphertext: this.toBase64Url(ciphertext),
      iv: this.toBase64Url(iv.buffer),
      tag: this.toBase64Url(tag),
      keyId,
    };
  }

  /** Decrypt a cached module */
  async decryptModule(encrypted: EncryptedModule): Promise<string> {
    const key = await this.getEncryptionKey(encrypted.keyId);
    const iv = this.fromBase64Url(encrypted.iv);
    const ciphertext = this.fromBase64Url(encrypted.ciphertext);
    const tag = this.fromBase64Url(encrypted.tag);

    // Reassemble ciphertext + tag for AES-GCM
    const combined = new Uint8Array(ciphertext.byteLength + tag.byteLength);
    combined.set(new Uint8Array(ciphertext));
    combined.set(new Uint8Array(tag), ciphertext.byteLength);

    const plainBuffer = await subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
    return new TextDecoder().decode(plainBuffer);
  }

  /** Generate a cryptographically secure random nonce */
  generateNonce(bytes = 16): string {
    const nonce = globalThis.crypto.getRandomValues(new Uint8Array(bytes));
    return this.toBase64Url(nonce.buffer);
  }

  /** Generate a project-unique ID using Web Crypto */
  async generateProjectId(name: string, timestamp: number): Promise<string> {
    const data = new TextEncoder().encode(`${name}:${timestamp}`);
    const hash = await subtle.digest('SHA-256', data);
    return this.toHex(hash).slice(0, 16);
  }

  // ─── Encoding utilities ───────────────────────────────────────────────────

  private toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private toBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private fromBase64Url(str: string): ArrayBuffer {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (padded.length % 4)) % 4;
    const base64 = padded + '='.repeat(padLength);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/** Singleton instance */
export const jxrCrypto = new JXRCrypto();
