# Hot Update via Git

This feature allows you to use a Git repository to host your bundle files. The mobile application will pull only the changes from the Git repository instead of downloading the entire bundle file from a server. This reduces data usage and improves update speed.


iOS GIF             | Android GIF
:-------------------------:|:-------------------------:
<img src="./iosgit.gif" title="iOS GIF" width="250"> | <img src="./androidgithotupdate.gif" title="Android GIF" width="250">

Can see the demo video here:

https://drive.google.com/file/d/1P3usN7cbBlboJ5pH211m9BKZyVusMQw5/view?usp=sharing

## Supported Platforms
Currently, this feature supports the following Git hosting platforms:
- GitHub
- GitLab
- Bitbucket

## Installation
If you want to use git control, you may need install `react-native-fs`

`yarn add react-native-fs`

## Setting Up a Git Repository for Hot Update

### Step 1: Create a Git Repository
1. Log in to your Git hosting service (e.g., GitHub, GitLab, Bitbucket).
2. Create a new repository to host your bundle files. For example, name it `OTA-bundle`.
3. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/<your-username>/OTA-bundle.git
   ```

### Step 2: Add Bundle Files to the Repository
1. Generate your bundle files using the React Native CLI or Expo.

- For react native CLI:
```bash
"scripts": {
  "export-android": "mkdir -p android/output && react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/output/index.android.bundle --assets-dest android/output",
  "export-ios": "mkdir -p ios/output && react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/output/main.jsbundle --assets-dest ios/output"
}
```
- For expo / expo bare project:

```bash
"scripts": {
  "export-android": "mkdir -p android/output && npx expo export:embed --platform android --entry-file node_modules/expo/AppEntry.js --bundle-output android/output/index.android.bundle --dev false  --assets-dest android/output",
  "export-ios": "mkdir -p ios/output && npx expo export:embed --platform ios --entry-file node_modules/expo/AppEntry.js --bundle-output ios/output/main.jsbundle --dev false  --assets-dest ios/output"
}
```
For expo you might need check path of `--entry-file node_modules/expo/AppEntry.js`, get it from package.json / main

2. Copy `android/output` / `ios/output` folder into the cloned repository directory.
3. Commit and push the changes to your Git repository:
   ```bash
   git add .
   git commit -m "Initial commit with bundle files"
   git push origin main
   ```

### Step 3: Organize Branches for Platforms
- Create separate branches for iOS and Android updates (optional but recommended):
   ```bash
   git checkout -b iOS
   git push origin iOS

   git checkout -b android
   git push origin android
   ```
- Maintain platform-specific bundle files in their respective branches.

## Example Implementation

Here is a complete example of how to implement the hot update via Git:

```typescript
const onCheckGitVersion = () => {
  hotUpdate.git.checkForGitUpdate({
    branch: Platform.OS === 'ios' ? 'iOS' : 'android',
    bundlePath:
      Platform.OS === 'ios'
        ? 'output/main.jsbundle'
        : 'output/index.android.bundle',
    url: 'https://github.com/<your-username>/OTA-bundle.git',
    onCloneFailed(msg: string) {
      Alert.alert('Clone project failed!', msg, [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ]);
    },
    onCloneSuccess() {
      Alert.alert('Clone project success!', 'Restart to apply the changes', [
        {
          text: 'OK',
          onPress: () => hotUpdate.resetApp(),
        },
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ]);
    },
    onPullFailed(msg: string) {
      Alert.alert('Pull project failed!', msg, [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ]);
    },
    onPullSuccess() {
      Alert.alert('Pull project success!', 'Restart to apply the changes', [
        {
          text: 'OK',
          onPress: () => hotUpdate.resetApp(),
        },
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ]);
    },
    onProgress(received: number, total: number) {
      const percent = (+received / +total) * 100;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setProgress(percent);
    },
    onFinishProgress() {
      setLoading(false);
    },
  });
};
```

## Key Options

| Key                   | Required | Type       | Description                                                                                   |
| --------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------- |
| `restartAfterInstall` | No       | `boolean`  | Default is `false`. If `true`, the app will restart automatically after applying the changes. |
| `branch`              | Yes      | `string`   | The Git branch to pull updates from (e.g., `iOS` or `android`).                               |
| `bundlePath`          | Yes      | `string`   | The relative path to the bundle file within the repository.                                   |
| `url`                 | Yes      | `string`   | The URL of the Git repository hosting the bundle files.                                       |
| `onCloneFailed`       | No       | `Callback` | Triggered if the cloning process fails. Receives an error message as an argument.             |
| `onCloneSuccess`      | No       | `Callback` | Triggered when the cloning process is successful.                                             |
| `onPullFailed`        | No       | `Callback` | Triggered if the pull process fails. Receives an error message as an argument.                |
| `onPullSuccess`       | No       | `Callback` | Triggered when the pull process is successful.                                                |
| `onProgress`          | No       | `Callback` | A callback that provides download progress updates (received bytes and total bytes).          |
| `onFinishProgress`    | No       | `Callback` | Triggered when the download progress is complete.                                             |

## Explanation of Workflow

1. **Clone in the first time**: The app will check if repository in local not exist, app will clone repo in the first time, this may take time depend on your project size.
2. **Check for Updates**: Next time you call `checkForGitUpdate` method, it will just pull the latest commit.
3. **Handle Clone/Pull Success**: If the operation is successful, you can notify the user and restart the app to apply the updates.
4. **Handle Failures**: If cloning or pulling fails, the user is notified with an appropriate error message.
5. **Track Progress**: The `onProgress` callback is used to update a progress bar or indicator to inform the user of the download status.

## Notes

- Ensure the Git repository is publicly accessible or configured with the appropriate credentials if private.
- The `bundlePath` should match the location of the bundle file within your Git repository.
- This feature is designed to work seamlessly with both iOS and Android platforms.
- There are noway to check whether have new updating, need pull first and notify user or restart the app to apply the changes, if you want check new version before pull the changes, you should design an api for that.
- Git for client we are using `isomorphic-git`, a lightweight git engine for js
