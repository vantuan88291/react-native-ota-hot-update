import * as RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

function Err(name: string) {
  return class extends Error {
    public code = name;
    constructor(...args: any) {
      super(...args);
      if (this.message) {
        this.message = name + ': ' + this.message;
      } else {
        this.message = name;
      }
    }
  };
}

// const EEXIST = Err('EEXIST'); // <-- Unused because RNFS's mkdir never throws
const ENOENT = Err('ENOENT');
const ENOTDIR = Err('ENOTDIR');
// const ENOTEMPTY = Err('ENOTEMPTY'); // <-- Unused because RNFS's unlink is recursive by default

export const readdir = async (path: string) => {
  try {
    return await RNFS.readdir(path);
  } catch (err: any) {
    switch (err.message) {
      case 'Attempt to get length of null array': {
        throw new ENOTDIR(path);
      }
      case 'Folder does not exist': {
        throw new ENOENT(path);
      }
      default:
        throw err;
    }
  }
};

export const mkdir = async (path: string) => {
  return RNFS.mkdir(path);
};

export const readFile = async (
  path: string,
  opts?: string | { [key: string]: string }
) => {
  let encoding;

  if (typeof opts === 'string') {
    encoding = opts;
  } else if (typeof opts === 'object') {
    encoding = opts.encoding;
  }

  let result: string | Uint8Array = await RNFS.readFile(
    path,
    encoding || 'base64'
  );

  if (!encoding) {
    // @ts-ignore
    result = Buffer.from(result, 'base64');
  }

  return result;
};
export const writeFile = async (
  path: string,
  content: string | Uint8Array,
  opts?: string | { [key: string]: string }
) => {
  let encoding;

  if (typeof opts === 'string') {
    encoding = opts;
  } else if (typeof opts === 'object') {
    encoding = opts.encoding;
  }

  if (typeof content === 'string') {
    encoding = encoding || 'utf8';
  } else {
    encoding = 'base64';
    content = Buffer.from(content).toString('base64');
  }

  await RNFS.writeFile(path, content as string, encoding);
};

export const stat = async (path: string) => {
  try {
    const r = await RNFS.stat(path);
    // we monkeypatch the result with a `isSymbolicLink` method because isomorphic-git needs it.
    // Since RNFS doesn't appear to support symlinks at all, we'll just always return false.
    // @ts-ignore
    r.isSymbolicLink = () => false;
    return r;
  } catch (err: any) {
    switch (err.message) {
      case 'File does not exist': {
        throw new ENOENT(path);
      }
      default:
        throw err;
    }
  }
};

// Since there are no symbolic links, lstat and stat are equivalent
export const lstat = stat;

export const unlink = async (path: string) => {
  try {
    await RNFS.unlink(path);
  } catch (err: any) {
    switch (err.message) {
      case 'File does not exist': {
        throw new ENOENT(path);
      }
      default:
        throw err;
    }
  }
};

// RNFS doesn't have a separate rmdir method, so we can use unlink for deleting directories too
export const rmdir = unlink;

// These are optional, which is good because there is no equivalent in RNFS
export const readlink = async () => {
  throw new Error('not implemented');
};
export const symlink = async () => {
  throw new Error('not implemented');
};

// Technically we could pull this off by using `readFile` + `writeFile` with the `mode` option
// However, it's optional, because isomorphic-git will do exactly that (a readFile and a writeFile with the new mode)
export const chmod = async () => {
  throw new Error('not implemented');
};
