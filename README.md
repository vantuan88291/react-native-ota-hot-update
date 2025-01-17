# react-native-ota-hot-update


This React Native module allows you to manage hot updates (in-app update) with minimal configuration, similar to Code Push. You can control versioning and host the JS bundle yourself. The library handles the installation of updates after the bundle is downloaded from your server or Git repository. With Code Push retiring soon, this library gives you full control over your update process, whether hosting the bundle on your own server or in a Git repository.


1. **Demo via server**

iOS GIF             | Android GIF
:-------------------------:|:-------------------------:
<img src="./ioshotupdate.gif" title="iOS GIF" width="250"> | <img src="./androidhotupdate.gif" title="Android GIF" width="250">

2. **Demo via git repository**

iOS GIF             | Android GIF
:-------------------------:|:-------------------------:
<img src="./iosgit.gif" title="iOS GIF" width="250"> | <img src="./androidgithotupdate.gif" title="Android GIF" width="250">

[![npm downloads](https://img.shields.io/npm/dw/react-native-ota-hot-update)](https://img.shields.io/npm/dw/react-native-ota-hot-update)
[![npm package](https://img.shields.io/npm/v/react-native-ota-hot-update?color=red)](https://img.shields.io/npm/v/react-native-ota-hot-update?color=red)

## New architecture supported

New architecture backward compatibility supported from version 2, it also supported old architecture, for source code of version 1.x.x please refer to branch `oldArch`, you might need install version 1.x.x if you are using react native < 0.70

## Installation

if you don't want to manage the download progress, need to install blob util together:

```bash
yarn add react-native-ota-hot-update react-native-blob-util react-native-fs
```
Auto linking already, need pod install for ios:
```bash
cd ios && pod install
```

### IOS
Open `AppDelegate.m` and add this:

```bash
#import "OtaHotUpdate.h"
...
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [OtaHotUpdate getBundle]; ## add this line
#endif
}
```
#### For downloading in background mode on IOS, following this (optional):

AppDelegate.h:
```bash
@property (nonatomic, assign) UIBackgroundTaskIdentifier taskIdentifier;
```
AppDelegate.mm:

```bash
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
```


### Android
Open `MainApplication.java/kt` and add these codes bellow:
```bash
import com.otahotupdate.OtaHotUpdate
...
override fun getJSBundleFile(): String? {
    return OtaHotUpdate.bundleJS
}

```
Open `AndroidManifest.xml` :

`<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />`

`<application
...
android:requestLegacyExternalStorage="true"
`

## That's it, can check the example code
`Remember hot update just work at release mode, debug mode won't working`


### Control Hot Update via Server
With this method, you can host the bundle JS on your own server. The app fetches the updates directly from the server, allowing for dynamic updates.

For detailed instructions on how to implement this, refer to [**DOC_OTA_SERVER.md**](DOC_OTA_SERVER.md).

---

### Control Hot Update via Git Repository
This method allows you to use a Git repository to host the bundle JS. The app pulls updates directly from the repository, providing an easy and version-controlled way to manage updates.

For detailed instructions on how to implement this, refer to [**DOC_OTA_GIT.md**](DOC_OTA_GIT.md).

## License

[MIT](LICENSE)


### Sponsor this project
https://paypal.me/vantuan88291
