import {
  Platform,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
export const downloadBundleFile = async (uri: string, headers?: object) => {
  const res = await  ReactNativeBlobUtil
    .config({
      fileCache: Platform.OS === 'android',
    })
    .fetch('GET', uri, {
      ...headers,
    });
  return res.path();
};
