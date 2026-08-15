# Changelog

All notable changes to this project will be documented in this file.

---

## [1.1.2] - 2026-06-29

### Fixed
- **iOS EventEmitter Subclassing:** `ReactNativeAuthVault` now correctly subclasses `RCTEventEmitter` to prevent runtime crashes when security events are emitted.
- **iOS Header Import Guards:** Added `#if __has_include` guards for `RCTEventEmitter.h`, `RCTBridgeModule.h`, and `ReactNativeAuthVaultSpec.h` across CocoaPods header configurations.
- **iOS App Tamper Detection:** Wrapped macOS static code verification APIs in `#if os(macOS)` to prevent link errors and runtime crashes on iOS hardware.
- **TurboModule Codegen Spec Types:** Added `Double` and `UnsafeObject` type aliases in `NativeReactNativeAuthVault.ts` for full React Native Codegen & TypeScript compatibility.

---

## [1.1.0] - 2024-06-24

### Added — Security Fortress

#### 🕵️ Advanced Threat Detection
- **Frida / Xposed Hooking Detection** — Scans dyld images (iOS) and `/proc/self/maps` (Android) for injected instrumentation frameworks
- **App Tamper Detection** — Verifies code signing integrity via `SecStaticCodeCheckValidity` (iOS) and APK signing certificate hash comparison (Android)
- **Biometric Enrollment Change Detection** — Detects if new fingerprints or Face IDs were added to the device since last check

#### ⏱️ Session Management
- **`setSessionTimeout(seconds)`** — Set a configurable auto-lock timeout
- **`isSessionExpired()`** — Check if the current session has timed out
- **`wipeSession()`** — Instantly lock vault and zero-fill secure memory

#### 🔑 Hardware ECC Key Pairs & Request Signing
- **`generateSigningKeyPair(tag)`** — Generate P-256 ECC key inside Apple Secure Enclave or Android StrongBox
- **`signData(tag, data)`** — Sign any data using ECDSA-SHA256 with the hardware-protected private key

#### 🧠 Secure In-Memory Storage
- **`secureStore(key, value)`** — Store sensitive values in native memory, never in the JavaScript heap
- **`secureRead(key)`** — Read back stored values
- **`secureWipe()`** — Zero-fill all memory buffers and clear the store

#### 📡 Real-Time Security Events API
- **`onSecurityEvent(callback)`** — Subscribe to security events: `SESSION_EXPIRED`, `BIOMETRIC_CHANGED`, `HOOKING_DETECTED`, `APP_TAMPERED`

#### 🔄 Encryption Key Rotation
- **`rotateEncryptionKey()`** — Delete and regenerate hardware-backed encryption keys

#### 📱 Privacy Screen & Tapjacking Protection
- **`setPrivacyScreenEnabled(enabled)`** — Blur app in app switcher; blocks screenshots on Android
- **`setOverlayProtectionEnabled(enabled)`** — Drop touch events when malicious overlay is detected (Android)

#### 🔏 Device Attestation
- **`generateAttestation(nonce)`** — Apple AppAttest (iOS 14+) and Google Play Integrity API (Android)

#### 🏗️ Infrastructure
- **Expo Config Plugin** — Auto-configures `NSFaceIDUsageDescription` (iOS) and biometric permissions (Android)
- **`DeviceCheck`, `LocalAuthentication`, `Security` frameworks** — Explicitly linked in podspec
- **Swift 5.9** — Minimum Swift version set in podspec

### Changed
- `audit()` now includes `hookingDetected`, `appTampered`, `biometricEnrollmentChanged` fields
- `securityScore` now penalizes for hooking (-50), tampering (-40), biometric changes (-30)
- `securityScore` is now clamped to minimum 0

---

## [1.0.4] - 2024-06-01

### Fixed
- TurboModule codegen spec alignment
- Silent encryption mode using non-biometric key alias

---

## [1.0.0] - 2024-05-15

### Added
- Initial release
- Biometric-protected AES-256 encryption
- `encrypt` / `decrypt` API
- `setItem` / `getItem` / `removeItem` key-value vault
- Security `audit()` with root, jailbreak, emulator, debugger detection
- Android Keystore + StrongBox support
- iOS Secure Enclave + Keychain support
