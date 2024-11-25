#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import "OtaHotUpdate.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"OtaHotUpdateExample";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}
- (void)applicationWillResignActive:(UIApplication *)application {
   if (self.taskIdentifier != UIBackgroundTaskInvalid) {
      [application endBackgroundTask:self.taskIdentifier];
      self.taskIdentifier = UIBackgroundTaskInvalid;
   }
 
   __weak AppDelegate *weakSelf = self;
   self.taskIdentifier = [application beginBackgroundTaskWithName:nil expirationHandler:^{
      if (weakSelf) {
          [application endBackgroundTask:weakSelf.taskIdentifier];
          weakSelf.taskIdentifier = UIBackgroundTaskInvalid;
      }
   }];
}
- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [OtaHotUpdate getBundle];
#endif
}

@end
