import './helper/fileReader.js';

// @ts-ignore
import * as promises from './helper/fs';
import type { CloneOption, PullOption } from '../type';

let git, http;

try {
  git = require('isomorphic-git/index.umd.min.js');
  http = require('isomorphic-git/http/web/index.js');
} catch (err) {
  console.warn('isomorphic-git not found, running without Git support.', err);
  git = {};
  http = {};
}

const fs: any = { promises };
const getFolder = (folderName?: string) => {
  try {
    const { DocumentDirectoryPath } = require('react-native-fs');
    return DocumentDirectoryPath + (folderName || '/git_hot_update');
  } catch (e) {}
  return '';
};
/**
 * Should set config after clone success, otherwise cannot pull
 */
const setConfig = async (
  folderName?: string,
  options?: {
    userName?: string;
    email?: string;
  }
) => {
  await git.setConfig({
    fs,
    dir: getFolder(folderName),
    path: options?.userName || 'user.name',
    value: options?.email || 'hotupdate',
  });
};
const cloneRepo = async (options: CloneOption) => {
  try {
    await git.clone({
      fs,
      http,
      dir: getFolder(options?.folderName),
      url: options?.url,
      singleBranch: true,
      depth: 1,
      ref: options?.branch,
      onProgress({ loaded, total }: { loaded: number; total: number }) {
        if (options?.onProgress && total > 0) {
          options?.onProgress(loaded, total);
        }
      },
    });
    return {
      success: true,
      msg: null,
      bundle: `${getFolder(options?.folderName)}/${options.bundlePath}`,
    };
  } catch (e: any) {
    return {
      success: false,
      msg: e.toString(),
      bundle: null,
    };
  } finally {
    setConfig(options?.folderName, {
      email: options?.email,
      userName: options?.userName,
    });
  }
};
const pullUpdate = async (options: PullOption) => {
  try {
    let count = 0;
    await git.pull({
      fs,
      http,
      dir: getFolder(options?.folderName),
      ref: options?.branch,
      singleBranch: true,
      onProgress({ loaded, total }: { loaded: number; total: number }) {
        if (total > 0) {
          count = total;
          if (options?.onProgress) {
            options?.onProgress(loaded, total);
          }
        }
      },
    });
    return {
      success: count > 0,
      msg: count > 0 ? 'Pull success' : 'No updated',
    };
  } catch (e: any) {
    console.log(e.toString());
    return {
      success: false,
      msg: e.toString(),
    };
  }
};
const getBranchName = async (folderName?: string) => {
  try {
    return await git.currentBranch({
      fs,
      dir: getFolder(folderName),
      fullname: false,
    });
  } catch (e: any) {
    console.log(e.toString());
    return null;
  }
};
const getConfig = async (folderName?: string) => {
  try {
    return await git.getConfig({
      fs,
      dir: getFolder(folderName),
      path: 'remote.origin.url',
    });
  } catch (e: any) {
    console.log(e.toString());
    return null;
  }
};
const removeGitUpdate = (folderName?: string) => {
  fs.promises.unlink(getFolder(folderName));
};
export default {
  cloneRepo,
  pullUpdate,
  getBranchName,
  setConfig,
  removeGitUpdate,
  getConfig,
};
