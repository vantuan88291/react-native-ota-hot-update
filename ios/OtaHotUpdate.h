#import <React/RCTReloadCommand.h>

#if defined(RCT_NEW_ARCH_ENABLED) && __has_include("RNOtaHotUpdateSpec.h")
#import "RNOtaHotUpdateSpec.h"
@interface OtaHotUpdate : NSObject <NativeOtaHotUpdateSpec>
#else
#import <React/RCTBridgeModule.h>
@interface OtaHotUpdate : NSObject <RCTBridgeModule>
#endif

+ (NSURL *)getBundle;

@end
