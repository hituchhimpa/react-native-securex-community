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

#if __has_include(<ReactNativeSecureXSpec/ReactNativeSecureXSpec.h>)
#import <ReactNativeSecureXSpec/ReactNativeSecureXSpec.h>
#elif __has_include("ReactNativeSecureXSpec.h")
#import "ReactNativeSecureXSpec.h"
#endif

#ifndef NativeReactNativeSecureXSpec_h
@protocol NativeReactNativeSecureXSpec <RCTBridgeModule>
@end
#endif

@interface ReactNativeSecureX : RCTEventEmitter <NativeReactNativeSecureXSpec>

@end
