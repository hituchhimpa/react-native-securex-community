import { TurboModuleRegistry, type TurboModule } from 'react-native';

export type Double = number;
export type UnsafeObject = Object;

export interface Spec extends TurboModule {
  // --- Core Vault ---
  audit(): UnsafeObject;
  encrypt(plainText: string, prompt: string): Promise<string>;
  decrypt(encryptedBase64: string, prompt: string): Promise<string>;
  setItem(key: string, value: string, prompt: string): Promise<boolean>;
  getItem(key: string, prompt: string): Promise<string | null>;
  removeItem(key: string): Promise<boolean>;

  // --- Fortress (v1.0.x) ---
  setPrivacyScreenEnabled(enabled: boolean): void;
  setOverlayProtectionEnabled(enabled: boolean): void;
  generateAttestation(nonce: string): Promise<string>;

  // --- Biometric Enrollment Change Detection (v1.1.0) ---
  isBiometricEnrollmentChanged(): boolean;

  // --- Vault Usability ---
  isVaultUsable(): boolean;

  // --- Session Key Expiry (v1.1.0) ---
  setSessionTimeout(seconds: Double): void;
  isSessionExpired(): boolean;
  wipeSession(): void;

  // --- ECC Hardware Key Pairs + Signing (v1.2.0) ---
  generateSigningKeyPair(tag: string): Promise<string>;
  signData(tag: string, data: string): Promise<string>;

  // --- Secure In-Memory Storage (v1.3.0) ---
  secureStore(key: string, value: string): void;
  secureRead(key: string): string | null;
  secureWipe(): void;

  // --- Runtime App Tamper Detection (v1.4.0) ---
  isAppTampered(): boolean;

  // --- Key Rotation (v1.4.0) ---
  rotateEncryptionKey(): Promise<boolean>;

  // --- Security Events (required for NativeEventEmitter) ---
  addListener(eventName: string): void;
  removeListeners(count: Double): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ReactNativeAuthVault');
