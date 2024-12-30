package com.rnhotupdate;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;

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
    public static PackageInfo packageInfo (Context context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                return context.getPackageManager().getPackageInfo(context.getPackageName(), PackageManager.PackageInfoFlags.of(0));
            } else {
                return context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            }
        } catch (Exception e) {
            return null;
        }
    }
    public static String getBundleJS() {
        if (mContext == null) {
            return Common.INSTANCE.getDEFAULT_BUNDLE();
        }
        SharedPrefs sharedPrefs = new SharedPrefs(mContext);
        PackageInfo info = OtaHotUpdate.packageInfo(mContext);
        String latestVer = null;
        if (info != null) {
            latestVer = info.versionName;
        }
        String pathBundle = sharedPrefs.getString(Common.INSTANCE.getPATH());
        String currentVer = sharedPrefs.getString(Common.INSTANCE.getCURRENT_VERSION_NAME());
        if (pathBundle.equals("") || (info != null && !currentVer.equals("") && !latestVer.equals(currentVer))) {
            return Common.INSTANCE.getDEFAULT_BUNDLE();
        }
        return pathBundle;
    }
}
