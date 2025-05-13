package com.otahotupdate

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.rnhotupdate.Common.CURRENT_VERSION_CODE
import com.rnhotupdate.Common.DEFAULT_BUNDLE
import com.rnhotupdate.Common.PATH
import com.rnhotupdate.Common.VERSION
import com.rnhotupdate.SharedPrefs


class OtaHotUpdate : TurboReactPackage() {
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
        true,  // hasConstants
        false,  // isCxxModule
        isTurboModule // isTurboModule
      )
      moduleInfos
    }
  }
  companion object {
    fun Context.getVersionCode(): String {
      return when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> {
          packageManager.getPackageInfo(
            packageName,
            PackageManager.PackageInfoFlags.of(0)
          ).longVersionCode.toString()
        }
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.P -> {
          @Suppress("DEPRECATION")
          packageManager.getPackageInfo(packageName, 0).longVersionCode.toString()
        }
        else -> {
          @Suppress("DEPRECATION")
          packageManager.getPackageInfo(packageName, 0).versionCode.toString()
        }
      }
    }
    fun bundleJS(context: Context, isHandleCrash: Boolean = true): String {
      if (isHandleCrash) {
        Thread.setDefaultUncaughtExceptionHandler(CrashHandler(context))
      }
      val sharedPrefs = SharedPrefs(context)
      val pathBundle = sharedPrefs.getString(PATH)
      val version = sharedPrefs.getString(VERSION)
      val currentVersionName = sharedPrefs.getString(CURRENT_VERSION_CODE)
      if (pathBundle == "" || (currentVersionName != context.getVersionCode())) {
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
