# 🛡️ SecureX Example & Showcase App

Interactive showcase and testbench application for **`@hituchhimpa/react-native-securex`**.

Experience native-first biometric authentication, hardware security posture audits, zero-heap encrypted storage, and asymmetric cryptographic signing running directly on iOS and Android.

---

## 📱 Features Demonstrated in This App

- **🛡️ Device Security Posture Audit**: Live assessment of jailbreak/root status, Frida/Xposed hooking vectors, debuggers, emulators, and security score.
- **🧬 Granular Biometric Sensor Detection**: Identifies whether the device has Face ID, Touch ID / Fingerprint, or Iris scanner hardware, and checks active enrollment.
- **👤 Biometric Login (`simplePrompt`)**: Instant one-tap biometric prompt backed by Secure Enclave / Android KeyStore.
- **🔑 Asymmetric Hardware Keys (`createKeys`)**: Generates hardware-isolated ECDSA P-256 key pairs.
- **✍️ Biometric Cryptographic Signatures (`createSignature`)**: Signs arbitrary payload transactions gated by Face ID or Fingerprint.
- **💾 Encrypted Vault Storage (`setItem` / `getItem` / `removeItem`)**: Hardware-backed AES-256 storage with optional biometric auth-gating.
- **💻 Live System Terminal Console**: Real-time inspectable stream of events, security audits, and key operations with timestamps.

---

## 🚀 Running the Example App

### 1. Install Dependencies

From the repository root:
```sh
yarn install
yarn prepare
```

### 2. Run on iOS

```sh
cd example/ios && pod install && cd ../..
yarn example ios
```

> **Note**: For Face ID on iOS Simulator, test by enabling **Features > Face ID > Enrolled** and **Features > Face ID > Matching Face** in the Simulator menu bar.

### 3. Run on Android

```sh
yarn example android
```

> **Note**: For Biometrics on Android Emulator, configure a fingerprint or PIN in Android Settings -> Security -> Fingerprint, or use `adb emu finger touch 1`.

---

## 🛠️ Tech Stack & Architecture

- **React Native 0.85+**
- **New Architecture (TurboModules & JSI)**
- **TypeScript 5+** with live workspace linking to library sources
