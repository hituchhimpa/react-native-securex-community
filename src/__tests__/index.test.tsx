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
    isBiometricEnrollmentChanged: jest.fn(() => false),
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

  it('should delegate cryptographic signing operations', async () => {
    const pubKey = await SecureX.generateSigningKeyPair('tag1');
    expect(pubKey).toBe('mock_pub_key');
    const sig = await SecureX.signData('tag1', 'payload');
    expect(sig).toBe('mock_sig');
  });
});
