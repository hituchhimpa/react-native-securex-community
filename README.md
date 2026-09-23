# 🛡️ react-native-securex

[![npm version](https://img.shields.io/npm/v/@hituchhimpa/react-native-securex.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/@hituchhimpa/react-native-securex)
[![npm downloads](https://img.shields.io/npm/dm/@hituchhimpa/react-native-securex.svg?style=flat-square&color=green)](https://www.npmjs.com/package/@hituchhimpa/react-native-securex)
[![Security Score](https://img.shields.io/badge/Security--Score-100%2F100-success?style=flat-square)](https://github.com/HituChhimpa7/react-native-auth-vault-community/blob/main/SECURITY.md)
[![Malware Shield](https://img.shields.io/badge/Malware--Shield-Protected-brightgreen?style=flat-square)](https://github.com/HituChhimpa7/react-native-auth-vault-community/blob/main/SECURITY.md)
[![Security Audit](https://img.shields.io/badge/Security--Audit-Passed-brightgreen?style=flat-square)](https://github.com/HituChhimpa7/react-native-auth-vault-community/blob/main/SECURITY.md)
[![license](https://img.shields.io/github/license/HituChhimpa7/react-native-auth-vault-community?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey?style=flat-square)](https://reactnative.dev)
[![New Architecture](https://img.shields.io/badge/New%20Architecture-✅-brightgreen?style=flat-square)](https://reactnative.dev/docs/the-new-architecture/landing-page)
[![Expo](https://img.shields.io/badge/Expo-✅-purple?style=flat-square)](https://expo.dev)

> **The zero-trust React Native security & authentication toolkit built for enterprise mobile applications.**

Replace 5+ separate security packages with a single, production-hardened SDK built on Apple Secure Enclave, Android StrongBox, and hardware security modules. 

`react-native-securex` provides bank-grade biometric encryption, secure native in-memory storage (never exposed to the JavaScript heap), runtime threat and malware detection (debugger, Frida/Xposed hooking, app tampering, emulator, jailbreak/root), device attestation, and hardware-backed asymmetric ECDSA request signing.

<p align="center">
  <img src="./assets/auth_vault_mockup.png" width="450" alt="react-native-securex mockup" />
</p>

---

## 🛡️ Anti-Malware & Supply Chain Security Shield

> [!IMPORTANT]
> **Zero-Trust Supply Chain Verification**: This package enforces strict anti-malware and supply chain security controls. For full architecture details, refer to [SECURITY.md](https://github.com/HituChhimpa7/react-native-auth-vault-community/blob/main/SECURITY.md).

- **No Dangerous Lifecycle Scripts**: Clean package exports with zero `preinstall` or `postinstall` script execution vectors.
- **Hardware Cryptographic Isolation**: Private keys and master secrets are bound to hardware chips (Secure Enclave / StrongBox) and never enter JavaScript heap memory.
- **Dynamic Hooking Block**: Scans active process memory maps (`/proc/self/maps`, dyld framework images) to detect and neutralize Frida gadgets or malicious Xposed hooking engines.
- **Tapjacking Defense**: Drops unauthorized touch events on Android whenever dynamic overlay malware attempts to hijack user authentication prompts.

---

## ✨ Native Architecture & Defense Features

### ⚡ Architecture Compatibility (TurboModules & JSI)
`react-native-securex` is built on React Native's official **TurboModule Architecture (New Architecture / Codegen)** with direct JSI and Swift / Kotlin bindings for 100% zero-bridge native performance across React Native CLI and Expo apps.
- **TurboModules (Official New Architecture)**: ✅ **Supported natively out-of-the-box** with automatic C++/Swift/Kotlin dynamic bindings.
- **Nitro Modules**: ℹ️ Currently, core security operations run on official JSI TurboModules for maximum cross-platform stability and zero extra dependency overhead. Full Nitro Modules bindings are planned for a future release for ultra-low latency synchronous C++ cross-thread calls.

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
Variables stored in JavaScript heap can be easily dumped from memory or read by attackers. `securex` provides native-level in-memory storage:
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
npm install @hituchhimpa/react-native-securex
# or
yarn add @hituchhimpa/react-native-securex
```

### iOS Installation & Permissions

#### 1. CocoaPods Linking
```sh
cd ios && pod install
```

#### 2. Info.plist Permissions
For Face ID support, you **must** add the `NSFaceIDUsageDescription` key to your application's `ios/YourAppName/Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>Allow $(PRODUCT_NAME) to use Face ID for secure authentication.</string>
```

---

## ⚙️ Expo Configuration

Add `@hituchhimpa/react-native-securex` to your Expo config (`app.json` or `app.config.js`):

```json
{
  "expo": {
    "plugins": [
      [
        "@hituchhimpa/react-native-securex",
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

#### `SecureX.setItem(key: string, value: string, prompt: string): Promise<boolean>`
Encrypts and saves a key-value pair.
- `key`: Unique identifier.
- `value`: Sensitive text to store.
- `prompt`: Message to display in the biometric dialog. **Pass an empty string (`""`) for silent hardware-backed storage (no prompt).**

#### `SecureX.getItem(key: string, prompt: string): Promise<string | null>`
Retrieves and decrypts a key-value pair.
- `key`: Unique identifier.
- `prompt`: Biometric prompt message. **Pass `""` if retrieved silently (without prompt).**
- *Note:* Returns `null` if the item does not exist or user cancels the prompt.

#### `SecureX.removeItem(key: string): Promise<boolean>`
Deletes a value and its encryption key from storage.

#### `SecureX.encrypt(plainText: string, prompt: string): Promise<string>`
Encrypts arbitrary string data and returns a Base64-encoded encrypted string.

#### `SecureX.decrypt(encryptedBase64: string, prompt: string): Promise<string>`
Decrypts a Base64-encoded ciphertext string back to raw text.

---

### Security Auditing

#### `SecureX.audit(): SecurityPosture`
Synchronously scans the device and returns a diagnostic posture object of the system's security integrity.

```typescript
const posture = SecureX.audit();
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
- `hasSecureLockScreen`: `boolean` (Device has a PIN/pattern/password/biometric configured — see below).

#### `SecureX.hasSecureLockScreen(): boolean`
Synchronously checks whether the device has a secure lock screen (PIN, pattern, password, or biometric) configured. Auth-gated keys used by `encrypt`/`decrypt`/`setItem`/`getItem` when called with a non-empty `prompt` can only be created once a secure lock screen exists — without one, those calls will always fail. Check this before calling them with a prompt, e.g. to prompt the user to set a device PIN first.

```typescript
if (!SecureX.hasSecureLockScreen()) {
  // Ask the user to set a device PIN/passcode before storing anything biometric-gated.
}
```

---

### Device & UI Protection

#### `SecureX.setPrivacyScreenEnabled(enabled: boolean): void`
Blocks screenshots/screen recordings on Android and applies a secure blur in the App Switcher on iOS.

#### `SecureX.setOverlayProtectionEnabled(enabled: boolean): void`
*(Android Only)* Blocks touch events when the app is obscured by an overlay window (prevents Tapjacking).

#### `SecureX.generateAttestation(nonce: string): Promise<string>`
Generates a platform integrity payload (App Attest on iOS / Play Integrity Token on Android) bound to the provided `nonce`.

---

### Hardware Signing & Keys

#### `SecureX.generateSigningKeyPair(tag: string): Promise<string>`
Generates a P-256 ECC key pair inside hardware (Secure Enclave / StrongBox). Returns the Base64 DER/PEM encoded public key. The private key never leaves the hardware chip.

#### `SecureX.signData(tag: string, data: string): Promise<string>`
Signs text data using the private key corresponding to `tag`. Returns a Base64 cryptographic ECDSA signature.

---

### Session & Memory Control

#### `SecureX.setSessionTimeout(seconds: number): void`
Sets a timer duration (in seconds) for session validation.

#### `SecureX.isSessionExpired(): boolean`
Returns `true` if the elapsed time since `setSessionTimeout` or the last authentication exceeds the timeout.

#### `SecureX.wipeSession(): void`
Instantly locks the vault, clears session timestamps, and zeroes out all secure in-memory storage.

#### `SecureX.secureStore(key: string, value: string): void`
Stores sensitive temporary data directly in native-isolated memory.

#### `SecureX.secureRead(key: string): string | null`
Reads data from native-isolated memory.

#### `SecureX.secureWipe(): void`
Zero-fills and clears all secure native-isolated memory storage.

---

### Key Rotation & Events

#### `SecureX.rotateEncryptionKey(): Promise<boolean>`
Re-encrypts the master storage key with a newly generated hardware key.

#### `SecureX.onSecurityEvent(callback: (event: SecurityEvent) => void): EmitterSubscription`
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
import { SecureX } from '@hituchhimpa/react-native-securex';

export function App() {
  useEffect(() => {
    // 1. Run Device Risk Audit
    const posture = SecureX.audit();
    if (posture.jailbroken || posture.rooted || posture.hookingDetected) {
      Alert.alert('Security Violation', 'Compromised environment detected.', [
        { text: 'OK', onPress: () => BackHandler.exitApp() }
      ]);
      return;
    }

    // 2. Enable UI & Screen Shields
    SecureX.setPrivacyScreenEnabled(true);
    SecureX.setOverlayProtectionEnabled(true);

    // 3. Set Inactivity Auto-Lock (5 minutes)
    SecureX.setSessionTimeout(300);

    // 4. Register Real-Time Security Event Listener
    const sub = SecureX.onSecurityEvent((event) => {
      if (event.type === 'SESSION_EXPIRED' || event.type === 'HOOKING_DETECTED') {
        SecureX.wipeSession();
      }
    });

    return () => sub.remove();
  }, []);

  return <MainNavigator />;
}
```

---

## 🔒 Security Policy & Vulnerability Disclosure

For vulnerability reports, security policies, and coordinated disclosure guidance, please consult [SECURITY.md](https://github.com/HituChhimpa7/react-native-auth-vault-community/blob/main/SECURITY.md).

---

## 📄 License

MIT — See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>react-native-securex</strong><br/>
  Bank-grade security for every React Native developer.<br/>
  Made with ❤️ by <a href="https://github.com/HituChhimpa7">Hitesh Chhimpa</a>
</p>
