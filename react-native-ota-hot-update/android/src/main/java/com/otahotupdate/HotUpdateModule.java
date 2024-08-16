package com.otahotupdate;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.io.File;

import androidx.annotation.NonNull;

public class HotUpdateModule extends ReactContextBaseJavaModule {
    public HotUpdateModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @ReactMethod
    public void multiply(int a, int b, Promise promise) {
        promise.resolve(a * b);
    }

    @ReactMethod
    public void setupBundlePath(String path, Promise promise) {
        File file = new File(path);
        if (file.exists() && file.isFile()) {
            SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
            sharedPrefs.putString(Common.INSTANCE.getPATH(), path);
            promise.resolve(true);
        } else {
            promise.reject("Path invalid", "Please use valid path of bundlejs");
        }
    }

    @ReactMethod
    public void deleteBundle(Promise promise) {
        SharedPrefs sharedPrefs = new SharedPrefs(getReactApplicationContext());
        String path = sharedPrefs.getString(Common.INSTANCE.getPATH());
        File file = new File(path);
        if (file.exists() && file.isFile()) {
            boolean isDeleted = file.delete();
            promise.resolve(isDeleted);
            sharedPrefs.clear();
        } else {
            promise.resolve(false);
        }
    }

    @NonNull
    @Override
    public String getName() {
        return "OtaHotUpdate";
    }
}
