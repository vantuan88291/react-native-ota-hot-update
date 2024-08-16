package com.otahotupdate;

import android.content.Context;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import androidx.annotation.NonNull;

public class OtaHotUpdate  implements ReactPackage {
    private static Context mContext;
    public OtaHotUpdate(Context context) {
        mContext = context;
    }
    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactApplicationContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new HotUpdateModule(reactApplicationContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactApplicationContext) {
        return Collections.emptyList();
    }
    public static String getBundleJS() {
        if (mContext == null) {
            return Common.INSTANCE.getDEFAULT_BUNDLE();
        }
        SharedPrefs sharedPrefs = new SharedPrefs(mContext);
        String pathBundle = sharedPrefs.getString(Common.INSTANCE.getPATH());
        if (pathBundle.equals("")) {
            return Common.INSTANCE.getDEFAULT_BUNDLE();
        }
        return pathBundle;
    }
}
