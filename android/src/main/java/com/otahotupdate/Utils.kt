package com.otahotupdate

import android.content.Context
import android.icu.text.SimpleDateFormat
import com.rnhotupdate.Common.PREVIOUS_PATH
import com.rnhotupdate.SharedPrefs
import java.io.File
import java.util.Date
import java.util.Locale
import java.util.zip.ZipFile

class Utils internal constructor(private val context: Context) {

  fun deleteDirectory(directory: File): Boolean {
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
  fun deleteOldBundleIfneeded(pathKey: String?): Boolean {
    val pathName = if (pathKey != null) pathKey else PREVIOUS_PATH
    val sharedPrefs = SharedPrefs(context)
    val path = sharedPrefs.getString(pathName)
    if (!path.isNullOrEmpty()) {
      val file = File(path)
      if (file.exists() && file.isFile) {
        val isDeleted = deleteDirectory(file.parentFile)
        sharedPrefs.putString(pathName, "")
        return isDeleted
      }
    }
    return false
  }

  fun extractZipFile(
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
}
