package com.rnhotupdate;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
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
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
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
    private boolean deleteOldBundleIfneeded(String pathKey) {
        String pathName = pathKey != null ? pathKey : Common.INSTANCE.getPREVIOUS_PATH();
        SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
        String path = sharedPrefs.getString(pathName);
        File file = new File(path);
        if (file.exists() && file.isFile()) {
            boolean isDeleted = deleteDirectory(file.getParentFile());
            sharedPrefs.putString(pathName, "");
            return isDeleted;
        } else {
            return false;
        }
    }
    private String unzip(File zipFile, String extension) {
        File destDir = zipFile.getParentFile(); // Directory of the zip file
        String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String topLevelFolder = null;
        String bundleFilePath = null;
        if (!destDir.exists()) {
            destDir.mkdirs();
        }

        try (InputStream is = new FileInputStream(zipFile);
             ZipInputStream zis = new ZipInputStream(is)) {

            ZipEntry zipEntry;
            while ((zipEntry = zis.getNextEntry()) != null) {
                File newFile = new File(destDir, zipEntry.getName());
                if (topLevelFolder == null) {
                    String[] parts = zipEntry.getName().split("/");
                    if (parts.length > 1) {
                        topLevelFolder = parts[0];
                    }
                }
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
                if (newFile.getAbsolutePath().contains(extension)) {
                    bundleFilePath = newFile.getAbsolutePath();
                }
            }
            zis.closeEntry();
        } catch (Exception e) {
            return null;
        }
        if (topLevelFolder != null) {
            File extractedFolder = new File(destDir, topLevelFolder);
            File renameFolder = new File(destDir, "output_" + timestamp);
            if (extractedFolder.exists()) {
                extractedFolder.renameTo(renameFolder);
                bundleFilePath = bundleFilePath.replace(extractedFolder.getAbsolutePath(), renameFolder.getAbsolutePath());
            }
        }
        return bundleFilePath;
    }

    @ReactMethod
    public void setupBundlePath(String path, String extension, Promise promise) {
        if (path != null) {
            File file = new File(path);
            if (file.exists() && file.isFile()) {
                deleteOldBundleIfneeded(null);
                String fileUnzip = unzip(file, extension != null ? extension : ".bundle");
                if (fileUnzip != null) {
                    Log.d("setupBundlePath: ", fileUnzip);
                    file.delete();
                    SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
                    String oldPath = sharedPrefs.getString(Common.INSTANCE.getPATH());
                    if (!oldPath.equals("")) {
                        sharedPrefs.putString(Common.INSTANCE.getPREVIOUS_PATH(), oldPath);
                    }
                    sharedPrefs.putString(Common.INSTANCE.getPATH(), fileUnzip);
                    PackageInfo info = OtaHotUpdate.packageInfo(getReactApplicationContext());
                    String latestVer = null;
                    if (info != null) {
                        latestVer = info.versionName;
                    }
                    sharedPrefs.putString(Common.INSTANCE.getCURRENT_VERSION_NAME(), latestVer);
                    promise.resolve(true);
                } else {
                    file.delete();
                    deleteDirectory(file.getParentFile());
                    SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
                    sharedPrefs.putString(Common.INSTANCE.getPATH(), "");
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
        boolean isDeleted = deleteOldBundleIfneeded(null);
        boolean isDeletedOld = deleteOldBundleIfneeded(Common.INSTANCE.getPATH());
        SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
        sharedPrefs.putString(Common.INSTANCE.getVERSION(), "0");
        promise.resolve(isDeleted && isDeletedOld);
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
    public void rollbackToPreviousBundle(Promise promise) {
        SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
        String oldPath = sharedPrefs.getString(Common.INSTANCE.getPREVIOUS_PATH());
        if (!oldPath.equals("")) {
            boolean isDeleted = deleteOldBundleIfneeded(Common.INSTANCE.getPATH());
            if (isDeleted) {
                sharedPrefs.putString(Common.INSTANCE.getPATH(), oldPath);
                sharedPrefs.putString(Common.INSTANCE.getPREVIOUS_PATH(), "");
                promise.resolve(true);
            } else {
                promise.resolve(false);
            }
        } else {
            promise.resolve(false);
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

    @ReactMethod
    public void setExactBundlePath(String path, Promise promise) {
        SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
        sharedPrefs.putString(Common.INSTANCE.getPATH(), path);
        PackageInfo info = OtaHotUpdate.packageInfo(getReactApplicationContext());
        String latestVer = null;
        if (info != null) {
            latestVer = info.versionName;
        }
        sharedPrefs.putString(Common.INSTANCE.getCURRENT_VERSION_NAME(), latestVer);
        promise.resolve(true);
    }

    @NonNull
    @Override
    public String getName() {
        return "RNhotupdate";
    }
}
