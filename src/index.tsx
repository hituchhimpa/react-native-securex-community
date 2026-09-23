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

export type BiometryType =
  | 'TouchID'
  | 'FaceID'
  | 'Biometrics'
  | 'Fingerprint'
  | 'Face'
  | 'Iris';

export interface SensorResult {
  available: boolean;
  enrolled?: boolean;
  biometryType?: BiometryType;
  biometricsSupported?: string[];
  hasFingerprint?: boolean;
  hasFace?: boolean;
  hasIris?: boolean;
  error?: string;
}

export interface SimplePromptOptions {
  promptMessage: string;
  cancelButtonText?: string;
}

export interface SimplePromptResult {
  success: boolean;
  error?: string;
}

export interface CreateKeysResult {
  publicKey: string;
}

export interface BiometricKeysExistResult {
  keysExist: boolean;
}

export interface DeleteKeysResult {
  success: boolean;
}

export interface CreateSignatureOptions {
  promptMessage: string;
  payload: string;
  cancelButtonText?: string;
}

export interface CreateSignatureResult {
  success: boolean;
  signature?: string;
  error?: string;
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

  // --- Biometrics & Sensor Detection ---
  isSensorAvailable: (): Promise<SensorResult> =>
    ReactNativeSecureX.isSensorAvailable() as Promise<SensorResult>,
  isBiometricEnrollmentChanged: (): boolean =>
    ReactNativeSecureX.isBiometricEnrollmentChanged(),

  // --- Biometric Authentication & PKI Signatures ---
  simplePrompt: (options: SimplePromptOptions): Promise<SimplePromptResult> =>
    ReactNativeSecureX.simplePrompt(
      options.promptMessage,
      options.cancelButtonText || ''
    ) as Promise<SimplePromptResult>,

  createKeys: (): Promise<CreateKeysResult> =>
    ReactNativeSecureX.createKeys() as Promise<CreateKeysResult>,

  biometricKeysExist: (): Promise<BiometricKeysExistResult> =>
    ReactNativeSecureX.biometricKeysExist() as Promise<BiometricKeysExistResult>,

  deleteKeys: (): Promise<DeleteKeysResult> =>
    ReactNativeSecureX.deleteKeys() as Promise<DeleteKeysResult>,

  createSignature: (
    options: CreateSignatureOptions
  ): Promise<CreateSignatureResult> =>
    ReactNativeSecureX.createSignature(
      options.promptMessage,
      options.payload,
      options.cancelButtonText || ''
    ) as Promise<CreateSignatureResult>,

  // --- Namespaced Biometrics (react-native-biometrics compatible) ---
  biometrics: {
    isSensorAvailable: (): Promise<SensorResult> =>
      ReactNativeSecureX.isSensorAvailable() as Promise<SensorResult>,
    simplePrompt: (options: SimplePromptOptions): Promise<SimplePromptResult> =>
      ReactNativeSecureX.simplePrompt(
        options.promptMessage,
        options.cancelButtonText || ''
      ) as Promise<SimplePromptResult>,
    createKeys: (): Promise<CreateKeysResult> =>
      ReactNativeSecureX.createKeys() as Promise<CreateKeysResult>,
    biometricKeysExist: (): Promise<BiometricKeysExistResult> =>
      ReactNativeSecureX.biometricKeysExist() as Promise<BiometricKeysExistResult>,
    deleteKeys: (): Promise<DeleteKeysResult> =>
      ReactNativeSecureX.deleteKeys() as Promise<DeleteKeysResult>,
    createSignature: (
      options: CreateSignatureOptions
    ): Promise<CreateSignatureResult> =>
      ReactNativeSecureX.createSignature(
        options.promptMessage,
        options.payload,
        options.cancelButtonText || ''
      ) as Promise<CreateSignatureResult>,
  },

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
