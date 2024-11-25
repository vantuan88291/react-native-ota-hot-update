package com.otahotupdate

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.jakewharton.processphoenix.ProcessPhoenix
import com.rnhotupdate.Common.PATH
import com.rnhotupdate.Common.VERSION
import com.rnhotupdate.SharedPrefs
import java.io.File
import java.util.zip.ZipFile

class OtaHotUpdateModule internal constructor(context: ReactApplicationContext) :
  OtaHotUpdateSpec(context) {

  override fun getName(): String {
    return NAME
  }

  private fun deleteDirectory(directory: File): Boolean {
    if (directory.isDirectory) {
      // List all files and directories in the current directory
      val files = directory.listFiles()
      if (files != null) {
        // Recursively delete all files and directories
        for (file in files) {
          if (!deleteDirectory(file)) {
            return false
          }
        }
      }
    }
    // Finally, delete the empty directory or file
    return directory.delete()
  }
  private fun deleteOldBundleIfneeded(): Boolean {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    val path = sharedPrefs.getString(PATH)
    val file = File(path)
    if (file.exists() && file.isFile) {
      val isDeleted = deleteDirectory(file.parentFile)
      sharedPrefs.clear()
      return isDeleted
    } else {
      return false
    }
  }
  private fun extractZipFile(
    zipFile: File,extension: String
  ): String? {
    return try {
      val outputDir = zipFile.parentFile
      var bundlePath: String? = null
      ZipFile(zipFile).use { zip ->
        zip.entries().asSequence().forEach { entry ->
          zip.getInputStream(entry).use { input ->
            if (entry.isDirectory) {
              val d = File(outputDir, entry.name)
              if (!d.exists()) d.mkdirs()
            } else {
              val f = File(outputDir, entry.name)
              if (f.parentFile?.exists() != true)  f.parentFile?.mkdirs()

              f.outputStream().use { output ->
                input.copyTo(output)
              }
              if (f.absolutePath.contains(extension)) {
                bundlePath = f.absolutePath
              }
            }
          }
        }
      }
      bundlePath
    } catch (e: Exception) {
      e.printStackTrace()
      null
    }
  }


  @ReactMethod
  override fun setupBundlePath(path: String?, extension: String?, promise: Promise) {
    if (path != null) {
      deleteOldBundleIfneeded()
      val file = File(path)
      if (file.exists() && file.isFile) {
        val fileUnzip = extractZipFile(file, extension ?: ".bundle")
        Log.d("setupBundlePath----: ", fileUnzip!!)
        if (fileUnzip != null) {
          file.delete()
          val sharedPrefs = SharedPrefs(reactApplicationContext)
          sharedPrefs.putString(PATH, fileUnzip)
          promise.resolve(true)
        } else {
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
    val isDeleted = deleteOldBundleIfneeded()
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    sharedPrefs.putString(VERSION, "0")
    promise.resolve(isDeleted)
  }

  @ReactMethod
  override fun restart() {
    val context: Context? = currentActivity
    ProcessPhoenix.triggerRebirth(context);
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
  companion object {
    const val NAME = "OtaHotUpdate"
  }
}
