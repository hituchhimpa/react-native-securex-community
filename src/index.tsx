import { NativeEventEmitter } from 'react-native';
import ReactNativeAuthVault from './NativeReactNativeAuthVault';

const emitter = new NativeEventEmitter(ReactNativeAuthVault as any);

export type SecurityEventType =
  | 'SESSION_EXPIRED'
  | 'BIOMETRIC_CHANGED'
  | 'HOOKING_DETECTED'
  | 'APP_TAMPERED';

export interface SecurityEvent {
  type: SecurityEventType;
  detail?: string;
  timestamp: number;
}

export const AuthVault = {
  // --- Core Vault ---
  audit: (): Object => ReactNativeAuthVault.audit(),
  encrypt: (plainText: string, prompt: string): Promise<string> =>
    ReactNativeAuthVault.encrypt(plainText, prompt),
  decrypt: (encryptedBase64: string, prompt: string): Promise<string> =>
    ReactNativeAuthVault.decrypt(encryptedBase64, prompt),
  setItem: (key: string, value: string, prompt: string): Promise<boolean> =>
    ReactNativeAuthVault.setItem(key, value, prompt),
  getItem: (key: string, prompt: string): Promise<string | null> =>
    ReactNativeAuthVault.getItem(key, prompt),
  removeItem: (key: string): Promise<boolean> =>
    ReactNativeAuthVault.removeItem(key),

  // --- Fortress ---
  setPrivacyScreenEnabled: (enabled: boolean): void =>
    ReactNativeAuthVault.setPrivacyScreenEnabled(enabled),
  setOverlayProtectionEnabled: (enabled: boolean): void =>
    ReactNativeAuthVault.setOverlayProtectionEnabled(enabled),
  generateAttestation: (nonce: string): Promise<string> =>
    ReactNativeAuthVault.generateAttestation(nonce),

  // --- Biometric Enrollment Change Detection ---
  isBiometricEnrollmentChanged: (): boolean =>
    ReactNativeAuthVault.isBiometricEnrollmentChanged(),

  // --- Session Key Expiry ---
  setSessionTimeout: (seconds: number): void =>
    ReactNativeAuthVault.setSessionTimeout(seconds),
  isSessionExpired: (): boolean => ReactNativeAuthVault.isSessionExpired(),
  wipeSession: (): void => ReactNativeAuthVault.wipeSession(),

  // --- ECC Hardware Key Pairs + Signing ---
  generateSigningKeyPair: (tag: string): Promise<string> =>
    ReactNativeAuthVault.generateSigningKeyPair(tag),
  signData: (tag: string, data: string): Promise<string> =>
    ReactNativeAuthVault.signData(tag, data),

  // --- Secure In-Memory Storage ---
  secureStore: (key: string, value: string): void =>
    ReactNativeAuthVault.secureStore(key, value),
  secureRead: (key: string): string | null =>
    ReactNativeAuthVault.secureRead(key),
  secureWipe: (): void => ReactNativeAuthVault.secureWipe(),

  // --- Runtime App Tamper Detection ---
  isAppTampered: (): boolean => ReactNativeAuthVault.isAppTampered(),

  // --- Key Rotation ---
  rotateEncryptionKey: (): Promise<boolean> =>
    ReactNativeAuthVault.rotateEncryptionKey(),

  // --- Security Events ---
  onSecurityEvent: (callback: (event: SecurityEvent) => void) => {
    return emitter.addListener(
      'SecurityEvent',
      callback as (...args: readonly object[]) => unknown
    );
  },
};
