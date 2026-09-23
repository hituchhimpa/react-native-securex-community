import Foundation
import Security
import CryptoKit
import LocalAuthentication

@objc(SigningEngine)
public class SigningEngine: NSObject {

    // MARK: - Generate P-256 ECC Key in Secure Enclave

    @objc
    public static func generateSigningKeyPair(tag: String, completion: @escaping (_ publicKeyPEM: String?, _ error: String?) -> Void) {
        let tagData = tag.data(using: .utf8)!

        #if targetEnvironment(simulator)
        // Simulator: Use standard keychain (no Secure Enclave)
        let attrs: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tagData
            ]
        ]
        #else
        // Device: Use Secure Enclave
        guard SecureEnclave.isAvailable else {
            completion(nil, "Secure Enclave not available")
            return
        }
        let attrs: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tagData,
                kSecAttrAccessControl as String: {
                    SecAccessControlCreateWithFlags(
                        nil,
                        kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                        [.privateKeyUsage],
                        nil
                    )!
                }()
            ]
        ]
        #endif

        // Delete existing key if any
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tagData
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        var error: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateRandomKey(attrs as CFDictionary, &error) else {
            completion(nil, error?.takeRetainedValue().localizedDescription ?? "Key generation failed")
            return
        }

        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
            completion(nil, "Failed to extract public key")
            return
        }

        var keyError: Unmanaged<CFError>?
        guard let pubKeyData = SecKeyCopyExternalRepresentation(publicKey, &keyError) as Data? else {
            completion(nil, "Failed to export public key")
            return
        }

        // Return public key as Base64 DER
        let pem = pubKeyData.base64EncodedString()
        completion(pem, nil)
    }

    // MARK: - Sign Data with Secure Enclave Key

    @objc
    public static func signData(tag: String, data: String, completion: @escaping (_ signature: String?, _ error: String?) -> Void) {
        let tagData = tag.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrApplicationTag as String: tagData,
            kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
            kSecReturnRef as String: true
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let privateKey = item else {
            completion(nil, "Signing key not found for tag: \(tag). Call generateSigningKeyPair first.")
            return
        }

        guard let dataToSign = data.data(using: .utf8) else {
            completion(nil, "Invalid data encoding")
            return
        }

        var signError: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
            privateKey as! SecKey,
            .ecdsaSignatureMessageX962SHA256,
            dataToSign as CFData,
            &signError
        ) as Data? else {
            completion(nil, signError?.takeRetainedValue().localizedDescription ?? "Signing failed")
            return
        }

        completion(signature.base64EncodedString(), nil)
    }

    // MARK: - Biometric-Gated Hardware Key Pairs (react-native-biometrics compatible)

    @objc
    public static func generateBiometricKeyPair(tag: String, completion: @escaping (_ publicKeyPEM: String?, _ error: String?) -> Void) {
        let tagData = tag.data(using: .utf8)!

        deleteSigningKeyPair(tag: tag)

        var error: Unmanaged<CFError>?
        guard let accessControl = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            [.userPresence, .privateKeyUsage],
            &error
        ) else {
            completion(nil, error?.takeRetainedValue().localizedDescription ?? "Failed to create access control")
            return
        }

        #if targetEnvironment(simulator)
        let attrs: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tagData
            ]
        ]
        #else
        let attrs: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tagData,
                kSecAttrAccessControl as String: accessControl
            ]
        ]
        #endif

        var createError: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateRandomKey(attrs as CFDictionary, &createError) else {
            completion(nil, createError?.takeRetainedValue().localizedDescription ?? "Key generation failed")
            return
        }

        guard let publicKey = SecKeyCopyPublicKey(privateKey),
              let pubKeyData = SecKeyCopyExternalRepresentation(publicKey, nil) as Data? else {
            completion(nil, "Failed to export public key")
            return
        }

        completion(pubKeyData.base64EncodedString(), nil)
    }

    @objc
    public static func biometricKeysExist(tag: String) -> Bool {
        let tagData = tag.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tagData,
            kSecReturnRef as String: false
        ]
        let status = SecItemCopyMatching(query as CFDictionary, nil)
        return status == errSecSuccess || status == errSecInteractionNotAllowed || status == errSecAuthFailed
    }

    @objc
    @discardableResult
    public static func deleteSigningKeyPair(tag: String) -> Bool {
        let tagData = tag.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tagData
        ]
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    @objc
    public static func signDataWithBiometrics(
        tag: String,
        data: String,
        promptMessage: String,
        completion: @escaping (_ signature: String?, _ error: String?) -> Void
    ) {
        let tagData = tag.data(using: .utf8)!
        let context = LAContext()
        context.localizedReason = promptMessage

        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrApplicationTag as String: tagData,
            kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
            kSecReturnRef as String: true,
            kSecUseAuthenticationContext as String: context
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let privateKey = item else {
            completion(nil, "Biometric key not found for tag: \(tag). Call createKeys first.")
            return
        }

        guard let dataToSign = data.data(using: .utf8) else {
            completion(nil, "Invalid data encoding")
            return
        }

        var signError: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
            privateKey as! SecKey,
            .ecdsaSignatureMessageX962SHA256,
            dataToSign as CFData,
            &signError
        ) as Data? else {
            completion(nil, signError?.takeRetainedValue().localizedDescription ?? "Signing failed")
            return
        }

        completion(signature.base64EncodedString(), nil)
    }
}
