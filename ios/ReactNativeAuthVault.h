#if __has_include(<React/RCTBridgeModule.h>)
#import <React/RCTBridgeModule.h>
#elif __has_include("RCTBridgeModule.h")
#import "RCTBridgeModule.h"
#endif

#if __has_include(<React/RCTEventEmitter.h>)
#import <React/RCTEventEmitter.h>
#elif __has_include("RCTEventEmitter.h")
#import "RCTEventEmitter.h"
#elif __has_include(<React-RCTBridge/RCTEventEmitter.h>)
#import <React-RCTBridge/RCTEventEmitter.h>
#endif

#if __has_include(<ReactNativeAuthVaultSpec/ReactNativeAuthVaultSpec.h>)
#import <ReactNativeAuthVaultSpec/ReactNativeAuthVaultSpec.h>
#elif __has_include("ReactNativeAuthVaultSpec.h")
#import "ReactNativeAuthVaultSpec.h"
#endif

#ifndef NativeReactNativeAuthVaultSpec_h
@protocol NativeReactNativeAuthVaultSpec <RCTBridgeModule>
@end
#endif

@interface ReactNativeAuthVault : RCTEventEmitter <NativeReactNativeAuthVaultSpec>

@end
