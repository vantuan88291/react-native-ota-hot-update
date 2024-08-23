import {
  Platform,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
export const downloadBundleFile = async (uri: string, headers?: object, callback?: (received: string, total: string) => void) => {
  const res = await  ReactNativeBlobUtil
    .config({
      fileCache: Platform.OS === 'android',
    })
    .fetch('GET', uri, {
      ...headers,
    })
    .progress((received, total) => {
      if (callback) {
        callback(received, total)
      }
    });
  return res.path();
};
