# Crypto Notes

Encrypted notes app using JXR's Web Crypto engine. Demonstrates `JXRCrypto` for SHA-256 integrity hashing and ECDSA key pair generation.

```bash
npm install
jxr dev
```

Features:
- ECDSA P-256 signing key generated on startup
- SHA-256 content hashing on every edit
- Integrity digest displayed per note
