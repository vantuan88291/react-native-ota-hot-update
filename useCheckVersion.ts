import React from 'react';
import hotUpdate from 'react-native-ota-hot-update';
import {Alert, Platform} from 'react-native';

const apiVersion = 'https://firebasestorage.googleapis.com/v0/b/ota-demo-68f38.appspot.com/o/update.json?alt=media&token=8bea750d-d57e-4d70-9334-f846f25f344b';
export const useCheckVersion = () => {

  const startUpdate = async (url: string, version: number) => {
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
  };
  const onCheckVersion = () => {
    fetch(apiVersion).then(async (data) => {
      const result = await data.json();
      const currentVersion = await hotUpdate.getCurrentVersion();
      if (result?.version > currentVersion) {
        Alert.alert('New version is comming!', 'New version has release, please update', [
          {
            text: 'Cancel',
            onPress: () => console.log('Cancel Pressed'),
            style: 'cancel',
          },
          {text: 'Update', onPress: () => startUpdate(Platform.OS === 'ios' ? result?.downloadIosUrl : result?.downloadAndroidUrl, result.version)},
        ]);
      }
    });
  };
  React.useEffect(() => {
    onCheckVersion();
  }, []);
};
