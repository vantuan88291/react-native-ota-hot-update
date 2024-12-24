import { NativeModules, Platform } from 'react-native';
import type { DownloadManager } from './download';
import type { UpdateGitOption, UpdateOption } from './type';
import git from './gits';

const LINKING_ERROR =
  `The package 'react-native-ota-hot-update' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// @ts-expect-error
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const OtaHotUpdateModule = isTurboModuleEnabled
  ? require('./NativeOtaHotUpdate').default
  : NativeModules.OtaHotUpdate;

const RNhotupdate = OtaHotUpdateModule
  ? OtaHotUpdateModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

const downloadBundleFile = async (
  downloadManager: DownloadManager,
  uri: string,
  headers?: object,
  callback?: (received: string, total: string) => void
) => {
  const res = await downloadManager
    .config({
      fileCache: Platform.OS === 'android',
    })
    .fetch('GET', uri, {
      ...headers,
    })
    .progress((received, total) => {
      if (callback) {
        callback(received, total);
      }
    });
  return res.path();
};
function setupBundlePath(path: string, extension?: string): Promise<boolean> {
  return RNhotupdate.setupBundlePath(path, extension);
}
function deleteBundlePath(): Promise<boolean> {
  return RNhotupdate.deleteBundle(1);
}
function getCurrentVersion(): Promise<string> {
  return RNhotupdate.getCurrentVersion(0);
}
async function getVersionAsNumber() {
  const rawVersion = await getCurrentVersion();
  return +rawVersion;
}
function setCurrentVersion(version: number): Promise<boolean> {
  return RNhotupdate.setCurrentVersion(version + '');
}
async function resetApp() {
  RNhotupdate.restart();
}
function removeBundle(restartAfterRemoved?: boolean) {
  deleteBundlePath().then((data) => {
    if (data && restartAfterRemoved) {
      setTimeout(() => {
        resetApp();
      }, 300);
      if (data) {
        setCurrentVersion(0);
      }
    }
  });
}
const installFail = (option?: UpdateOption, e?: any) => {
  option?.updateFail?.(JSON.stringify(e));
  console.error('Download bundle fail', JSON.stringify(e));
};
async function downloadBundleUri(
  downloadManager: DownloadManager,
  uri: string,
  version: number,
  option?: UpdateOption
) {
  if (!uri) {
    installFail(option, 'Please give a valid URL!');
    return;
  }
  if (!version) {
    installFail(option, 'Please give a valid version!');
    return;
  }
  const currentVersion = await getVersionAsNumber();
  if (version <= currentVersion) {
    installFail(
      option,
      'Please give a bigger version than the current version, the current version now has setted by: ' +
        currentVersion
    );
    return;
  }
  try {
    const path = await downloadBundleFile(
      downloadManager,
      uri,
      option?.headers,
      option?.progress
    );
    if (path) {
      setupBundlePath(path, option?.extensionBundle).then((success) => {
        if (success) {
          setCurrentVersion(version);
          option?.updateSuccess?.();
          if (option?.restartAfterInstall) {
            setTimeout(() => {
              resetApp();
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
const checkForGitUpdate = async (options: UpdateGitOption) => {
  try {
    const branch = await git.checkBranchName();
    console.log('exist---', options);
    if (branch) {
      const pull = await git.pullUpdate(branch);
      console.log('pull---', pull);
    } else {
      const clone = await git.cloneRepo(options.url);
      if (clone) {
        git.setConfig();
      }
      console.log('clone---', clone);
    }
  } catch (e) {
    console.log(e);
  }
};
export default {
  setupBundlePath,
  removeUpdate: removeBundle,
  downloadBundleUri,
  resetApp,
  getCurrentVersion: getVersionAsNumber,
  setCurrentVersion,
  checkForGitUpdate,
};
