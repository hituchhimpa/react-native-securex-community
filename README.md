# 🛡️ react-native-securex

<p align="center">
  <img src="./assets/securex_banner.png" width="100%" alt="SecureX React Native Security SDK" style="border-radius: 12px;" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@hituchhimpa/react-native-securex"><img src="https://img.shields.io/npm/v/@hituchhimpa/react-native-securex.svg?style=for-the-badge&color=00E5FF&labelColor=0B0F19" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@hituchhimpa/react-native-securex"><img src="https://img.shields.io/npm/dm/@hituchhimpa/react-native-securex.svg?style=for-the-badge&color=10B981&labelColor=0B0F19" alt="npm downloads" /></a>
  <a href="https://reactnative.dev/docs/the-new-architecture/landing-page"><img src="https://img.shields.io/badge/TurboModules-JSI%20Native-7928CA?style=for-the-badge&labelColor=0B0F19" alt="TurboModule" /></a>
  <a href="https://expo.dev"><img src="https://img.shields.io/badge/Expo-Config%20Plugin-4630EB?style=for-the-badge&labelColor=0B0F19" alt="Expo" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge&labelColor=0B0F19" alt="License" /></a>
</p>

<h3 align="center">
  The Zero-Trust Security, Biometrics & Cryptographic Vault for React Native & Expo.
</h3>

<p align="center">
  <strong>Replace 5+ fragmented, unmaintained security libraries with a single, high-performance native SDK.</strong>
  <br />
  Hardware-backed by Apple Secure Enclave & Android StrongBox. Zero JavaScript heap exposure. No complex Redux-Persist boilerplate required.
</p>

---

## ⚡ Why Developers Are Switching to SecureX

For years, securing a React Native app required assembling a brittle patchwork of 5+ separate dependencies:
`react-native-keychain` + `react-native-biometrics` + `jail-monkey` + `react-native-privacy-snapshot` + `redux-persist` + custom crypto code.

### 🚫 The Legacy Approach:
- ❌ **Fragile Redux-Persist Auth Boilerplate**: Developers often set up Redux + `redux-persist` + `@react-native-async-storage/async-storage` + sensitive-storage plugins just to persist tokens across app reloads. This adds 60+ lines of config, rehydration lag, and leaves tokens exposed in plaintext on disk.
- ❌ **Memory Leaks in JS Heap**: Passing tokens as standard JavaScript strings leaves them vulnerable to heap-dump memory forensics.
- ❌ **No Modern Anti-Hooking**: Basic root checkers are bypassed in seconds by modern Frida scripts and Magisk Zygisk modules.
- ❌ **No Cryptographic Request Signing**: Legacy libraries store passwords, but can't generate hardware-backed asymmetric ECDSA signatures to authenticate API requests or approve transactions.
- ❌ **Bridge Overhead**: Slow asynchronous bridge serialization that stutters on React Native's New Architecture.

### 🛡️ The SecureX Solution:
- ✅ **Native Session Persistence (No Redux-Persist Needed)**: Persist session tokens and user state directly in hardware-isolated cryptoprocessors with automatic session timeout (`setSessionTimeout`), biometric unlock, and instant memory wipe (`wipeSession`) without requiring Redux or AsyncStorage!
- ✅ **Single Native SDK**: Biometrics + Enclave Storage + Threat Detection + Memory Zeroing + Cryptographic Signing in one unified API.
- ✅ **TurboModules & Direct JSI**: Native Swift & Kotlin execution with zero bridge serialization overhead.
- ✅ **Zero-Heap Memory Lock**: Native `mlock` memory pages (iOS) and zero-cleared byte arrays (Android) that never touch the JavaScript garbage collector.
- ✅ **Runtime Threat Shield**: Detects Frida/Xposed dynamic memory hooking, debuggers, APK tampering, and jailbreak/root environments in real-time.
- ✅ **Expo Out-of-the-Box**: Includes an official Expo Config Plugin for seamless EAS Prebuild workflows.

---

## 🚀 30-Second Quick Start

### 1. Installation

```sh
# npm
npm install @hituchhimpa/react-native-securex

# yarn
yarn add @hituchhimpa/react-native-securex

# bun
bun add @hituchhimpa/react-native-securex
```

#### iOS Setup
```sh
cd ios && pod install
```
Add Face ID permission description to your `ios/YourApp/Info.plist`:
```xml
<key>NSFaceIDUsageDescription</key>
<string>Authenticate securely using Face ID.</string>
```

#### Expo Setup
Add the plugin to your `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "@hituchhimpa/react-native-securex",
        { "faceIDPermission": "Authenticate securely using Face ID." }
      ]
    ]
  }
}
```

---

## 💡 Copy-Paste Code Recipes

### 1. One-Tap Biometric Authentication

Prompt the user for Face ID, Touch ID, or Android Biometric Prompt:

```typescript
import { SecureX } from '@hituchhimpa/react-native-securex';

const loginWithBiometrics = async () => {
  const result = await SecureX.simplePrompt({
    promptMessage: 'Confirm your identity to unlock SecureX',
    cancelButtonText: 'Use Passcode',
  });

  if (result.success) {
    console.log('User authenticated via Secure Enclave / KeyStore!');
  } else {
    console.warn('Authentication failed or cancelled:', result.error);
  }
};
```

---

### 2. Encrypted Hardware Storage (Biometric-Gated)

Encrypt session tokens or API keys with AES-256 inside hardware chips. Gate access with biometric prompts:

```typescript
// Store a secret gated by Face ID / Fingerprint
await SecureX.setItem(
  'user_auth_token',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Authenticate to save your credentials'
);

// Retrieve the secret (automatically prompts biometrics)
const token = await SecureX.getItem(
  'user_auth_token',
  'Authenticate to access your account'
);

// Wipe secret when user logs out
await SecureX.removeItem('user_auth_token');
```

> **Tip**: Pass an empty string `""` for the prompt parameter to store and retrieve data **silently** without prompting the user, while still benefiting from hardware encryption.

---

### 3. Biometric Cryptographic Signatures (PKI Authentication)

Eliminate static passwords by having the device sign server challenge nonces using a hardware-bound private key:

```typescript
// 1. Generate hardware ECDSA P-256 key pair on enrollment
const { publicKey } = await SecureX.createKeys();
// Send publicKey to your backend to register device

// 2. Sign transaction / login payload with biometric authorization
const { success, signature } = await SecureX.createSignature({
  promptMessage: 'Authorize $250.00 transfer',
  payload: `transfer:250:nonce_${serverNonce}`,
});

if (success && signature) {
  // Send signature to your server for cryptographic verification!
}
```

---

### 4. 🚀 Ditch `redux-persist` for Auth State (Or Use as Drop-in Adapter)

Stop configuring `redux-persist`, AsyncStorage, transformers, and complex migration boilerplate just to keep user tokens alive across app reloads. SecureX provides hardware-backed persistence out of the box:

#### Pattern A: Zero-Redux Native Auth State (Recommended)
Save and retrieve session tokens directly in hardware-isolated memory without Redux store rehydration delays:

```typescript
import { SecureX } from '@hituchhimpa/react-native-securex';

// On Login: Store session directly in hardware-isolated vault
export const saveUserSession = async (userSession: { token: string; userId: string }) => {
  await SecureX.setItem('auth_session', JSON.stringify(userSession));
};

// On App Launch: Fast, encrypted retrieval without Redux rehydration lag
export const loadUserSession = async () => {
  const session = await SecureX.getItem('auth_session');
  return session ? JSON.parse(session) : null;
};

// On Logout: Instant cryptographic wipe
export const logoutUser = async () => {
  await SecureX.removeItem('auth_session');
  SecureX.wipeSession();
};
```

#### Pattern B: Using Redux? Use SecureX as a 1-Line Secure Storage Engine
If your codebase already uses Redux and you want to replace insecure `AsyncStorage`, SecureX drops right in as a hardware-backed storage adapter:

```typescript
import { persistStore, persistReducer } from 'redux-persist';
import { SecureX } from '@hituchhimpa/react-native-securex';

// Drop-in secure hardware storage engine for redux-persist
export const secureXStorage = {
  setItem: (key: string, value: string) => SecureX.setItem(key, value, ''),
  getItem: (key: string) => SecureX.getItem(key, ''),
  removeItem: (key: string) => SecureX.removeItem(key),
};

const persistConfig = {
  key: 'root',
  storage: secureXStorage,
  whitelist: ['auth'], // Hardware-encrypted with AES-256 StrongBox / Secure Enclave
};
```

---

### 5. Real-Time Threat & Risk Audit

Inspect whether the host operating system or process memory is compromised before running sensitive operations:

```typescript
const posture = SecureX.audit();

console.log(`Security Score: ${posture.securityScore}/100`);

if (posture.jailbroken || posture.rooted) {
  throw new Error('Device is rooted or jailbroken. Halting financial features.');
}

if (posture.hookingDetected) {
  throw new Error('Frida / Xposed dynamic hooking detected in process memory!');
}

if (posture.debuggerAttached) {
  console.warn('Debugger attached to production process.');
}
```

---

### 6. Granular Biometric Sensor Discovery

Know exactly what biometric hardware is physically present and enrolled on the user's device:

```typescript
const sensor = await SecureX.isSensorAvailable();

console.log('Available:', sensor.available);          // true
console.log('Primary Biometry:', sensor.biometryType); // 'FaceID' | 'TouchID' | 'Fingerprint' | 'Iris'
console.log('Has Fingerprint:', sensor.hasFingerprint);
console.log('Has Face Recognition:', sensor.hasFace);
console.log('Has Iris Scanner:', sensor.hasIris);
```

---

## 📱 Interactive Showcase App

Test all features firsthand with the included **SecureX Showcase** example application:

```sh
# Clone and prepare
git clone https://github.com/hituchhimpa/react-native-securex-community.git
cd react-native-securex-community
yarn install
yarn prepare

# Run iOS Showcase
yarn example ios

# Run Android Showcase
yarn example android
```

The example app features a dark cyberpunk dashboard with:
- 🛡️ Live Security Posture & Hardware Scorecard
- 🧬 Sensor hardware detection
- 👤 Face ID / Fingerprint interactive login
- ✍️ Cryptographic payload signing
- 💾 Biometric-gated vault storage
- 💻 Real-time audit event terminal

---

## 📖 Complete API Reference

### 🔐 Core Vault & Storage
| Method | Description | Return Type |
| :--- | :--- | :--- |
| `SecureX.setItem(key, value, prompt)` | Stores encrypted secret | `Promise<boolean>` |
| `SecureX.getItem(key, prompt)` | Decrypts and returns secret | `Promise<string \| null>` |
| `SecureX.removeItem(key)` | Deletes key from storage | `Promise<boolean>` |
| `SecureX.encrypt(plainText, prompt)` | Encrypts raw string to Base64 | `Promise<string>` |
| `SecureX.decrypt(cipherBase64, prompt)` | Decrypts Base64 ciphertext | `Promise<string>` |
| `SecureX.hasSecureLockScreen()` | Checks if PIN/Passcode/Biometric lock is active | `boolean` |

### 🧬 Biometrics & PKI Signatures
| Method | Description | Return Type |
| :--- | :--- | :--- |
| `SecureX.isSensorAvailable()` | Discovers available hardware sensors | `Promise<SensorResult>` |
| `SecureX.simplePrompt(options)` | Native biometric authentication modal | `Promise<SimplePromptResult>` |
| `SecureX.createKeys()` | Generates hardware ECDSA P-256 keypair | `Promise<CreateKeysResult>` |
| `SecureX.biometricKeysExist()` | Checks if hardware keys exist | `Promise<BiometricKeysExistResult>` |
| `SecureX.deleteKeys()` | Deletes hardware keypair | `Promise<DeleteKeysResult>` |
| `SecureX.createSignature(options)` | Signs payload with biometric prompt | `Promise<CreateSignatureResult>` |

### 🛡️ Runtime Fortress & Anti-Tamper
| Method | Description | Return Type |
| :--- | :--- | :--- |
| `SecureX.audit()` | Full synchronous security posture scan | `AuditResult` |
| `SecureX.setPrivacyScreenEnabled(flag)` | Blur app in App Switcher & block screenshots | `void` |
| `SecureX.setOverlayProtectionEnabled(flag)` | Block touch events during overlay/tapjacking | `void` |
| `SecureX.generateAttestation(nonce)` | Generates App Attest / Play Integrity token | `Promise<string>` |
| `SecureX.setSessionTimeout(seconds)` | Configures automatic session expiration | `void` |
| `SecureX.isSessionExpired()` | Checks if session has timed out | `boolean` |
| `SecureX.wipeSession()` | Wipes sensitive session credentials | `void` |

### 🧠 Native-Isolated In-Memory Store
| Method | Description | Return Type |
| :--- | :--- | :--- |
| `SecureX.secureStore(key, value)` | Stores secret in `mlock` page (no JS heap) | `void` |
| `SecureX.secureRead(key)` | Reads secret from native memory | `string \| null` |
| `SecureX.secureWipe()` | Zeroes out memory buffers immediately | `void` |

---

## 🔒 Security & Supply Chain Integrity

`react-native-securex` adheres to strict zero-trust supply chain principles:
- **No Install Scripts**: Zero postinstall or lifecycle execution hooks.
- **Hardware Isolation**: Private keys never leave the hardware cryptoprocessor.
- **Memory Zeroing**: Sensitive native buffers are zeroed before deallocation.
- For coordinated vulnerability disclosure, review [SECURITY.md](SECURITY.md).

---

## 🤝 Contributing

Contributions, feedback, and pull requests are warmly welcomed! Please check [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## 📄 License

MIT © [Hitesh Chhimpa](https://github.com/hituchhimpa). Built with ❤️ for the React Native community.
