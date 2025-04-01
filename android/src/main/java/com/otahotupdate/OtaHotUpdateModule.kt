package com.otahotupdate

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.jakewharton.processphoenix.ProcessPhoenix
import com.otahotupdate.OtaHotUpdate.Companion.getPackageInfo
import com.rnhotupdate.Common.CURRENT_VERSION_NAME
import com.rnhotupdate.Common.PATH
import com.rnhotupdate.Common.PREVIOUS_PATH
import com.rnhotupdate.Common.VERSION
import com.rnhotupdate.Common.METADATA
import com.rnhotupdate.SharedPrefs
import java.io.File

class OtaHotUpdateModule internal constructor(context: ReactApplicationContext) :
  OtaHotUpdateSpec(context) {
  private val utils: Utils = Utils(context)
  override fun getName(): String {
    return NAME
  }


  @ReactMethod
  override fun setupBundlePath(path: String?, extension: String?, promise: Promise) {
    if (path != null) {
      val file = File(path)
      if (file.exists() && file.isFile) {
        utils.deleteOldBundleIfneeded(null)
        val fileUnzip = utils.extractZipFile(file, extension ?: ".bundle")
        if (fileUnzip != null) {
          file.delete()
          val sharedPrefs = SharedPrefs(reactApplicationContext)
          val oldPath = sharedPrefs.getString(PATH)
          if (!oldPath.equals("")) {
            sharedPrefs.putString(PREVIOUS_PATH, oldPath)
          }
          sharedPrefs.putString(PATH, fileUnzip)
          sharedPrefs.putString(
            CURRENT_VERSION_NAME,
            reactApplicationContext?.getPackageInfo()?.versionName
          )
          promise.resolve(true)
        } else {
          file.delete()
          utils.deleteDirectory(file.parentFile)
          val sharedPrefs = SharedPrefs(reactApplicationContext)
          sharedPrefs.putString(PATH, "")
          promise.resolve(false)
        }
      } else {
        promise.resolve(false)
      }
    } else {
      promise.resolve(false)
    }
  }

  @ReactMethod
  override fun deleteBundle(i: Double, promise: Promise) {
    val isDeleted = utils.deleteOldBundleIfneeded(PATH)
    val isDeletedOldPath = utils.deleteOldBundleIfneeded(PREVIOUS_PATH)
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    sharedPrefs.putString(VERSION, "0")
    promise.resolve(isDeleted && isDeletedOldPath)
  }

  @ReactMethod
  override fun restart() {
    val context: Context? = currentActivity
    ProcessPhoenix.triggerRebirth(context)
  }

  @ReactMethod
  override fun getCurrentVersion(a: Double, promise: Promise) {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    val version = sharedPrefs.getString(VERSION)
    if (version != "") {
      promise.resolve(version)
    } else {
      promise.resolve("0")
    }
  }

  @ReactMethod
  override fun setCurrentVersion(version: String?, promise: Promise) {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    sharedPrefs.putString(VERSION, version)
    promise.resolve(true)
  }

  @ReactMethod
  override fun getUpdateMetadata(a: Double, promise: Promise) {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    val metadata = sharedPrefs.getString(METADATA)
    if (metadata != "") {
        promise.resolve(metadata);
    } else {
        promise.resolve(null);
    }
  }

  @ReactMethod
  override fun setUpdateMetadata(metadata: String?, promise: Promise) {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    sharedPrefs.putString(METADATA, metadata)
    promise.resolve(true)
  }


  @ReactMethod
  override fun setExactBundlePath(path: String?, promise: Promise) {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    sharedPrefs.putString(PATH, path)
    sharedPrefs.putString(
      CURRENT_VERSION_NAME,
      reactApplicationContext?.getPackageInfo()?.versionName
    )
    promise.resolve(true)
  }

  @ReactMethod
  override fun rollbackToPreviousBundle(a: Double, promise: Promise) {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    val oldPath = sharedPrefs.getString(PREVIOUS_PATH)
    if (oldPath != "") {
      val isDeleted = utils.deleteOldBundleIfneeded(PATH)
      if (isDeleted) {
        sharedPrefs.putString(PATH, oldPath)
        sharedPrefs.putString(PREVIOUS_PATH, "")
        promise.resolve(true)
      } else {
        promise.resolve(false)
      }
    } else {
      promise.resolve(false)
    }
  }
  companion object {
    const val NAME = "OtaHotUpdate"
  }
}
