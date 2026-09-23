import { NativeEventEmitter } from 'react-native';
import ReactNativeSecureX from './NativeReactNativeSecureX';

const emitter = new NativeEventEmitter(ReactNativeSecureX as any);

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

export const SecureX = {
  // --- Core Vault ---
  audit: (): Object => ReactNativeSecureX.audit(),
  encrypt: (plainText: string, prompt: string): Promise<string> =>
    ReactNativeSecureX.encrypt(plainText, prompt),
  decrypt: (encryptedBase64: string, prompt: string): Promise<string> =>
    ReactNativeSecureX.decrypt(encryptedBase64, prompt),
  setItem: (key: string, value: string, prompt: string): Promise<boolean> =>
    ReactNativeSecureX.setItem(key, value, prompt),
  getItem: (key: string, prompt: string): Promise<string | null> =>
    ReactNativeSecureX.getItem(key, prompt),
  removeItem: (key: string): Promise<boolean> =>
    ReactNativeSecureX.removeItem(key),

  // --- Fortress ---
  setPrivacyScreenEnabled: (enabled: boolean): void =>
    ReactNativeSecureX.setPrivacyScreenEnabled(enabled),
  setOverlayProtectionEnabled: (enabled: boolean): void =>
    ReactNativeSecureX.setOverlayProtectionEnabled(enabled),
  generateAttestation: (nonce: string): Promise<string> =>
    ReactNativeSecureX.generateAttestation(nonce),

  // --- Biometric Enrollment Change Detection ---
  isBiometricEnrollmentChanged: (): boolean =>
    ReactNativeSecureX.isBiometricEnrollmentChanged(),

  // --- Vault Usability ---
  // Returns false when the device has no secure lock screen / passcode set — in that
  // state, auth-gated keys can't be created, so encrypt/decrypt/setItem/getItem calls
  // made with a non-empty `prompt` will always fail. Check this before using them.
  hasSecureLockScreen: (): boolean => ReactNativeSecureX.hasSecureLockScreen(),

  // --- Session Key Expiry ---
  setSessionTimeout: (seconds: number): void =>
    ReactNativeSecureX.setSessionTimeout(seconds),
  isSessionExpired: (): boolean => ReactNativeSecureX.isSessionExpired(),
  wipeSession: (): void => ReactNativeSecureX.wipeSession(),

  // --- ECC Hardware Key Pairs + Signing ---
  generateSigningKeyPair: (tag: string): Promise<string> =>
    ReactNativeSecureX.generateSigningKeyPair(tag),
  signData: (tag: string, data: string): Promise<string> =>
    ReactNativeSecureX.signData(tag, data),

  // --- Secure In-Memory Storage ---
  secureStore: (key: string, value: string): void =>
    ReactNativeSecureX.secureStore(key, value),
  secureRead: (key: string): string | null =>
    ReactNativeSecureX.secureRead(key),
  secureWipe: (): void => ReactNativeSecureX.secureWipe(),

  // --- Runtime App Tamper Detection ---
  isAppTampered: (): boolean => ReactNativeSecureX.isAppTampered(),

  // --- Key Rotation ---
  rotateEncryptionKey: (): Promise<boolean> =>
    ReactNativeSecureX.rotateEncryptionKey(),

  // --- Security Events ---
  onSecurityEvent: (callback: (event: SecurityEvent) => void) => {
    return emitter.addListener(
      'SecurityEvent',
      callback as (...args: readonly object[]) => unknown
    );
  },
};

/**
 * @deprecated Use `SecureX` instead.
 */
export const AuthVault = SecureX;
