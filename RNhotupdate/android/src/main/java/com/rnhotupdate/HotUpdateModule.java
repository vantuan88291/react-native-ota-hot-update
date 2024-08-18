package com.rnhotupdate;

import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import androidx.annotation.NonNull;

public class HotUpdateModule extends ReactContextBaseJavaModule {
    public HotUpdateModule(ReactApplicationContext reactContext) {
        super(reactContext);
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
                zis.closeEntry();
            }
        } catch (Exception e) {
            return null;
        }
        return destDir.getAbsolutePath();
    }
    @ReactMethod
    public void multiply(int a, int b, Promise promise) {
        promise.resolve(a * b);
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

    @NonNull
    @Override
    public String getName() {
        return "RNhotupdate";
    }
}
