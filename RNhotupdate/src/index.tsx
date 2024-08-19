import { NativeModules, Platform } from 'react-native';
import {downloadBundleFile} from './Utils.ts';
const LINKING_ERROR =
  'The package \'rn-hotupdate\' doesn\'t seem to be linked. Make sure: \n\n' +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

export interface UpdateOption {
  headers?: object
  updateSuccess?(): void
  updateFail?(): void
  restartAfterInstall?: boolean
}
const RNhotupdate = NativeModules.RNhotupdate
  ? NativeModules.RNhotupdate
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

function setupBundlePath(path: string): Promise<boolean> {
  return RNhotupdate.setupBundlePath(path);
}
function deleteBundlePath(): Promise<boolean> {
  return RNhotupdate.deleteBundle();
}

function removeBundle(restartAfterRemoved?: boolean) {
  deleteBundlePath().then(data => {
    if (data && restartAfterRemoved) {
      setTimeout(() => {
        RNhotupdate.restart();
      }, 300);
    }
  });
}

const installFail = (option?: UpdateOption, e?: any) => {
  option?.updateFail?.();
  console.error('Download bundle fail', JSON.stringify(e));
};
async function downloadBundleUri(uri: string, option?: UpdateOption) {
  try {
    const path = await downloadBundleFile(uri, option?.headers);
    if (path) {
      setupBundlePath(path).then(success => {
        if (success) {
          option?.updateSuccess?.();
          if (option?.restartAfterInstall) {
            setTimeout(() => {
              RNhotupdate.restart();
            }, 300);
          }
        } else {
          installFail(option);
        }
      });
    } else {
      installFail(option);
    }
  } catch (e) {
    installFail(option, e);
  }
}

export default {
  setupBundlePath,
  removeUpdate: removeBundle,
  downloadBundleUri,
};
