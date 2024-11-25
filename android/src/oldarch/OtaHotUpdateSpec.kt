package com.otahotupdate

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise

abstract class OtaHotUpdateSpec internal constructor(context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  abstract fun setupBundlePath(path: String, extension: String?, promise: Promise)
  abstract fun deleteBundle(i: Number, promise: Promise)
  abstract fun restart()
  abstract fun getCurrentVersion(a: Number, promise: Promise)
  abstract fun setCurrentVersion(version: String, promise: Promise)
}
