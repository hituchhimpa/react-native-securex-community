import Foundation
import LocalAuthentication
import Security

@objc(CryptoEngine)
public class CryptoEngine: NSObject {
    private let keyTagBiometric = "com.hituchhimpa.reactnativesecurex.key.biometric".data(using: .utf8)!
    private let keyTagNonBiometric = "com.hituchhimpa.reactnativesecurex.key.nonbiometric".data(using: .utf8)!

    @objc
    public func initializeKey() {
        if getPublicKey(useBiometric: true) == nil {
            try? generateKey(useBiometric: true)
        }
        if getPublicKey(useBiometric: false) == nil {
            try? generateKey(useBiometric: false)
        }
    }

    private func generateKey(useBiometric: Bool) throws {
        var error: Unmanaged<CFError>?
        
        let access: SecAccessControl
        if useBiometric {
            // Require FaceID / TouchID for private key usage
            guard let acc = SecAccessControlCreateWithFlags(
                kCFAllocatorDefault,
                kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                [.userPresence, .privateKeyUsage],
                &error
            ) else {
                throw error!.takeRetainedValue() as Error
            }
            access = acc
        } else {
            guard let acc = SecAccessControlCreateWithFlags(
                kCFAllocatorDefault,
                kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                [.privateKeyUsage],
                &error
            ) else {
                throw error!.takeRetainedValue() as Error
            }
            access = acc
        }
        
        let tag = useBiometric ? keyTagBiometric : keyTagNonBiometric
        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tag,
                kSecAttrAccessControl as String: access
            ]
        ]
        
        let status = SecKeyCreateRandomKey(attributes as CFDictionary, &error)
        if status == nil, let error = error {
            throw error.takeRetainedValue() as Error
        }
    }

    private func getKey(useBiometric: Bool, prompt: String = "Authenticate to access key") -> SecKey? {
        let tag = useBiometric ? keyTagBiometric : keyTagNonBiometric
        var query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tag,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecReturnRef as String: true
        ]
        if useBiometric {
            query[kSecUseOperationPrompt as String] = prompt
        }
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecSuccess {
            return (item as! SecKey)
        }
        return nil
    }

    @objc
    public func encrypt(plainText: String, prompt: String, completion: @escaping (String?, String?) -> Void) {
        let useBiometric = !prompt.isEmpty
        DispatchQueue.global(qos: .userInitiated).async {
            guard let publicKey = self.getPublicKey(useBiometric: useBiometric) else {
                completion(nil, "Key not found")
                return
            }
            
            guard let data = plainText.data(using: .utf8) else {
                completion(nil, "Invalid string")
                return
            }
            
            var error: Unmanaged<CFError>?
            guard let encryptedData = SecKeyCreateEncryptedData(
                publicKey,
                .eciesEncryptionStandardX963SHA256AESGCM,
                data as CFData,
                &error
            ) as Data? else {
                completion(nil, error?.takeRetainedValue().localizedDescription ?? "Encryption failed")
                return
            }
            
            completion(encryptedData.base64EncodedString(), nil)
        }
    }

    @objc
    public func decrypt(encryptedBase64: String, prompt: String, completion: @escaping (String?, String?) -> Void) {
        let useBiometric = !prompt.isEmpty
        DispatchQueue.global(qos: .userInitiated).async {
            guard let privateKey = self.getKey(useBiometric: useBiometric, prompt: prompt) else {
                completion(nil, "Authentication failed or key not found")
                return
            }
            
            guard let data = Data(base64Encoded: encryptedBase64) else {
                completion(nil, "Invalid base64")
                return
            }
            
            var error: Unmanaged<CFError>?
            guard let decryptedData = SecKeyCreateDecryptedData(
                privateKey,
                .eciesEncryptionStandardX963SHA256AESGCM,
                data as CFData,
                &error
            ) as Data? else {
                completion(nil, error?.takeRetainedValue().localizedDescription ?? "Decryption failed")
                return
            }
            
            completion(String(data: decryptedData, encoding: .utf8), nil)
        }
    }
    
    private func getPublicKey(useBiometric: Bool) -> SecKey? {
        let tag = useBiometric ? keyTagBiometric : keyTagNonBiometric
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tag,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecReturnRef as String: true
        ]
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecSuccess {
            let privateKey = item as! SecKey
            return SecKeyCopyPublicKey(privateKey)
        }
        return nil
    }
}
