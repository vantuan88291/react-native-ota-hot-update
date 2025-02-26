package com.otahotupdate

import android.content.Context
import android.icu.text.SimpleDateFormat
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.jakewharton.processphoenix.ProcessPhoenix
import com.otahotupdate.OtaHotUpdate.Companion.getPackageInfo
import com.rnhotupdate.Common.CURRENT_VERSION_NAME
import com.rnhotupdate.Common.PATH
import com.rnhotupdate.Common.PREVIOUS_PATH
import com.rnhotupdate.Common.VERSION
import com.rnhotupdate.SharedPrefs
import java.io.File
import java.util.Date
import java.util.Locale
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
  private fun deleteOldBundleIfneeded(pathKey: String?): Boolean {
    val pathName = if (pathKey != null) pathKey else PREVIOUS_PATH
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    val path = sharedPrefs.getString(pathName)
    val file = File(path)
    if (file.exists() && file.isFile) {
      val isDeleted = deleteDirectory(file.parentFile)
      sharedPrefs.putString(pathName, "")
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
      val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
      var topLevelFolder: String? = null
      var bundlePath: String? = null
      ZipFile(zipFile).use { zip ->
        zip.entries().asSequence().forEach { entry ->
          zip.getInputStream(entry).use { input ->
            if (topLevelFolder == null) {
            // Get root folder of zip file after unzip
              val parts = entry.name.split("/")
              if (parts.size > 1) {
                topLevelFolder = parts.first()
              }
            }
            val outputFile = File(outputDir, entry.name)
            if (entry.isDirectory) {
              if (!outputFile.exists()) outputFile.mkdirs()
            } else {
              if (outputFile.parentFile?.exists() != true)  outputFile.parentFile?.mkdirs()
              outputFile.outputStream().use { output ->
                input.copyTo(output)
              }
              if (outputFile.absolutePath.endsWith(extension)) {
                bundlePath = outputFile.absolutePath
                return@use // Exit early if found
              }
            }
          }
        }
      }
      // Rename the detected top-level folder
      if (topLevelFolder != null) {
        val extractedFolder = File(outputDir, topLevelFolder)
        val renamedFolder = File(outputDir, "output_$timestamp")
        if (extractedFolder.exists()) {
          extractedFolder.renameTo(renamedFolder)
          // Update bundlePath if the file was inside the renamed folder
          bundlePath = bundlePath?.replace(extractedFolder.absolutePath, renamedFolder.absolutePath)
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
      val file = File(path)
      if (file.exists() && file.isFile) {
        deleteOldBundleIfneeded(null)
        val fileUnzip = extractZipFile(file, extension ?: ".bundle")
        if (fileUnzip != null) {
          file.delete()
          val sharedPrefs = SharedPrefs(reactApplicationContext)
          val oldPath = sharedPrefs.getString(PATH)
          if (!oldPath.equals("")) {
            sharedPrefs.putString(PREVIOUS_PATH, oldPath)
          }
          sharedPrefs.putString(PATH, fileUnzip)
          sharedPrefs.putString(CURRENT_VERSION_NAME, reactApplicationContext?.getPackageInfo()?.versionName)
          promise.resolve(true)
        } else {
          file.delete()
          deleteDirectory(file.parentFile)
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
    val isDeleted = deleteOldBundleIfneeded(PATH)
    val isDeletedOldPath = deleteOldBundleIfneeded(PREVIOUS_PATH)
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    sharedPrefs.putString(VERSION, "0")
    promise.resolve(isDeleted && isDeletedOldPath)
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

  @ReactMethod
  override fun setExactBundlePath(path: String?, promise: Promise) {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    sharedPrefs.putString(PATH, path)
    sharedPrefs.putString(CURRENT_VERSION_NAME, reactApplicationContext?.getPackageInfo()?.versionName)
    promise.resolve(true)
  }
  
  companion object {
    const val NAME = "OtaHotUpdate"
  }
}
