package com.rnhotupdate;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import androidx.annotation.NonNull;
interface ReactInstanceHolder {
    ReactInstanceManager getReactInstanceManager();
}
public class HotUpdateModule extends ReactContextBaseJavaModule {
    public HotUpdateModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }
    private LifecycleEventListener mLifecycleEventListener = null;

    private ReactInstanceManager resolveInstanceManager() throws NoSuchFieldException {
        ReactInstanceManager instanceManager = getReactInstanceManager();
        if (instanceManager != null) {
            return instanceManager;
        }

        final Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            return null;
        }

        ReactApplication reactApplication = (ReactApplication) currentActivity.getApplication();
        instanceManager = reactApplication.getReactNativeHost().getReactInstanceManager();

        return instanceManager;
    }
    private boolean deleteOldBundleIfneeded() {
        SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
        String path = sharedPrefs.getString(Common.INSTANCE.getPATH());
        File file = new File(path);
        if (file.exists() && file.isFile()) {
            boolean isDeleted = file.delete();
            sharedPrefs.clear();
            return isDeleted;
        } else {
            return false;
        }
    }
    private String unzip(File zipFile) {
        File destDir = zipFile.getParentFile(); // Directory of the zip file

        String filePathExtracted = null;
        if (!destDir.exists()) {
            destDir.mkdirs();
        }

        try (InputStream is = new FileInputStream(zipFile);
             ZipInputStream zis = new ZipInputStream(is)) {

            ZipEntry zipEntry;
            while ((zipEntry = zis.getNextEntry()) != null) {
                File newFile = new File(destDir, zipEntry.getName());
                if (zipEntry.isDirectory()) {
                    newFile.mkdirs();
                } else {
                    // Create directories if they do not exist
                    new File(newFile.getParent()).mkdirs();
                    // Extract the file
                    try (OutputStream os = new FileOutputStream(newFile)) {
                        byte[] buffer = new byte[1024];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            os.write(buffer, 0, len);
                        }
                    }
                }
                filePathExtracted = newFile.getAbsolutePath();
                zis.closeEntry();
            }
        } catch (Exception e) {
            return null;
        }
        return filePathExtracted;
    }

    @ReactMethod
    public void setupBundlePath(String path, Promise promise) {
        if (path != null) {
            File file = new File(path);
            if (file.exists() && file.isFile()) {
                String fileUnzip = unzip(file);
                Log.d("setupBundlePath: ", fileUnzip);
                if (fileUnzip != null) {
                    file.delete();
                    deleteOldBundleIfneeded();
                    SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
                    sharedPrefs.putString(Common.INSTANCE.getPATH(), fileUnzip);
                    promise.resolve(true);
                } else {
                    promise.resolve(false);
                }
            } else {
                promise.resolve(false);
            }
        } else {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void deleteBundle(Promise promise) {
        boolean isDeleted = deleteOldBundleIfneeded();
        promise.resolve(isDeleted);
    }
    private void loadBundleLegacy() {
        final Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            return;
        }

        currentActivity.runOnUiThread(() -> currentActivity.recreate());
    }
    private static ReactInstanceHolder mReactInstanceHolder;

    static ReactInstanceManager getReactInstanceManager() {
        if (mReactInstanceHolder == null) {
            return null;
        }
        return mReactInstanceHolder.getReactInstanceManager();
    }


    private void clearLifecycleEventListener() {
        if (mLifecycleEventListener != null) {
            getReactApplicationContext().removeLifecycleEventListener(mLifecycleEventListener);
            mLifecycleEventListener = null;
        }
    }

    private void loadBundle() {
        clearLifecycleEventListener();
        try {
            final ReactInstanceManager instanceManager = resolveInstanceManager();
            if (instanceManager == null) {
                return;
            }

            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    instanceManager.recreateReactContextInBackground();
                } catch (Throwable t) {
                    loadBundleLegacy();
                }
            });

        } catch (Throwable t) {
            loadBundleLegacy();
        }
    }
    @ReactMethod
    public void restart() {
        loadBundle();
    }
    @ReactMethod
    public void getCurrentVersion(Promise promise) {
        SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
        String version = sharedPrefs.getString(Common.INSTANCE.getVERSION());
        if (!version.equals("")) {
            promise.resolve(version);
        } else {
            promise.resolve("0");
        }

    }
    @ReactMethod
    public void setCurrentVersion(String version, Promise promise) {
         SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
         sharedPrefs.putString(Common.INSTANCE.getVERSION(), version);
         promise.resolve(true);
    }

    @NonNull
    @Override
    public String getName() {
        return "RNhotupdate";
    }
}
