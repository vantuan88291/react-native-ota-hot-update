package com.otahotupdate

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.rnhotupdate.Common.CURRENT_VERSION_NAME
import com.rnhotupdate.Common.DEFAULT_BUNDLE
import com.rnhotupdate.Common.PATH
import com.rnhotupdate.Common.VERSION
import com.rnhotupdate.SharedPrefs


class OtaHotUpdate : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == OtaHotUpdateModule.NAME) {
      OtaHotUpdateModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      moduleInfos[OtaHotUpdateModule.NAME] = ReactModuleInfo(
        OtaHotUpdateModule.NAME,
        OtaHotUpdateModule.NAME,
        false,  // canOverrideExistingModule
        false,  // needsEagerInit
        false,  // isCxxModule
        isTurboModule // isTurboModule
      )
      moduleInfos
    }
  }
  companion object {
    @Suppress("DEPRECATION")
    fun Context.getPackageInfo(): PackageInfo {
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        packageManager.getPackageInfo(packageName, PackageManager.PackageInfoFlags.of(0))
      } else {
        packageManager.getPackageInfo(packageName, 0)
      }
    }
    fun bundleJS(context: Context, crashHandler: Boolean = false): String {
      if (crashHandler) {
        Thread.setDefaultUncaughtExceptionHandler(CrashHandler(context))
      }
      val sharedPrefs = SharedPrefs(context)
      val pathBundle = sharedPrefs.getString(PATH)
      val version = sharedPrefs.getString(VERSION)
      val currentVersionName = sharedPrefs.getString(CURRENT_VERSION_NAME)
      if (pathBundle == "" || (currentVersionName != context.getPackageInfo().versionName)) {
        if (version != "") {
          // reset version number because bundle is wrong version, need download from new version
          sharedPrefs.putString(VERSION, "")
        }
        return DEFAULT_BUNDLE
      }
      return pathBundle!!
    }
  }
}
