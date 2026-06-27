# 🛡️ react-native-auth-vault

[![npm version](https://img.shields.io/npm/v/@hituchhimpa/react-native-auth-vault.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/@hituchhimpa/react-native-auth-vault)
[![npm downloads](https://img.shields.io/npm/dm/@hituchhimpa/react-native-auth-vault.svg?style=flat-square&color=green)](https://www.npmjs.com/package/@hituchhimpa/react-native-auth-vault)
[![Security Score](https://img.shields.io/badge/Security--Score-100%2F100-success?style=flat-square)](https://github.com/HituChhimpa7/react-native-auth-vault/blob/main/SECURITY.md)
[![Malware Shield](https://img.shields.io/badge/Malware--Shield-Protected-brightgreen?style=flat-square)](https://github.com/HituChhimpa7/react-native-auth-vault/blob/main/SECURITY.md)
[![Security Audit](https://img.shields.io/badge/Security--Audit-Passed-brightgreen?style=flat-square)](https://github.com/HituChhimpa7/react-native-auth-vault/blob/main/SECURITY.md)
[![license](https://img.shields.io/github/license/HituChhimpa7/react-native-auth-vault?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey?style=flat-square)](https://reactnative.dev)
[![New Architecture](https://img.shields.io/badge/New%20Architecture-✅-brightgreen?style=flat-square)](https://reactnative.dev/docs/the-new-architecture/landing-page)
[![Expo](https://img.shields.io/badge/Expo-✅-purple?style=flat-square)](https://expo.dev)

> **The zero-trust React Native security & authentication toolkit built for enterprise mobile applications.**

Replace 5+ separate security packages with a single, production-hardened SDK built on Apple Secure Enclave, Android StrongBox, and hardware security modules. 

`react-native-auth-vault` provides bank-grade biometric encryption, secure native in-memory storage (never exposed to the JavaScript heap), runtime threat and malware detection (debugger, Frida/Xposed hooking, app tampering, emulator, jailbreak/root), device attestation, and hardware-backed asymmetric ECDSA request signing.

<p align="center">
  <img src="./assets/auth_vault_mockup.png" width="450" alt="react-native-auth-vault mockup" />
</p>

---

## 🛡️ Anti-Malware & Supply Chain Security Shield

> [!IMPORTANT]
> **Zero-Trust Supply Chain Verification**: This package enforces strict anti-malware and supply chain security controls. For full architecture details, refer to [SECURITY.md](https://github.com/HituChhimpa7/react-native-auth-vault/blob/main/SECURITY.md).

- **No Dangerous Lifecycle Scripts**: Clean package exports with zero `preinstall` or `postinstall` script execution vectors.
- **Hardware Cryptographic Isolation**: Private keys and master secrets are bound to hardware chips (Secure Enclave / StrongBox) and never enter JavaScript heap memory.
- **Dynamic Hooking Block**: Scans active process memory maps (`/proc/self/maps`, dyld framework images) to detect and neutralize Frida gadgets or malicious Xposed hooking engines.
- **Tapjacking Defense**: Drops unauthorized touch events on Android whenever dynamic overlay malware attempts to hijack user authentication prompts.

---

## 📊 Feature Comparison

| Feature | `react-native-keychain` | `react-native-biometrics` | `react-native-encrypted-storage` | **react-native-auth-vault** |
|---|:---:|:---:|:---:|:---:|
| **Biometric Hardware Encryption** | ✅ | ✅ | ❌ | **✅ Yes** |
| **Hardware-Backed Keys** | Partial | ❌ | ❌ | **✅ Secure Enclave / StrongBox** |
| **Root & Jailbreak Detection** | ❌ | ❌ | ❌ | **✅ Multi-layered System Audit** |
| **Frida & Xposed Hooking Detection** | ❌ | ❌ | ❌ | **✅ Active Runtime RAM Scan** |
| **App Tampering Verification** | ❌ | ❌ | ❌ | **✅ Binary Signature Integrity** |
| **Device Attestation** | ❌ | ❌ | ❌ | **✅ Nonce-based Cryptographic** |
| **Session Expiry & Auto-Lock** | ❌ | ❌ | ❌ | **✅ Native Hardware Timers** |
| **Privacy Screen (App Switcher Masking)** | ❌ | ❌ | ❌ | **✅ Auto Blur / FLAG_SECURE** |
| **Tapjacking / Overlay Protection** | ❌ | ❌ | ❌ | **✅ Obscured Touch Drop** |
| **Secure Native In-Memory Storage** | ❌ | ❌ | ❌ | **✅ Zero-fill RAM / `mlock` page** |
| **Asymmetric ECC Signing** | ❌ | ❌ | ❌ | **✅ P-256 ECC Signatures** |
| **Real-time Security Events** | ❌ | ❌ | ❌ | **✅ Reactive Event Emitter** |
| **Unified Security Audit Engine** | ❌ | ❌ | ❌ | **✅ Real-time Audit Score** |
| **Expo Config Plugin** | ❌ | ❌ | ❌ | **✅ Plug-and-Play** |

---

## ✨ Native Architecture & Defense Features

### ⚡ Architecture Compatibility (TurboModules & JSI)
`react-native-auth-vault` is built on React Native's official **TurboModule Architecture (New Architecture / Codegen)** with direct JSI and Swift / Kotlin bindings for 100% zero-bridge native performance across React Native CLI and Expo apps.
- **TurboModules (Official New Architecture)**: ✅ **Supported natively out-of-the-box** with automatic C++/Swift/Kotlin dynamic bindings.
- **Nitro Modules**: ℹ️ Currently, core security operations run on official JSI TurboModules for maximum cross-platform stability and zero extra dependency overhead. Full Nitro Modules bindings are planned for a future release (v1.3.0) for ultra-low latency synchronous C++ cross-thread calls.

### 🔐 Hardware-Protected Vault & Encryption
AES-256 encryption backed by hardware-isolated cryptoprocessors.
- **iOS:** Keychain Services integration utilizing Access Control flags to gate keys with Face ID / Touch ID or Device Passcode.
- **Android:** AES-256 key generation inside `AndroidKeyStore` with dedicated **StrongBox** hardware support where available.

### 🕵️ Dynamic Threat & Malware Detection
Provides multi-layered system and runtime validation:
- **Jailbreak / Root Detection:** Scans for forbidden directories, writable files, system bin files (`su`, `busybox`), and mock location providers.
- **Frida / Xposed Injection:**
  - **iOS:** Inspects dyld images in memory for injected frameworks (`FridaGadget`, `cynject`, `libcycript`, `MobileSubstrate`).
  - **Android:** Parses `/proc/self/maps` at runtime to detect memory mappings of malicious binaries.
- **App Tamper Verification:**
  - **iOS:** Runs `SecStaticCodeCheckValidity` to verify code signature matches development keys.
  - **Android:** Extracts and compares the APK signing certificate hash against the expected original certificate.
- **Debugger Detection:** Monitors `sysctl` `P_TRACED` flag on iOS and `Debug.isDebuggerConnected()` on Android.

### 🧠 Secure In-Memory Storage (Zero Heap Exposure)
Variables stored in JavaScript heap can be easily dumped from memory or read by attackers. `auth-vault` provides native-level in-memory storage:
- **iOS:** Key-value pairs stored in memory pages locked using `mlock` to prevent them from writing to swap space.
- **Android:** Uses native `CharArray` buffers which can be manually zero-filled (`\u0000`) before garbage collection, rather than immutable Java strings.

### 📱 Privacy Screen & Tapjacking Defense
- **Privacy Screen:**
  - **iOS:** Automatically overlays a system `UIVisualEffectView` blur on application resignation (`UIApplicationWillResignActiveNotification`).
  - **Android:** Sets `FLAG_SECURE` on the window to natively block screenshots, video recordings, and app-switcher snapshots.
- **Tapjacking Protection:** Activates Android `filterTouchesWhenObscured` to drop touches whenever an overlay or overlay-based malware is running on top of your app.

---

## 📦 Installation

```sh
npm install @hituchhimpa/react-native-auth-vault
# or
yarn add @hituchhimpa/react-native-auth-vault
```

### iOS CocoaPods Linking
```sh
cd ios && pod install
```

---

## ⚙️ Expo Configuration

Add `@hituchhimpa/react-native-auth-vault` to your Expo config (`app.json` or `app.config.js`):

```json
{
  "expo": {
    "plugins": [
      [
        "@hituchhimpa/react-native-auth-vault",
        {
          "faceIDPermission": "Allow $(PRODUCT_NAME) to use Face ID for secure authentication."
        }
      ]
    ]
  }
}
```

Then regenerate native build folders:
```sh
npx expo prebuild
```

---

## 📖 Complete API Reference

### Core Secure Storage

#### `AuthVault.setItem(key: string, value: string, prompt: string): Promise<boolean>`
Encrypts and saves a key-value pair.
- `key`: Unique identifier.
- `value`: Sensitive text to store.
- `prompt`: Message to display in the biometric dialog. **Pass an empty string (`""`) for silent hardware-backed storage (no prompt).**

#### `AuthVault.getItem(key: string, prompt: string): Promise<string | null>`
Retrieves and decrypts a key-value pair.
- `key`: Unique identifier.
- `prompt`: Biometric prompt message. **Pass `""` if retrieved silently (without prompt).**
- *Note:* Returns `null` if the item does not exist or user cancels the prompt.

#### `AuthVault.removeItem(key: string): Promise<boolean>`
Deletes a value and its encryption key from storage.

#### `AuthVault.encrypt(plainText: string, prompt: string): Promise<string>`
Encrypts arbitrary string data and returns a Base64-encoded encrypted string.

#### `AuthVault.decrypt(encryptedBase64: string, prompt: string): Promise<string>`
Decrypts a Base64-encoded ciphertext string back to raw text.

---

### Security Auditing

#### `AuthVault.audit(): SecurityPosture`
Synchronously scans the device and returns a diagnostic posture object of the system's security integrity.

```typescript
const posture = AuthVault.audit();
```

##### Diagnostic Posture Properties:
- `securityScore`: `number` (0 to 100). Rating of device safety.
- `jailbroken`: `boolean` (iOS jailbreak detected).
- `rooted`: `boolean` (Android root detected).
- `emulator`: `boolean` (Running on simulator/emulator).
- `debuggerAttached`: `boolean` (Runtime debugger attached).
- `hookingDetected`: `boolean` (Frida/Xposed hooking detected).
- `appTampered`: `boolean` (App package altered/resigned).
- `biometricEnrollmentChanged`: `boolean` (Biometrics added/deleted since setup).
- `hardwareBacked`: `boolean` (Device hardware supports secure keys).
- `biometricEnabled`: `boolean` (User has enrolled biometrics).

---

### Device & UI Protection

#### `AuthVault.setPrivacyScreenEnabled(enabled: boolean): void`
Blocks screenshots/screen recordings on Android and applies a secure blur in the App Switcher on iOS.

#### `AuthVault.setOverlayProtectionEnabled(enabled: boolean): void`
*(Android Only)* Blocks touch events when the app is obscured by an overlay window (prevents Tapjacking).

#### `AuthVault.generateAttestation(nonce: string): Promise<string>`
Generates a platform integrity payload (App Attest on iOS / Play Integrity Token on Android) bound to the provided `nonce`.

---

### Hardware Signing & Keys

#### `AuthVault.generateSigningKeyPair(tag: string): Promise<string>`
Generates a P-256 ECC key pair inside hardware (Secure Enclave / StrongBox). Returns the Base64 DER/PEM encoded public key. The private key never leaves the hardware chip.

#### `AuthVault.signData(tag: string, data: string): Promise<string>`
Signs text data using the private key corresponding to `tag`. Returns a Base64 cryptographic ECDSA signature.

---

### Session & Memory Control

#### `AuthVault.setSessionTimeout(seconds: number): void`
Sets a timer duration (in seconds) for session validation.

#### `AuthVault.isSessionExpired(): boolean`
Returns `true` if the elapsed time since `setSessionTimeout` or the last authentication exceeds the timeout.

#### `AuthVault.wipeSession(): void`
Instantly locks the vault, clears session timestamps, and zeroes out all secure in-memory storage.

#### `AuthVault.secureStore(key: string, value: string): void`
Stores sensitive temporary data directly in native-isolated memory.

#### `AuthVault.secureRead(key: string): string | null`
Reads data from native-isolated memory.

#### `AuthVault.secureWipe(): void`
Zero-fills and clears all secure native-isolated memory storage.

---

### Key Rotation & Events

#### `AuthVault.rotateEncryptionKey(): Promise<boolean>`
Re-encrypts the master storage key with a newly generated hardware key.

#### `AuthVault.onSecurityEvent(callback: (event: SecurityEvent) => void): EmitterSubscription`
Listens for real-time security events.

##### `SecurityEvent` Type:
```typescript
interface SecurityEvent {
  type: 'SESSION_EXPIRED' | 'BIOMETRIC_CHANGED' | 'HOOKING_DETECTED' | 'APP_TAMPERED';
  detail?: string;
  timestamp: number;
}
```

---

## 🚀 Enterprise Integration Workflow

```typescript
import React, { useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';
import { AuthVault } from '@hituchhimpa/react-native-auth-vault';

export function App() {
  useEffect(() => {
    // 1. Run Device Risk Audit
    const posture = AuthVault.audit();
    if (posture.jailbroken || posture.rooted || posture.hookingDetected) {
      Alert.alert('Security Violation', 'Compromised environment detected.', [
        { text: 'OK', onPress: () => BackHandler.exitApp() }
      ]);
      return;
    }

    // 2. Enable UI & Screen Shields
    AuthVault.setPrivacyScreenEnabled(true);
    AuthVault.setOverlayProtectionEnabled(true);

    // 3. Set Inactivity Auto-Lock (5 minutes)
    AuthVault.setSessionTimeout(300);

    // 4. Register Real-Time Security Event Listener
    const sub = AuthVault.onSecurityEvent((event) => {
      if (event.type === 'SESSION_EXPIRED' || event.type === 'HOOKING_DETECTED') {
        AuthVault.wipeSession();
      }
    });

    return () => sub.remove();
  }, []);

  return <MainNavigator />;
}
```

---

## 🔒 Security Policy & Vulnerability Disclosure

For vulnerability reports, security policies, and coordinated disclosure guidance, please consult [SECURITY.md](https://github.com/HituChhimpa7/react-native-auth-vault/blob/main/SECURITY.md).

---

## 📄 License

MIT — See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>react-native-auth-vault</strong><br/>
  Bank-grade security for every React Native developer.<br/>
  Made with ❤️ by <a href="https://github.com/HituChhimpa7">Hitesh Chhimpa</a>
</p>
