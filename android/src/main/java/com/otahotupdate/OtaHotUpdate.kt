package com.otahotupdate

import android.content.Context
import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.rnhotupdate.Common.DEFAULT_BUNDLE
import com.rnhotupdate.Common.PATH
import com.rnhotupdate.SharedPrefs


class OtaHotUpdate(context: Context?) : TurboReactPackage() {
  init {
    mContext = context
  }
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
    private var mContext: Context? = null
    val bundleJS: String
      get() {
        if (mContext == null) {
          return DEFAULT_BUNDLE
        }
        val sharedPrefs = SharedPrefs(mContext!!)
        val pathBundle = sharedPrefs.getString(PATH)
        if (pathBundle == "") {
          return DEFAULT_BUNDLE
        }
        return pathBundle!!
      }
  }
}
