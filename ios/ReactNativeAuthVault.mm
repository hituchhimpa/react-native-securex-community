#import "ReactNativeAuthVault.h"
#import <DeviceCheck/DeviceCheck.h>
#import <CommonCrypto/CommonCrypto.h>
#import <CommonCrypto/CommonDigest.h>

#if __has_include("ReactNativeAuthVault/ReactNativeAuthVault-Swift.h")
#import "ReactNativeAuthVault/ReactNativeAuthVault-Swift.h"
#else
#import "ReactNativeAuthVault-Swift.h"
#endif

@implementation ReactNativeAuthVault {
    CryptoEngine *_cryptoEngine;
    UIVisualEffectView *_privacyView;
    BOOL _isPrivacyScreenEnabled;
    NSTimeInterval _sessionStartTime;
    NSTimeInterval _sessionTimeout;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _cryptoEngine = [[CryptoEngine alloc] init];
        [_cryptoEngine initializeKey];
        _sessionStartTime = [NSDate date].timeIntervalSince1970;
        _sessionTimeout = DBL_MAX;
    }
    return self;
}

// MARK: - Privacy Screen

- (void)setPrivacyScreenEnabled:(BOOL)enabled {
    _isPrivacyScreenEnabled = enabled;
    if (enabled && !_privacyView) {
        dispatch_async(dispatch_get_main_queue(), ^{
            UIBlurEffect *blurEffect = [UIBlurEffect effectWithStyle:UIBlurEffectStyleDark];
            self->_privacyView = [[UIVisualEffectView alloc] initWithEffect:blurEffect];
            self->_privacyView.frame = [UIScreen mainScreen].bounds;
            self->_privacyView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
            [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(appWillResignActive) name:UIApplicationWillResignActiveNotification object:nil];
            [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(appDidBecomeActive) name:UIApplicationDidBecomeActiveNotification object:nil];
        });
    } else if (!enabled && _privacyView) {
        dispatch_async(dispatch_get_main_queue(), ^{
            [[NSNotificationCenter defaultCenter] removeObserver:self];
            self->_privacyView = nil;
        });
    }
}

- (void)setOverlayProtectionEnabled:(BOOL)enabled {
    // iOS handles overlay protection natively
}

- (void)appWillResignActive {
    dispatch_async(dispatch_get_main_queue(), ^{
        UIWindow *window = [UIApplication sharedApplication].keyWindow;
        if (window && self->_privacyView) { [window addSubview:self->_privacyView]; }
    });
}

- (void)appDidBecomeActive {
    dispatch_async(dispatch_get_main_queue(), ^{
        if (self->_privacyView && self->_privacyView.superview) {
            [self->_privacyView removeFromSuperview];
        }
    });
}

// MARK: - Device Attestation (Apple AppAttest)

- (void)generateAttestation:(NSString *)nonce resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    if (@available(iOS 14.0, *)) {
        DCAppAttestService *service = [DCAppAttestService sharedService];
        if (!service.isSupported) {
            reject(@"ERR_UNSUPPORTED", @"App Attest is not supported on this device", nil);
            return;
        }
        [service generateKeyWithCompletionHandler:^(NSString * _Nullable keyId, NSError * _Nullable error) {
            if (error || !keyId) { reject(@"ERR_ATTESTATION", @"Failed to generate App Attest key", error); return; }
            NSData *nonceData = [nonce dataUsingEncoding:NSUTF8StringEncoding];
            NSMutableData *hashData = [NSMutableData dataWithLength:CC_SHA256_DIGEST_LENGTH];
            CC_SHA256(nonceData.bytes, (CC_LONG)nonceData.length, (unsigned char *)hashData.mutableBytes);
            [service attestKey:keyId clientDataHash:hashData completionHandler:^(NSData * _Nullable attestationObject, NSError * _Nullable error) {
                if (error || !attestationObject) { reject(@"ERR_ATTESTATION", @"Failed to attest key", error); return; }
                resolve([attestationObject base64EncodedStringWithOptions:0]);
            }];
        }];
    } else {
        reject(@"ERR_UNSUPPORTED", @"App Attest requires iOS 14.0 or newer", nil);
    }
}

// MARK: - Biometric Enrollment Change Detection

- (BOOL)isBiometricEnrollmentChanged {
    return [SecurityEngine isBiometricEnrollmentChanged];
}

// MARK: - Vault Usability

- (BOOL)hasSecureLockScreen {
    return [SecurityEngine hasSecureLockScreen];
}

// MARK: - Session Key Expiry

- (void)setSessionTimeout:(double)seconds {
    _sessionTimeout = seconds;
    _sessionStartTime = [NSDate date].timeIntervalSince1970;
}

- (BOOL)isSessionExpired {
    NSTimeInterval now = [NSDate date].timeIntervalSince1970;
    BOOL expired = (now - _sessionStartTime) > _sessionTimeout;
    if (expired) {
        [self emitSecurityEvent:@"SESSION_EXPIRED" detail:[NSString stringWithFormat:@"Session timed out after %.0f seconds", _sessionTimeout]];
    }
    return expired;
}

- (void)wipeSession {
    _sessionStartTime = [NSDate date].timeIntervalSince1970;
    _sessionTimeout = DBL_MAX;
    [SecureMemoryStore wipe];
}

// MARK: - ECC Hardware Key Pairs + Signing (Secure Enclave)

- (void)generateSigningKeyPair:(NSString *)tag resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [SigningEngine generateSigningKeyPairWithTag:tag completion:^(NSString * _Nullable publicKeyPEM, NSString * _Nullable error) {
        if (error) { reject(@"ERR_SIGNING_KEYGEN", error, nil); }
        else { resolve(publicKeyPEM); }
    }];
}

- (void)signData:(NSString *)tag data:(NSString *)data resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [SigningEngine signDataWithTag:tag data:data completion:^(NSString * _Nullable signature, NSString * _Nullable error) {
        if (error) { reject(@"ERR_SIGN", error, nil); }
        else { resolve(signature); }
    }];
}

// MARK: - Secure In-Memory Storage

- (void)secureStore:(NSString *)key value:(NSString *)value {
    [SecureMemoryStore storeWithKey:key value:value];
}

- (NSString *)secureRead:(NSString *)key {
    return [SecureMemoryStore readWithKey:key];
}

- (void)secureWipe {
    [SecureMemoryStore wipe];
}

// MARK: - Runtime App Tamper Detection

- (BOOL)isAppTampered {
    BOOL tampered = [SecurityEngine isAppTampered];
    if (tampered) { [self emitSecurityEvent:@"APP_TAMPERED" detail:@"Code signing validation failed"]; }
    return tampered;
}

// MARK: - Key Rotation

- (void)rotateEncryptionKey:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    NSDictionary *query = @{
        (__bridge id)kSecClass: (__bridge id)kSecClassKey,
        (__bridge id)kSecAttrApplicationTag: @"com.authvault.aes-key",
    };
    OSStatus status = SecItemDelete((__bridge CFDictionaryRef)query);
    if (status == errSecSuccess || status == errSecItemNotFound) {
        [_cryptoEngine initializeKey];
        resolve(@(YES));
    } else {
        reject(@"ERR_KEY_ROTATION", @"Failed to delete existing key", nil);
    }
}

// MARK: - Security Events (NativeEventEmitter)

- (NSArray<NSString *> *)supportedEvents {
    return @[@"SecurityEvent"];
}

- (void)addListener:(NSString *)eventName { /* required */ }
- (void)removeListeners:(double)count { /* required */ }

- (void)emitSecurityEvent:(NSString *)type detail:(NSString *)detail {
    [self sendEventWithName:@"SecurityEvent" body:@{
        @"type": type,
        @"detail": detail,
        @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
    }];
}

// MARK: - Core Vault

- (NSDictionary *)audit {
    return [SecurityEngine audit];
}

- (void)encrypt:(NSString *)plainText prompt:(NSString *)prompt resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [_cryptoEngine encryptWithPlainText:plainText prompt:prompt completion:^(NSString * _Nullable result, NSString * _Nullable error) {
        if (error) { reject(@"ERR_ENCRYPT", error, nil); } else { resolve(result); }
    }];
}

- (void)decrypt:(NSString *)encryptedBase64 prompt:(NSString *)prompt resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [_cryptoEngine decryptWithEncryptedBase64:encryptedBase64 prompt:prompt completion:^(NSString * _Nullable result, NSString * _Nullable error) {
        if (error) { reject(@"ERR_DECRYPT", error, nil); } else { resolve(result); }
    }];
}

- (void)setItem:(NSString *)key value:(NSString *)value prompt:(NSString *)prompt resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [_cryptoEngine encryptWithPlainText:value prompt:prompt completion:^(NSString * _Nullable encryptedBase64, NSString * _Nullable error) {
        if (error) { reject(@"ERR_ENCRYPT", error, nil); return; }
        [[NSUserDefaults standardUserDefaults] setObject:encryptedBase64 forKey:key];
        resolve(@(YES));
    }];
}

- (void)getItem:(NSString *)key prompt:(NSString *)prompt resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    NSString *encryptedBase64 = [[NSUserDefaults standardUserDefaults] stringForKey:key];
    if (!encryptedBase64) { resolve([NSNull null]); return; }
    [_cryptoEngine decryptWithEncryptedBase64:encryptedBase64 prompt:prompt completion:^(NSString * _Nullable result, NSString * _Nullable error) {
        if (error) { reject(@"ERR_DECRYPT", error, nil); } else { resolve(result); }
    }];
}

- (void)removeItem:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    [[NSUserDefaults standardUserDefaults] removeObjectForKey:key];
    resolve(@(YES));
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeReactNativeAuthVaultSpecJSI>(params);
}
#endif

+ (NSString *)moduleName
{
  return @"ReactNativeAuthVault";
}

@end
