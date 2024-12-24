import React from 'react';
import './fileReader.js';

import { DocumentDirectoryPath } from 'react-native-fs';

// @ts-ignore
import git, { PromiseFsClient } from 'isomorphic-git/index.umd.min.js';
import http from 'isomorphic-git/http/web/index.js';
import * as promises from './fs';

const fs: PromiseFsClient = { promises };
const repoFolder = DocumentDirectoryPath + '/repogit';
export const useGitVersion = () => {
  const onCheckVersion = async () => {
    try {
      const info = await git.getRemoteInfo({
        http,
        url: 'https://github.com/vantuan88291/react-native-ota-hot-update.git',
      });
      console.log('on remote----', info);
    } catch (e) {
      console.log('e----', e);
    }
  };
  const pullVersion = async () => {
    try {
      const pull = await git.pull({
        fs,
        http,
        dir: repoFolder,
        ref: 'main',
        singleBranch: true,
      });
      console.log('on pull----', pull);
    } catch (e) {
      console.log('epull----', e);
    }
  };
  const cloneVersion = async () => {
    try {
      const clone = await git.clone({
        fs,
        http,
        dir: repoFolder,
        url: 'https://github.com/vantuan88291/react-native-ota-hot-update.git',
        onProgress({ loaded, total }) {
          console.log('----progress', total, loaded);
        },
      });
      console.log('on clone----', clone);
    } catch (e) {
      console.log('eclone----', e);
    }
  };
  const mkdir = async () => {
    try {
      await promises.mkdir(repoFolder);
    } catch (err) {
      console.log('emkdir----', err);
    }
  };
  const hashBlob = async () => {
    try {
      const { oid } = await git.hashBlob({ object: 'Hello\nWorld\n' });
      console.log('Blob----', oid);
    } catch (err) {
      console.log('ehashBlob----', err);
    }
  };
  React.useEffect(() => {
    console.log('---folder', repoFolder);
  }, []);
  return {
    git: {
      onCheckVersion,
      pullVersion,
      cloneVersion,
      mkdir,
      hashBlob,
    },
  };
};
