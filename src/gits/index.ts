import './helper/fileReader.js';
import { DocumentDirectoryPath } from 'react-native-fs';

// @ts-ignore
import git, { PromiseFsClient } from 'isomorphic-git/index.umd.min.js';
import http from 'isomorphic-git/http/web/index.js';
import * as promises from './helper/fs';

const fs: PromiseFsClient = { promises };
const getFolder = (folderName?: string) => {
  return DocumentDirectoryPath + (folderName || '/git_hot_update');
};
const cloneRepo = async (url: string, folderName?: string) => {
  try {
    await git.clone({
      fs,
      http,
      dir: getFolder(folderName),
      url,
      singleBranch: true,
      depth: 1,
      onProgress({ loaded, total }: { loaded: number; total: number }) {
        console.log('----progress clone', total, loaded);
      },
    });
    return true;
  } catch (e) {
    return false;
  }
};
const pullUpdate = async (branch: string, folderName?: string) => {
  try {
    let count = 0;
    await git.pull({
      fs,
      http,
      dir: getFolder(folderName),
      ref: branch,
      singleBranch: true,
      onProgress({ loaded, total }: { loaded: number; total: number }) {
        console.log('----progress pull', total, loaded);
        if (total > 0) {
          count = total;
        }
      },
      onMessage(msg: string) {
        console.log('----msg', msg);
      },
    });
    return count > 0;
  } catch (e: any) {
    console.log(e.toString());
    return false;
  }
};
const checkBranchName = async (folderName?: string) => {
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
const setConfig = async (folderName?: string) => {
  await git.setConfig({
    fs,
    dir: getFolder(folderName),
    path: 'user.name',
    value: 'hotupdate',
  });
};
export default {
  cloneRepo,
  pullUpdate,
  checkBranchName,
  setConfig,
};
