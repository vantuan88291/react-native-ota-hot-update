package com.otahotupdate

import android.content.Context
import android.widget.Toast
import com.jakewharton.processphoenix.ProcessPhoenix
import com.rnhotupdate.Common.PATH
import com.rnhotupdate.Common.PREVIOUS_PATH
import com.rnhotupdate.SharedPrefs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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
      //begin remove and using previous bundle
      val sharedPrefs = SharedPrefs(context)
      val oldPath = sharedPrefs.getString(PREVIOUS_PATH)
      if (oldPath != "") {
        val isDeleted = utils.deleteOldBundleIfneeded(PATH)
        if (isDeleted) {
          sharedPrefs.putString(PATH, oldPath)
          sharedPrefs.putString(PREVIOUS_PATH, "")
        } else {
          sharedPrefs.putString(PATH, "")
        }
      } else {
        sharedPrefs.putString(PATH, "")
      }
      val errorMessage = throwable.message ?: "Unknown error occurred"
      Toast.makeText(context, "Update failed: $errorMessage", Toast.LENGTH_LONG).show()
      GlobalScope.launch(Dispatchers.IO) {
        delay(1500)
        ProcessPhoenix.triggerRebirth(context)
      }
    } else {
      defaultHandler?.uncaughtException(thread, throwable)
    }
  }
}

