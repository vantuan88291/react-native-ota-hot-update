package com.otahotupdate

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.jakewharton.processphoenix.ProcessPhoenix
import com.otahotupdate.OtaHotUpdate.Companion.getVersionCode
import com.rnhotupdate.Common
import com.rnhotupdate.Common.CURRENT_VERSION_CODE
import com.rnhotupdate.Common.PATH
import com.rnhotupdate.Common.PREVIOUS_PATH
import com.rnhotupdate.Common.VERSION
import com.rnhotupdate.Common.PREVIOUS_VERSION
import com.rnhotupdate.Common.METADATA
import com.rnhotupdate.Common.BUNDLE_HISTORY
import com.rnhotupdate.Common.DEFAULT_MAX_BUNDLE_VERSIONS
import com.rnhotupdate.SharedPrefs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import org.json.JSONArray
import org.json.JSONObject

data class BundleVersion(
  val version: Int,
  val path: String,
  val timestamp: Long,
  val metadata: String? = null
)

class OtaHotUpdateModule internal constructor(context: ReactApplicationContext) :
  OtaHotUpdateSpec(context) {
  private val utils: Utils = Utils(context)
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

  override fun getName(): String {
    return NAME
  }

  override fun invalidate() {
    super.invalidate()
    scope.cancel()
  }

  private fun loadBundleHistory(): List<BundleVersion> {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    val historyJson = sharedPrefs.getString(BUNDLE_HISTORY)
    
    // If history exists, load it
    if (!historyJson.isNullOrEmpty()) {
      return try {
        val jsonArray = JSONArray(historyJson)
        (0 until jsonArray.length()).map { i ->
          val obj = jsonArray.getJSONObject(i)
          BundleVersion(
            version = obj.getInt("version"),
            path = obj.getString("path"),
            timestamp = obj.getLong("timestamp"),
            metadata = if (obj.has("metadata") && !obj.isNull("metadata")) obj.getString("metadata") else null
          )
        }
      } catch (e: Exception) {
        emptyList()
      }
    }
    
    // Migration: If history is empty but PATH exists, migrate from old system
    val currentPath = sharedPrefs.getString(PATH)
    val currentVersion = sharedPrefs.getString(VERSION)
    val previousPath = sharedPrefs.getString(PREVIOUS_PATH)
    val previousVersion = sharedPrefs.getString(PREVIOUS_VERSION)
    
    if (currentPath.isNullOrEmpty()) {
      return emptyList()
    }
    
    // Migrate current bundle
    val migratedHistory = mutableListOf<BundleVersion>()
    
    // Add current bundle if has version
    if (!currentVersion.isNullOrEmpty()) {
      try {
        val version = currentVersion.toInt()
        val bundleFile = File(currentPath)
        if (bundleFile.exists()) {
          migratedHistory.add(
            BundleVersion(
              version = version,
              path = currentPath,
              timestamp = bundleFile.lastModified(), // Use file modification time
              metadata = null
            )
          )
        }
      } catch (e: Exception) {
        // Version is not a number, skip
      }
    }
    
    // Add previous bundle if exists
    if (!previousPath.isNullOrEmpty() && !previousVersion.isNullOrEmpty()) {
      try {
        val version = previousVersion.toInt()
        val bundleFile = File(previousPath)
        if (bundleFile.exists()) {
          migratedHistory.add(
            BundleVersion(
              version = version,
              path = previousPath,
              timestamp = bundleFile.lastModified(),
              metadata = null
            )
          )
        }
      } catch (e: Exception) {
        // Version is not a number, skip
      }
    }
    
    // Save migrated history if any
    if (migratedHistory.isNotEmpty()) {
      saveBundleHistory(migratedHistory.sortedByDescending { it.version })
    }
    
    return migratedHistory.sortedByDescending { it.version }
  }

  private fun saveBundleHistory(history: List<BundleVersion>) {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    val jsonArray = JSONArray()
    history.forEach { bundle ->
      val obj = JSONObject()
      obj.put("version", bundle.version)
      obj.put("path", bundle.path)
      obj.put("timestamp", bundle.timestamp)
      if (bundle.metadata != null) {
        obj.put("metadata", bundle.metadata)
      } else {
        obj.put("metadata", JSONObject.NULL)
      }
      jsonArray.put(obj)
    }
    sharedPrefs.putString(BUNDLE_HISTORY, jsonArray.toString())
  }

  private fun extractFolderName(path: String): String {
    val file = File(path)
    return file.parentFile?.name ?: ""
  }

  private fun saveBundleVersion(
    newPath: String,
    version: Int,
    maxVersions: Int,
    metadata: String?
  ) {
    val sharedPrefs = SharedPrefs(reactApplicationContext)
    val history = loadBundleHistory()

    // Add new version
    val newBundle = BundleVersion(
      version = version,
      path = newPath,
      timestamp = System.currentTimeMillis(),
      metadata = metadata
    )

    // Combine and sort by version descending
    val updatedHistory = (listOf(newBundle) + history)
      .sortedByDescending { it.version }
      .distinctBy { it.version } // Remove duplicates by version

    // Keep only maxVersions most recent
    val finalHistory = updatedHistory.take(maxVersions)

    // Delete old versions beyond limit
    val versionsToKeep = finalHistory.map { it.version }.toSet()
    updatedHistory.forEach { bundle ->
      if (bundle.version !in versionsToKeep) {
        utils.deleteOldBundleIfneeded(bundle.path)
      }
    }

    // Save updated history
    saveBundleHistory(finalHistory)

    // Set current path
    sharedPrefs.putString(PATH, newPath)
    sharedPrefs.putString(VERSION, version.toString())
  }

  private fun processBundleFile(path: String?, extension: String?, version: Int?, maxVersions: Int?, metadata: String?): Boolean {
    if (path != null) {
      val file = File(path)
      if (file.exists() && file.isFile) {
        val fileUnzip = utils.extractZipFile(file, extension ?: ".bundle", version)
        if (fileUnzip != null) {
          file.delete()
          utils.deleteOldBundleIfneeded(null)
          val sharedPrefs = SharedPrefs(reactApplicationContext)
          val oldPath = sharedPrefs.getString(PATH)
          
          // If version is provided, save to history system
          if (version != null) {
            val maxVersionsToKeep = maxVersions ?: Common.DEFAULT_MAX_BUNDLE_VERSIONS
            saveBundleVersion(fileUnzip, version, maxVersionsToKeep, metadata)
          } else {
            // No version (e.g., Git update) - just set path, no history
            sharedPrefs.putString(PATH, fileUnzip)
          }
          
          sharedPrefs.putString(
            CURRENT_VERSION_CODE,
            reactApplicationContext.getVersionCode()
          )
          return true
        } else {
          file.delete()
          throw Exception("File unzip failed or path is invalid: $file")
        }
      } else {
        throw Exception("File not exist: $file")
      }
    } else {
      throw Exception("Invalid path: $path")
    }
  }
  @ReactMethod
  override fun setupBundlePath(path: String?, extension: String?, version: Double?, maxVersions: Double?, metadata: String?, promise: Promise) {
    scope.launch {
      try {
        val versionInt = version?.toInt()
        val maxVersionsInt = maxVersions?.toInt()
        val result = processBundleFile(path, extension, versionInt, maxVersionsInt, metadata)
        withContext(Dispatchers.Main) {
          promise.resolve(result)
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          promise.reject("SET_ERROR", e)
        }
      }
    }
  }

  @ReactMethod
  override fun deleteBundle(i: Double, promise: Promise) {
    scope.launch {
      try {
        val sharedPrefs = SharedPrefs(reactApplicationContext)
        val currentPath = sharedPrefs.getString(PATH)
        
        // Delete current bundle from file system
        val isDeleted = utils.deleteOldBundleIfneeded(PATH)
        
        // Remove current bundle from history if exists
        if (currentPath != null && currentPath.isNotEmpty()) {
          val history = loadBundleHistory()
          val updatedHistory = history.filter { it.path != currentPath }
          saveBundleHistory(updatedHistory)
        }
        
        // Clear paths and version (no longer clear PREVIOUS_PATH, use history instead)
        sharedPrefs.putString(PATH, "")
        sharedPrefs.putString(VERSION, "0")
        
        withContext(Dispatchers.Main) {
          promise.resolve(isDeleted)
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          promise.reject("DELETE_BUNDLE_ERROR", e)
        }
      }
    }
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
    // No longer save PREVIOUS_VERSION, use history instead
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
    val file = File(path)
    if (file.exists() && file.isFile) {
      val sharedPrefs = SharedPrefs(reactApplicationContext)
      sharedPrefs.putString(PATH, path)
      sharedPrefs.putString(
        CURRENT_VERSION_CODE,
        reactApplicationContext.getVersionCode()
      )
      promise.resolve(true)
    } else {
      promise.resolve(false)
    }
  }

  @ReactMethod
  override fun rollbackToPreviousBundle(a: Double, promise: Promise) {
    scope.launch {
      try {
        val sharedPrefs = SharedPrefs(reactApplicationContext)
        val currentPath = sharedPrefs.getString(PATH)

        // Use history to find previous version (closest to current)
        val history = loadBundleHistory()
        if (history.isNotEmpty() && currentPath != null && currentPath.isNotEmpty()) {
          // Find current bundle in history
          val currentBundle = history.find { it.path == currentPath }
          if (currentBundle != null) {
            // Find previous version (version < current, max version = closest to current)
            val previousBundle = history
              .filter { it.version < currentBundle.version }
              .maxByOrNull { it.version }

            if (previousBundle != null && File(previousBundle.path).exists()) {
              // Rollback to previous bundle from history
              val isDeleted = utils.deleteOldBundleIfneeded(PATH)
              if (isDeleted) {
                sharedPrefs.putString(PATH, previousBundle.path)
                sharedPrefs.putString(VERSION, previousBundle.version.toString())
                
                withContext(Dispatchers.Main) {
                  promise.resolve(true)
                }
                return@launch
              }
            }
          }
        }

        withContext(Dispatchers.Main) {
          promise.resolve(false)
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          promise.reject("ROLLBACK_ERROR", e)
        }
      }
    }
  }

  @ReactMethod
  override fun getBundleList(a: Double, promise: Promise) {
    scope.launch {
      try {
        val history = loadBundleHistory()
        val sharedPrefs = SharedPrefs(reactApplicationContext)
        val activePath = sharedPrefs.getString(PATH)

        val bundleList = history.map { bundle ->
          val folderName = extractFolderName(bundle.path)
          val bundleObj = JSONObject()
          bundleObj.put("id", folderName)
          bundleObj.put("version", bundle.version)
          bundleObj.put("date", bundle.timestamp)
          bundleObj.put("path", bundle.path)
          bundleObj.put("isActive", bundle.path == activePath)
          if (bundle.metadata != null) {
            try {
              // Try to parse as JSON, if fails use as string
              val metadataJson = JSONObject(bundle.metadata)
              bundleObj.put("metadata", metadataJson)
            } catch (e: Exception) {
              bundleObj.put("metadata", bundle.metadata)
            }
          } else {
            bundleObj.put("metadata", JSONObject.NULL)
          }
          bundleObj
        }

        val jsonArray = JSONArray()
        bundleList.forEach { jsonArray.put(it) }

        withContext(Dispatchers.Main) {
          promise.resolve(jsonArray.toString())
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          promise.reject("GET_BUNDLE_LIST_ERROR", e)
        }
      }
    }
  }

  @ReactMethod
  override fun deleteBundleById(id: String, promise: Promise) {
    scope.launch {
      try {
        val history = loadBundleHistory()
        val sharedPrefs = SharedPrefs(reactApplicationContext)
        val activePath = sharedPrefs.getString(PATH)

        val bundleToDelete = history.find { extractFolderName(it.path) == id }
        if (bundleToDelete == null) {
          withContext(Dispatchers.Main) {
            promise.resolve(false)
          }
          return@launch
        }

        // If deleting active bundle, rollback to oldest remaining bundle or clear
        if (bundleToDelete.path == activePath) {
          val remainingBundles = history.filter { it.path != bundleToDelete.path }
          if (remainingBundles.isNotEmpty()) {
            val oldestBundle = remainingBundles.minByOrNull { it.version }
            if (oldestBundle != null) {
              sharedPrefs.putString(PATH, oldestBundle.path)
              sharedPrefs.putString(VERSION, oldestBundle.version.toString())
            } else {
              sharedPrefs.putString(PATH, "")
              sharedPrefs.putString(VERSION, "")
            }
          } else {
            sharedPrefs.putString(PATH, "")
            sharedPrefs.putString(VERSION, "")
          }
        }

        // Delete bundle folder
        val isDeleted = utils.deleteOldBundleIfneeded(bundleToDelete.path)

        // Remove from history
        val updatedHistory = history.filter { it.path != bundleToDelete.path }
        saveBundleHistory(updatedHistory)

        withContext(Dispatchers.Main) {
          promise.resolve(isDeleted)
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          promise.reject("DELETE_BUNDLE_ERROR", e)
        }
      }
    }
  }

  @ReactMethod
  override fun clearAllBundles(a: Double, promise: Promise) {
    scope.launch {
      try {
        val history = loadBundleHistory()
        val sharedPrefs = SharedPrefs(reactApplicationContext)

        // Delete all bundle folders
        history.forEach { bundle ->
          utils.deleteOldBundleIfneeded(bundle.path)
        }

        // Clear history
        saveBundleHistory(emptyList())

        // Clear current path and version
        sharedPrefs.putString(PATH, "")
        sharedPrefs.putString(VERSION, "")

        withContext(Dispatchers.Main) {
          promise.resolve(true)
        }
      } catch (e: Exception) {
        withContext(Dispatchers.Main) {
          promise.reject("CLEAR_ALL_BUNDLES_ERROR", e)
        }
      }
    }
  }

  companion object {
    const val NAME = "OtaHotUpdate"
  }
}
