# react-native-ota-hot-update

A React Native module that allows you to control hot update same as Code Push, you can control version manager, hosting bundle js by your self, this library just control install the hot update after bundle js downloaded from your side. As we know, Code push is going to retirement in next year, that why i create that library for you can control bundle js from your backend side.

[![npm downloads](https://img.shields.io/npm/dw/react-native-ota-hot-update)](https://img.shields.io/npm/dw/react-native-ota-hot-update)
[![npm package](https://img.shields.io/npm/v/react-native-ota-hot-update?color=red)](https://img.shields.io/npm/v/react-native-ota-hot-update?color=red)

## Installation

if you don't want to manage the download progress, need to install blob util together:

```bash
yarn add react-native-ota-hot-update && react-native-blob-util
```
Auto linking already, need pod install for ios:
```bash
cd ios && pod install
```

## That's it, can check the example code

Here is the guideline to control bundle js by yourself, in here i am using Firebase storage to store bundlejs file and a json file that announce new version is comming:

#### 1.Add these script into your package.json to export bundlejs file:
```bash
"scripts": {
   "export-android": "mkdir -p android/output && react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/output/index.android.bundle --assets-dest android/app/src/main/res  && zip -j android/output/index.android.bundle.zip android/output/index.android.bundle && rm -rf android/output/index.android.bundle",
   "export-ios": "mkdir -p ios/output && react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/output/main.jsbundle && zip -j ios/output/main.jsbundle.zip ios/output/main.jsbundle && rm -rf ios/output/main.jsbundle"
}
```
These commands are export bundle file and compress it as a zip file, one for android and one for ios. You can create your own script that export and auto upload to your server.

Then create an json file: `update.json` like that:
```bash
{
  "version": 1,
  "downloadAndroidUrl": "https://firebasestorage.googleapis.com/v0/b/ota-demo-68f38.appspot.com/o/index.android.bundle.zip?alt=media",
  "downloadIosUrl": "https://firebasestorage.googleapis.com/v0/b/ota-demo-68f38.appspot.com/o/main.jsbundle.zip?alt=media"
}
```

Then upload your bundlejs files to firebase storage, totally will look like that:

![](https://github.com/vantuan88291/react-native-ota-hot-update/raw/main/scr1.png)

After you have done everything related to version manager, you just handle the way to update new version like fetch update.json as api to get download url and call this function:

```bash
    import hotUpdate from 'react-native-ota-hot-update';
    
    
    hotUpdate.downloadBundleUri(url, version, {
      updateSuccess: () => {
        console.log('update success!');
      },
      updateFail(message?: string) {
        Alert.alert('Update failed!', message, [
          {
            text: 'Cancel',
            onPress: () => console.log('Cancel Pressed'),
            style: 'cancel',
          },
        ]);
      },
      restartAfterInstall: true,
    });
```

The important thing: this library will control `version` by it self, need always pass version as parameter in `downloadBundleUri`, it will storage as a cache and use this to check whether need update version in the next time. Default of `version` is **0**


## Functions

| key          | Return | Action                                                                                                           | Parameters                                                         |
| ------------ |--------|------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| downloadBundleUri    | void   | Download bundle and install it                                                                                   | (uri: string, version: number, option?: **UpdateOption**)          |
| setupBundlePath    | boolean | Install your bundle path if you control the downloading by your self, ignore that if you use `downloadBundleUri` | path: string, the path of bundlejs file that you downloaded before |
| removeUpdate | void   | Remove you update and use the previos version                                                                    | restartAfterRemoved?: boolean, restart to apply your changing      |
| resetApp       | void   | Restart the app to apply the changing                                                                            | empty                                                              |
| getCurrentVersion       | number | Get the current version that let you use to compare and control the logic updating                               | empty                                                              |
| setCurrentVersion       | boolean       | Set the current version that let you use to compare and control the logic updating                               | version: number                                                              |


## UpdateOption

| Option                  | Required | Type     | Description                                                                                                                                                                     |
|-------------------------|----------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| headers                 | No       | Object   | The header to down load your uri bundle file if need token/authentication...                                                                                                    |
| updateSuccess           | No       | Callback | Will trigger when install update success                                                                                                                                        |
| updateFail(message: string)               | No       | Callback       | Will trigger when install update failed                                                                                                                                         |
| restartAfterInstall            | No       | boolean       | default is `false`, if `true` will restart the app after install success to apply the new change                                                                                |



## License

[MIT](LICENSE.md)
