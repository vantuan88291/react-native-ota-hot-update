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
  'https://firebasestorage.googleapis.com/v0/b/as-otademo.firebasestorage.app/o/update.json?alt=media';
export const useCheckVersion = () => {
  
  const [progress, setProgress] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [versionCode, setVersionCode] = React.useState('0');
  const [versionName, setVersionName] = React.useState('0.0.0');

  const startUpdate = async (url: string, versionCode: number, versionName: string ) => {
    hotUpdate.downloadBundleUri(ReactNativeBlobUtil, url, versionCode, versionName, {
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
      const currentVersionCode = await hotUpdate.getCurrentVersionCode();
      if (result?.versionCode > currentVersionCode) {
        Alert.alert(
          'New version is available!',
          `New version ${result.versionName} (${result.versionCode}) has been released, please update`,
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
                  result.versionCode,
                  result.versionName
                ),
            },
          ]
        );
      }
    });
  };

  const rollBack = async () => {
    const rs = await hotUpdate.rollbackToPreviousBundle();
    if (rs) {
      Alert.alert('Rollback success', 'Restart to apply', [
        {
          text: 'Ok',
          onPress: () => hotUpdate.resetApp(),
          style: 'cancel',
        },
      ]);
    } else {
      Alert.alert('Oops', 'No bundle to rollback', [
        {
          text: 'cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ]);
    }
  };

  const onCheckGitVersion = () => {
    setProgress(0);
    setLoading(true);
    hotUpdate.git.checkForGitUpdate({
      branch: Platform.OS === 'ios' ? 'iOS' : 'android',
      bundlePath:
        Platform.OS === 'ios'
          ? 'output/main.jsbundle'
          : 'output/index.android.bundle',
      url: 'https://github.com/vantuan88291/OTA-demo-bundle.git',
      onCloneFailed(msg: string) {
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
  const setMeta = (data: any) => {
    hotUpdate.setUpdateMetadata(data);
  };
  const getMeta = async () => {
    return hotUpdate.getUpdateMetadata();
  };
  React.useEffect(() => {
    hotUpdate.getCurrentVersionCode().then((data) => {
      setVersionCode(`${data}`);
    });
    hotUpdate.getCurrentVersionName().then((data) => {
      setVersionName(`${data}`);
    });
  }, []);
  return {
    version: {
      getMeta,
      setMeta,
      onCheckVersion,
      onCheckGitVersion,
      removeGitUpdate,
      rollBack,
      state: {
        progress,
        loading,
        versionCode,
        versionName
      },
    },
  };
};
