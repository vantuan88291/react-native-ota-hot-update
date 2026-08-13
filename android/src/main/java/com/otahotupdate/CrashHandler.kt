package com.otahotupdate

import android.content.Context
import android.widget.Toast
import com.facebook.react.bridge.UiThreadUtil
import com.rnhotupdate.Common.PATH
import com.rnhotupdate.Common.VERSION
import com.rnhotupdate.Common.BUNDLE_HISTORY
import com.rnhotupdate.SharedPrefs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.io.File

class CrashHandler(private val context: Context) : Thread.UncaughtExceptionHandler {
  private val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
  private val utils: Utils = Utils(context)
  private var beginning = true
  init {
    GlobalScope.launch(Dispatchers.IO) {
      delay(2000)
      beginning = false
    }
  }
  override fun uncaughtException(thread: Thread, throwable: Throwable) {
    if (beginning) {
      val sharedPrefs = SharedPrefs(context)
      val currentPath = sharedPrefs.getString(PATH)

      // Try to rollback using history system
      val historyJson = sharedPrefs.getString(BUNDLE_HISTORY)
      var rolledBack = false

      if (!historyJson.isNullOrEmpty() && !currentPath.isNullOrEmpty()) {
        try {
          val jsonArray = JSONArray(historyJson)
          val history = (0 until jsonArray.length()).map { i ->
            val obj = jsonArray.getJSONObject(i)
            Pair(obj.getInt("version"), obj.getString("path"))
          }.sortedByDescending { it.first }

          val currentBundle = history.find { it.second == currentPath }
          if (currentBundle != null) {
            val previousBundle = history
              .filter { it.first < currentBundle.first }
              .maxByOrNull { it.first }

            if (previousBundle != null && File(previousBundle.second).exists()) {
              val isDeleted = utils.deleteOldBundleIfneeded(PATH)
              if (isDeleted) {
                sharedPrefs.putString(PATH, previousBundle.second)
                sharedPrefs.putString(VERSION, previousBundle.first.toString())
                rolledBack = true
              }
            }
          }
        } catch (e: Exception) {
          // ignore, fall through to clear path
        }
      }

      if (!rolledBack) {
        sharedPrefs.putString(PATH, "")
      }

      val errorMessage = throwable.message ?: "Unknown error occurred"
      // uncaughtException can run on any thread, and Toast needs a Looper.
      try {
        UiThreadUtil.runOnUiThread {
          try {
            Toast.makeText(context, "Update failed: $errorMessage", Toast.LENGTH_LONG).show()
          } catch (e: Throwable) {
            // ignore, restarting matters more than the toast
          }
        }
      } catch (e: Throwable) {
        // ignore
      }
      // Stay off the main looper here: when the crash happened on the main thread
      // its loop is already unwinding and a posted restart would never run.
      GlobalScope.launch(Dispatchers.IO) {
        delay(1500)
        AppRestarter.restart(context)
      }
    } else {
      defaultHandler?.uncaughtException(thread, throwable)
    }
  }
}
