package com.otahotupdate

import android.content.Context
import android.content.Intent
import android.os.Process
import com.jakewharton.processphoenix.ProcessPhoenix

/**
 * Restart the app process without ever throwing.
 *
 * ProcessPhoenix.triggerRebirth() dereferences the context it receives, so a null
 * (or already detached) context crashes the app instead of restarting it. It also
 * NPEs when PackageManager has no launch intent for the package, which happens on
 * some OEM builds / work profiles.
 */
internal object AppRestarter {

  fun restart(context: Context?) {
    val safeContext = context?.applicationContext ?: context ?: return
    try {
      ProcessPhoenix.triggerRebirth(safeContext)
    } catch (e: Throwable) {
      fallbackRestart(safeContext)
    }
  }

  private fun fallbackRestart(context: Context) {
    val launchIntent = try {
      context.packageManager?.getLaunchIntentForPackage(context.packageName)
    } catch (e: Throwable) {
      null
    }

    if (launchIntent == null) {
      // Nothing to relaunch into - leave the app alive rather than killing it blindly.
      return
    }

    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
    try {
      context.startActivity(launchIntent)
    } catch (e: Throwable) {
      return
    }
    Process.killProcess(Process.myPid())
  }
}
