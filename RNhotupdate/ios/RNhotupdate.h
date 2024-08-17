
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNRNhotupdateSpec.h"

@interface RNhotupdate : NSObject <NativeRNhotupdateSpec>
#else
#import <React/RCTBridgeModule.h>

@interface RNhotupdate : NSObject <RCTBridgeModule>
#endif
+ (NSString *)getBundle;
@end
