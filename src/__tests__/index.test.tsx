import { describe, it, expect, jest } from '@jest/globals';
import { SecureX } from '../index';
import ReactNativeSecureX from '../NativeReactNativeSecureX';

jest.mock('../NativeReactNativeSecureX', () => {
  return {
    audit: jest.fn(() => ({ securityScore: 100, hardwareBacked: true })),
    encrypt: jest.fn((text: string) => Promise.resolve(`encrypted_${text}`)),
    decrypt: jest.fn((text: string) =>
      Promise.resolve(text.replace('encrypted_', ''))
    ),
    setItem: jest.fn(() => Promise.resolve(true)),
    getItem: jest.fn(() => Promise.resolve('stored_value')),
    removeItem: jest.fn(() => Promise.resolve(true)),
    setPrivacyScreenEnabled: jest.fn(),
    setOverlayProtectionEnabled: jest.fn(),
    generateAttestation: jest.fn(() => Promise.resolve('mock_token')),
    isSensorAvailable: jest.fn(() =>
      Promise.resolve({
        available: true,
        enrolled: true,
        biometryType: 'FaceID',
        biometricsSupported: ['FaceID'],
        hasFace: true,
        hasFingerprint: false,
        hasIris: false,
      })
    ),
    isBiometricEnrollmentChanged: jest.fn(() => false),
    simplePrompt: jest.fn(() => Promise.resolve({ success: true })),
    createKeys: jest.fn(() =>
      Promise.resolve({ publicKey: 'mock_bio_pubkey' })
    ),
    biometricKeysExist: jest.fn(() => Promise.resolve({ keysExist: true })),
    deleteKeys: jest.fn(() => Promise.resolve({ success: true })),
    createSignature: jest.fn(() =>
      Promise.resolve({ success: true, signature: 'mock_bio_signature' })
    ),
    hasSecureLockScreen: jest.fn(() => true),
    setSessionTimeout: jest.fn(),
    isSessionExpired: jest.fn(() => false),
    wipeSession: jest.fn(),
    generateSigningKeyPair: jest.fn(() => Promise.resolve('mock_pub_key')),
    signData: jest.fn(() => Promise.resolve('mock_sig')),
    secureStore: jest.fn(),
    secureRead: jest.fn(() => 'secure_val'),
    secureWipe: jest.fn(),
    isAppTampered: jest.fn(() => false),
    rotateEncryptionKey: jest.fn(() => Promise.resolve(true)),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
});

describe('SecureX JavaScript API Unit Tests', () => {
  it('should call audit and return posture', () => {
    const posture = SecureX.audit();
    expect(ReactNativeSecureX.audit).toHaveBeenCalled();
    expect(posture).toEqual({ securityScore: 100, hardwareBacked: true });
  });

  it('should encrypt and decrypt values', async () => {
    const encrypted = await SecureX.encrypt('secret', 'prompt');
    expect(encrypted).toBe('encrypted_secret');
    const decrypted = await SecureX.decrypt(encrypted, 'prompt');
    expect(decrypted).toBe('secret');
  });

  it('should handle item storage methods', async () => {
    await expect(SecureX.setItem('key', 'val', '')).resolves.toBe(true);
    await expect(SecureX.getItem('key', '')).resolves.toBe('stored_value');
    await expect(SecureX.removeItem('key')).resolves.toBe(true);
  });

  it('should delegate secure native in-memory operations', () => {
    SecureX.secureStore('key', 'val');
    expect(ReactNativeSecureX.secureStore).toHaveBeenCalledWith('key', 'val');
    expect(SecureX.secureRead('key')).toBe('secure_val');
    SecureX.secureWipe();
    expect(ReactNativeSecureX.secureWipe).toHaveBeenCalled();
  });

  it('should report vault usability', () => {
    expect(SecureX.hasSecureLockScreen()).toBe(true);
    expect(ReactNativeSecureX.hasSecureLockScreen).toHaveBeenCalled();
  });

  it('should detect sensor availability and biometry type', async () => {
    const result = await SecureX.isSensorAvailable();
    expect(ReactNativeSecureX.isSensorAvailable).toHaveBeenCalled();
    expect(result).toEqual({
      available: true,
      enrolled: true,
      biometryType: 'FaceID',
      biometricsSupported: ['FaceID'],
      hasFace: true,
      hasFingerprint: false,
      hasIris: false,
    });
  });

  it('should perform simple biometric prompt', async () => {
    const res = await SecureX.simplePrompt({
      promptMessage: 'Authenticate to login',
    });
    expect(ReactNativeSecureX.simplePrompt).toHaveBeenCalledWith(
      'Authenticate to login',
      ''
    );
    expect(res).toEqual({ success: true });
  });

  it('should create biometric keys, check existence, and delete keys', async () => {
    const createRes = await SecureX.createKeys();
    expect(ReactNativeSecureX.createKeys).toHaveBeenCalled();
    expect(createRes).toEqual({ publicKey: 'mock_bio_pubkey' });

    const existRes = await SecureX.biometricKeysExist();
    expect(ReactNativeSecureX.biometricKeysExist).toHaveBeenCalled();
    expect(existRes).toEqual({ keysExist: true });

    const delRes = await SecureX.deleteKeys();
    expect(ReactNativeSecureX.deleteKeys).toHaveBeenCalled();
    expect(delRes).toEqual({ success: true });
  });

  it('should create biometric signature for payload', async () => {
    const sigRes = await SecureX.createSignature({
      promptMessage: 'Confirm transfer',
      payload: 'challenge_123',
    });
    expect(ReactNativeSecureX.createSignature).toHaveBeenCalledWith(
      'Confirm transfer',
      'challenge_123',
      ''
    );
    expect(sigRes).toEqual({ success: true, signature: 'mock_bio_signature' });
  });

  it('should support SecureX.biometrics namespace methods', async () => {
    const promptRes = await SecureX.biometrics.simplePrompt({
      promptMessage: 'Unlock App',
    });
    expect(promptRes).toEqual({ success: true });

    const sensorRes = await SecureX.biometrics.isSensorAvailable();
    expect(sensorRes).toEqual({
      available: true,
      enrolled: true,
      biometryType: 'FaceID',
      biometricsSupported: ['FaceID'],
      hasFace: true,
      hasFingerprint: false,
      hasIris: false,
    });
  });

  it('should delegate cryptographic signing operations', async () => {
    const pubKey = await SecureX.generateSigningKeyPair('tag1');
    expect(pubKey).toBe('mock_pub_key');
    const sig = await SecureX.signData('tag1', 'payload');
    expect(sig).toBe('mock_sig');
  });
});
