import { describe, it, expect, jest } from '@jest/globals';
import { AuthVault } from '../index';
import NativeReactNativeAuthVault from '../NativeReactNativeAuthVault';

jest.mock('../NativeReactNativeAuthVault', () => {
  return {
    audit: jest.fn(() => ({ securityScore: 100, hardwareBacked: true })),
    encrypt: jest.fn((text: string) => Promise.resolve(`encrypted_${text}`)),
    decrypt: jest.fn((text: string) => Promise.resolve(text.replace('encrypted_', ''))),
    setItem: jest.fn(() => Promise.resolve(true)),
    getItem: jest.fn(() => Promise.resolve('stored_value')),
    removeItem: jest.fn(() => Promise.resolve(true)),
    setPrivacyScreenEnabled: jest.fn(),
    setOverlayProtectionEnabled: jest.fn(),
    generateAttestation: jest.fn(() => Promise.resolve('mock_token')),
    isBiometricEnrollmentChanged: jest.fn(() => false),
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

describe('AuthVault JavaScript API Unit Tests', () => {
  it('should call audit and return posture', () => {
    const posture = AuthVault.audit();
    expect(NativeReactNativeAuthVault.audit).toHaveBeenCalled();
    expect(posture).toEqual({ securityScore: 100, hardwareBacked: true });
  });

  it('should encrypt and decrypt values', async () => {
    const encrypted = await AuthVault.encrypt('secret', 'prompt');
    expect(encrypted).toBe('encrypted_secret');
    const decrypted = await AuthVault.decrypt(encrypted, 'prompt');
    expect(decrypted).toBe('secret');
  });

  it('should handle item storage methods', async () => {
    await expect(AuthVault.setItem('key', 'val', '')).resolves.toBe(true);
    await expect(AuthVault.getItem('key', '')).resolves.toBe('stored_value');
    await expect(AuthVault.removeItem('key')).resolves.toBe(true);
  });

  it('should delegate secure native in-memory operations', () => {
    AuthVault.secureStore('key', 'val');
    expect(NativeReactNativeAuthVault.secureStore).toHaveBeenCalledWith('key', 'val');
    expect(AuthVault.secureRead('key')).toBe('secure_val');
    AuthVault.secureWipe();
    expect(NativeReactNativeAuthVault.secureWipe).toHaveBeenCalled();
  });

  it('should delegate cryptographic signing operations', async () => {
    const pubKey = await AuthVault.generateSigningKeyPair('tag1');
    expect(pubKey).toBe('mock_pub_key');
    const sig = await AuthVault.signData('tag1', 'payload');
    expect(sig).toBe('mock_sig');
  });
});
