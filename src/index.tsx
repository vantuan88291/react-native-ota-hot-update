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
function setupExactBundlePath(path: string): Promise<boolean> {
  return RNhotupdate.setExactBundlePath(path);
}
function deleteBundlePath(): Promise<boolean> {
  return RNhotupdate.deleteBundle(1);
}
function getCurrentVersionName(): Promise<string> {
  return RNhotupdate.getCurrentVersionName();
}
function getCurrentVersionCode(): Promise<string> {
  return RNhotupdate.getCurrentVersionCode();
}
function getUpdateMetadata(): Promise<object | null> {
  return RNhotupdate.getUpdateMetadata(0)
    .then((metadataString: string | null) => {
      try {
        return metadataString ? JSON.parse(metadataString) : null;
      } catch (error) {
        return Promise.reject(new Error('Error parsing metadata'));
      }
    });
}
function rollbackToPreviousBundle(): Promise<boolean> {
  return RNhotupdate.rollbackToPreviousBundle(0);
}
async function getVersionCodeAsNumber() {
  const rawVersion = await getCurrentVersionCode();
  return +rawVersion;
}
function setCurrentVersionCode(versionCode: number): Promise<boolean> {
  return RNhotupdate.setCurrentVersionCode(versionCode + '');
}
function setCurrentVersionName(versionName: string): Promise<boolean> {
  return RNhotupdate.setCurrentVersionName(versionName);
}
function setUpdateMetadata(metadata: any): Promise<boolean> {
  try {
    const metadataString = JSON.stringify(metadata);
    return RNhotupdate.setUpdateMetadata(metadataString);
  } catch (error) {
    return Promise.reject(new Error('Failed to stringify metadata'));
  }
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
        setCurrentVersionCode(0);
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
  versionCode: number,
  versionName: string,
  option?: UpdateOption
) {
  if (!uri) {
    return installFail(option, 'Please give a valid URL!');
  }
  if (!versionCode) {
    return installFail(option, 'Please give a valid version!');
  }

  const currentVersionCode = await getVersionCodeAsNumber();

  if (versionCode <= currentVersionCode) {
    return installFail(
      option,
      'Please give a bigger version than the current version, the current version now has setted by: ' +
      currentVersionCode
    );
  }

  try {
    const path = await downloadBundleFile(
      downloadManager,
      uri,
      option?.headers,
      option?.progress
    );

    if (!path) {
      return installFail(option);
    }

    const success = await setupBundlePath(path, option?.extensionBundle);

    if (!success) {
      return installFail(option);
    }

    setCurrentVersionCode(versionCode);
    setCurrentVersionName(versionName);

    if (option?.metadata) {
      setUpdateMetadata(option.metadata);
    }
    
    option?.updateSuccess?.();

    if (option?.restartAfterInstall) {
      setTimeout(() => {
        resetApp();
      }, option?.restartDelay || 300);
    }
  } catch (e) {
    installFail(option, e);
  }
}
const checkForGitUpdate = async (options: UpdateGitOption) => {
  try {
    if (!options.url || !options.bundlePath) {
      throw new Error(`url or bundlePath should not be null`);
    }
    const [config, branch] = await Promise.all([
      git.getConfig(),
      git.getBranchName(),
    ]);
    if (branch && config) {
      const pull = await git.pullUpdate({
        branch,
        onProgress: options?.onProgress,
        folderName: options?.folderName,
      });
      if (pull.success) {
        options?.onPullSuccess?.();
        if (options?.restartAfterInstall) {
          setTimeout(() => {
            resetApp();
          }, 300);
        }
      } else {
        options?.onPullFailed?.(pull.msg);
      }
    } else {
      const clone = await git.cloneRepo({
        onProgress: options?.onProgress,
        folderName: options?.folderName,
        url: options.url,
        branch: options?.branch,
        bundlePath: options.bundlePath,
      });
      if (clone.success && clone.bundle) {
        await setupExactBundlePath(clone.bundle);
        options?.onCloneSuccess?.();
        if (options?.restartAfterInstall) {
          setTimeout(() => {
            resetApp();
          }, 300);
        }
      } else {
        options?.onCloneFailed?.(clone.msg);
      }
    }
  } catch (e: any) {
    options?.onCloneFailed?.(e.toString());
  } finally {
    options?.onFinishProgress?.();
  }
};
export default {
  setupBundlePath,
  setupExactBundlePath,
  removeUpdate: removeBundle,
  downloadBundleUri,
  resetApp,
  getCurrentVersionCode: getVersionCodeAsNumber,
  setCurrentVersionCode,
  getCurrentVersionName,
  setCurrentVersionName,
  getUpdateMetadata,
  setUpdateMetadata,
  rollbackToPreviousBundle,
  git: {
    checkForGitUpdate,
    ...git,
    removeGitUpdate: (folder?: string) => {
      RNhotupdate.setExactBundlePath('');
      git.removeGitUpdate(folder);
    },
  },
};
