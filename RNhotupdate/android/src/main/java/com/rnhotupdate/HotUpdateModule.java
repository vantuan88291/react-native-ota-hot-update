package com.rnhotupdate;

import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import android.os.Process;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import androidx.annotation.NonNull;
public class HotUpdateModule extends ReactContextBaseJavaModule {
    public HotUpdateModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    private boolean deleteDirectory(File directory) {
        if (directory.isDirectory()) {
            // List all files and directories in the current directory
            File[] files = directory.listFiles();
            if (files != null) {
                // Recursively delete all files and directories
                for (File file : files) {
                    if (!deleteDirectory(file)) {
                        return false;
                    }
                }
            }
        }
        // Finally, delete the empty directory or file
        return directory.delete();
    }
    private boolean deleteOldBundleIfneeded() {
        SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
        String path = sharedPrefs.getString(Common.INSTANCE.getPATH());
        File file = new File(path);
        if (file.exists() && file.isFile()) {
            boolean isDeleted = deleteDirectory(file.getParentFile());
            sharedPrefs.clear();
            return isDeleted;
        } else {
            return false;
        }
    }
    private String unzip(File zipFile) {
        File destDir = zipFile.getParentFile(); // Directory of the zip file

        String bundleFilePath = null;
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
                if (newFile.getAbsolutePath().contains(".bundle")) {
                    bundleFilePath = newFile.getAbsolutePath();
                }
            }
            zis.closeEntry();
        } catch (Exception e) {
            return null;
        }
        return bundleFilePath;
    }

    @ReactMethod
    public void setupBundlePath(String path, Promise promise) {
        if (path != null) {
            deleteOldBundleIfneeded();
            File file = new File(path);
            if (file.exists() && file.isFile()) {
                String fileUnzip = unzip(file);
                Log.d("setupBundlePath: ", fileUnzip);
                if (fileUnzip != null) {
                    file.delete();
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
        SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
        sharedPrefs.putString(Common.INSTANCE.getVERSION(), "0");
        promise.resolve(isDeleted);
    }
    @ReactMethod
    public void restart() {
        Context context = getCurrentActivity();
        Intent intent = context.getPackageManager()
                .getLaunchIntentForPackage(context.getPackageName());
        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP |
                    Intent.FLAG_ACTIVITY_NEW_TASK |
                    Intent.FLAG_ACTIVITY_CLEAR_TASK);

            context.startActivity(intent);
            Process.killProcess(Process.myPid());
            System.exit(0);
        }
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
