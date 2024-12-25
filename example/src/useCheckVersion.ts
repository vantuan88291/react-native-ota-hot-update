import hotUpdate from 'react-native-ota-hot-update';
import { Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import React from 'react';
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}
const apiVersion =
  'https://firebasestorage.googleapis.com/v0/b/ota-demo-68f38.appspot.com/o/update.json?alt=media';
export const useCheckVersion = () => {
  const [progress, setProgress] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const startUpdate = async (url: string, version: number) => {
    hotUpdate.downloadBundleUri(ReactNativeBlobUtil, url, version, {
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
      progress(received: string, total: string) {
        const percent = (+received / +total) * 100;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setProgress(percent);
      },
      restartAfterInstall: true,
    });
  };
  const onCheckVersion = () => {
    fetch(apiVersion).then(async (data) => {
      const result = await data.json();
      const currentVersion = await hotUpdate.getCurrentVersion();
      if (result?.version > currentVersion) {
        Alert.alert(
          'New version is comming!',
          'New version has release, please update',
          [
            {
              text: 'Cancel',
              onPress: () => console.log('Cancel Pressed'),
              style: 'cancel',
            },
            {
              text: 'Update',
              onPress: () =>
                startUpdate(
                  Platform.OS === 'ios'
                    ? result?.downloadIosUrl
                    : result?.downloadAndroidUrl,
                  result.version
                ),
            },
          ]
        );
      }
    });
  };

  const onCheckGitVersion = () => {
    setProgress(0);
    setLoading(true);
    hotUpdate.git.checkForGitUpdate({
      restartAfterInstall: false,
      bundlePath:
        Platform.OS === 'ios' ? 'main.jsbundle' : 'android.index.bundle',
      url: 'https://github.com/vantuan88291/OTA-demo-bundle.git',
      onCloneFailed(msg: string) {
        setLoading(false);
        Alert.alert('Clone project failed!', msg, [
          {
            text: 'Cancel',
            onPress: () => {},
            style: 'cancel',
          },
        ]);
      },
      onCloneSuccess() {
        Alert.alert('Clone project success!', 'Restart to apply the changing', [
          {
            text: 'ok',
            onPress: () => hotUpdate.resetApp(),
          },
          {
            text: 'Cancel',
            onPress: () => {},
            style: 'cancel',
          },
        ]);
      },
      onPullFailed(msg: string) {
        Alert.alert('Pull project failed!', msg, [
          {
            text: 'Cancel',
            onPress: () => {},
            style: 'cancel',
          },
        ]);
      },
      onPullSuccess() {
        Alert.alert('Pull project success!', 'Restart to apply the changing', [
          {
            text: 'ok',
            onPress: () => hotUpdate.resetApp(),
          },
          {
            text: 'Cancel',
            onPress: () => {},
            style: 'cancel',
          },
        ]);
      },
      onProgress(received: number, total: number) {
        const percent = (+received / +total) * 100;
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setProgress(percent);
      },
      onFinishProgress() {
        setLoading(false);
      },
    });
  };
  const removeGitUpdate = () => {
    hotUpdate.git.removeGitUpdate();
  };
  return {
    version: {
      onCheckVersion,
      onCheckGitVersion,
      removeGitUpdate,
      state: {
        progress,
        loading,
      },
    },
  };
};
