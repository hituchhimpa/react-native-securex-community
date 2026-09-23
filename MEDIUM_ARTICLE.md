# Stop Storing Auth Tokens in AsyncStorage: Modern Biometrics & Hardware Enclaves in React Native (Introducing SecureX)

![SecureX Header Banner](https://raw.githubusercontent.com/hituchhimpa/react-native-securex-community/main/assets/securex_banner.png)

> **TL;DR**: Handling security in React Native usually means duct-taping 5 unmaintained libraries together, battling New Architecture (TurboModule) crashes, and writing endless Redux-Persist boilerplate. We built **[`@hituchhimpa/react-native-securex`](https://www.npmjs.com/package/@hituchhimpa/react-native-securex)** — a single, zero-heap, hardware-backed security vault that gives you Biometric Authentication, Secure Enclave / KeyStore storage, Cryptographic Signing, and Threat Auditing in one unified API.

---

## 🛑 The Ugly Reality of React Native Security in 2026

If you’ve built a fintech, healthcare, crypto, or enterprise app in React Native, you’ve likely needed:
1. **Biometric login** (Face ID, Touch ID, Android Biometrics).
2. **Encrypted token storage** (JWTs, refresh tokens, API keys).
3. **Hardware risk checks** (Jailbreak, root, Frida, Xposed hooking, debugger detection).
4. **Cryptographic signatures** (Signing blockchain transactions or financial requests with device-bound private keys).

To achieve this, the standard recipe for years has been stitching together an npm graveyard:
- `react-native-keychain` (frequent iOS keychain lockup bugs, bridge overhead)
- `react-native-biometrics` (no built-in encrypted storage or threat analysis)
- `jail-monkey` or `react-native-root-detection` (unmaintained, easily bypassed by modern Magisk/Zygisk)
- `redux-persist` + `async-storage` (stores plaintext in unencrypted SQLite/XML files and pollutes state stores)

### Why this approach is broken:
- **Bridge Bottlenecks & No Native JSI**: Legacy modules serialize cryptographic payloads across the asynchronous React Native bridge.
- **TurboModule / New Architecture Incompatibilities**: With React Native 0.76+ making the New Architecture standard, older packages fail to compile or require cumbersome legacy bridge fallbacks.
- **JavaScript Heap Leaks**: Secrets stored in plain JS memory remain visible to memory scrapers until garbage collection runs.

We decided it was time for a modern, unified solution.

---

## 🛡️ Enter SecureX: The Native Security Suite

**SecureX** (`@hituchhimpa/react-native-securex`) was designed from day one as a **native-first, unified security framework**:

- ⚡ **React Native New Architecture Native**: Powered by TurboModules and direct C++/JSI execution for zero-latency cryptographic calls.
- 🔒 **Hardware-Isolated Storage**: AES-256 GCM backed directly by Apple’s **Secure Enclave** (iOS) and Android’s **KeyStore / StrongBox HSM**.
- 🧬 **Granular Biometric Detection**: Identifies whether hardware supports Face ID, Fingerprint, or Iris scanning, and whether credentials are enrolled.
- ✍️ **Asymmetric Cryptographic Signatures**: Generates hardware-isolated ECDSA P-256 key pairs for transaction signing that never leave the device hardware chip.
- 🕵️ **Live Security Posture & Threat Engine**: Native detection of rooted devices, jailbreaks, dynamic Frida/Xposed hooks, developer mode, and attached debuggers.
- 🧼 **Zero-Heap Native Memory Zeroing**: Sensitive native memory buffers are explicitly zeroed out before deallocation to defeat memory-dump attacks.
- 🚀 **Expo Config Plugin Ready**: 100% compatible with Expo Application Services (EAS) and `npx expo prebuild`.

---

## 📦 Getting Started in 30 Seconds

### Installation

```bash
# Using Yarn
yarn add @hituchhimpa/react-native-securex

# Using npm
npm install @hituchhimpa/react-native-securex
```

### iOS CocoaPods Setup

```bash
cd ios && pod install && cd ..
```

---

## 💡 Practical Recipes (Copy & Paste)

### 1. Simple Biometric Authentication (Face ID / Touch ID / Fingerprint)

Need to gate a screen or authenticate user actions? You don’t need complex ceremony:

```tsx
import React from 'react';
import { Alert, Button, View } from 'react-native';
import { SecureX } from '@hituchhimpa/react-native-securex';

export const BiometricLogin = () => {
  const handleAuth = async () => {
    // Check if biometric sensor hardware is available & enrolled
    const biometrics = await SecureX.biometrics.isSensorAvailable();
    
    if (!biometrics.available) {
      Alert.alert('Unavailable', 'Biometrics not enrolled or supported on this device.');
      return;
    }

    try {
      const success = await SecureX.simplePrompt(
        'Verify Your Identity',
        'Use biometrics to access your encrypted vault'
      );

      if (success) {
        Alert.alert('Success', 'Authenticated successfully!');
      }
    } catch (error) {
      Alert.alert('Authentication Failed', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Button title="Login with Biometrics" onPress={handleAuth} />
    </View>
  );
};
```

---

### 2. Say Goodbye to Redux-Persist for Auth Tokens

Developers often reach for `redux-persist` just to keep the user's JWT token after app reload. This leads to massive store configuration, serializing entire sub-trees, and storing sensitive tokens unencrypted.

With SecureX, hardware-gated session management takes just 3 lines:

```tsx
import { SecureX } from '@hituchhimpa/react-native-securex';

// Save user access token (Optionally biometric-gated!)
await SecureX.setItem('user_session', jwtToken, {
  requireBiometrics: true, // Requires Face ID / Fingerprint each time it's retrieved!
});

// Retrieve token when app starts up
const session = await SecureX.getItem('user_session');

// Instant atomic wipe on logout
await SecureX.removeItem('user_session');
```

> **Prefer Redux?** You can still use SecureX as a custom drop-in encrypted storage engine for Redux Persist:
> ```ts
> import { SecureX } from '@hituchhimpa/react-native-securex';
> 
> export const secureXStorage = {
>   setItem: (key: string, value: string) => SecureX.setItem(key, value),
>   getItem: (key: string) => SecureX.getItem(key),
>   removeItem: (key: string) => SecureX.removeItem(key),
> };
> ```

---

### 3. Cryptographic Asymmetric Signatures (Fintech & Web3)

Need to verify transactions or authenticate API requests using a client-side private key? SecureX generates hardware-bound ECDSA P-256 keys that **never leave the device's Secure Enclave**:

```tsx
import { SecureX } from '@hituchhimpa/react-native-securex';

// Step 1: Generate hardware keypair in Secure Enclave / KeyStore
const { publicKey } = await SecureX.createKeys({
  keyName: 'payment_signing_key',
  requireBiometrics: true, // Key can only be used with biometric authorization
});

// Send publicKey to your backend during device registration...

// Step 2: Sign a financial payload with biometric gating
const payload = JSON.stringify({ to: 'alice@bank.com', amount: 500, nonce: 42 });
const { signature } = await SecureX.createSignature({
  keyName: 'payment_signing_key',
  payload,
  promptMessage: 'Authorize $500.00 Transfer',
});

// Send payload + signature to backend for verification!
```

---

### 4. Real-time Device Posture & Zero-Trust Audit

Run an instant threat audit during app initialization to detect jailbreaks, root compromises, debuggers, and dynamic hooking tools:

```tsx
import { SecureX } from '@hituchhimpa/react-native-securex';

const checkDeviceSecurity = () => {
  const audit = SecureX.audit();

  console.log(`Security Score: ${audit.score} / 100`);
  console.log(`Jailbroken / Rooted: ${audit.isJailbrokenOrRooted}`);
  console.log(`Frida / Xposed Hook Detected: ${audit.hookDetected}`);
  console.log(`Emulator Environment: ${audit.isEmulator}`);
  console.log(`Debugger Attached: ${audit.debuggerAttached}`);

  if (audit.isJailbrokenOrRooted || audit.hookDetected) {
    // Terminate session or restrict high-value operations
    alert('Security Warning: This device environment is compromised.');
  }
};
```

---

## 📱 Interactive Showcase App Included

Want to see all these features running in real time? The repository includes a **dark cyberpunk fintech dashboard** that you can run on your iOS simulator or physical Android device:

```bash
git clone https://github.com/hituchhimpa/react-native-securex-community.git
cd react-native-securex-community
yarn install
yarn prepare

# Run on iOS
yarn example ios

# Run on Android
yarn example android
```

The example app includes:
- Live Hardware Security Posture & Scorecard
- Granular Sensor Detection (Face ID, Touch ID, Fingerprint, Iris)
- Asymmetric Hardware Key generation & signing demo
- Biometric-gated Encrypted Storage testbench
- Real-time terminal log viewer with timestamped native events

---

## 🚀 Takeaways & Links

Stop compromising on mobile application security or wrangling deprecated libraries that break on React Native's New Architecture.

- 📦 **NPM Package**: [`@hituchhimpa/react-native-securex`](https://www.npmjs.com/package/@hituchhimpa/react-native-securex)
- ⭐️ **GitHub Repository**: [hituchhimpa/react-native-securex-community](https://github.com/hituchhimpa/react-native-securex-community)
- 📄 **Documentation & Recipes**: [Read the full README](https://github.com/hituchhimpa/react-native-securex-community#readme)

If this library helps your team ship safer mobile applications, **give the repo a star on GitHub** and let us know what features you’d like to see next!
