#import <React/RCTReloadCommand.h>
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNOtaHotUpdateSpec.h"

@interface OtaHotUpdate : NSObject <NativeOtaHotUpdateSpec>
#else
#import <React/RCTBridgeModule.h>

@interface OtaHotUpdate : NSObject <RCTBridgeModule>
#endif
+ (NSURL *)getBundle;

@end
