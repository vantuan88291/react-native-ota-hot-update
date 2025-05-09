package com.rnhotupdate

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences

class SharedPrefs internal constructor(context: Context) {
    private val mSharedPreferences: SharedPreferences =
        context.getSharedPreferences(Common.SHARED_PREFERENCE_NAME, Context.MODE_PRIVATE)

    fun getString(key: String?): String? {
        return mSharedPreferences.getString(key, "")
    }

    @SuppressLint("CommitPrefEdits")
    fun putString(key: String?, value: String?) {
        val editor = mSharedPreferences.edit()
        editor.putString(key, value)
        editor.apply()
    }

    fun clear() {
        mSharedPreferences.edit().clear().apply()
    }
}
object Common {
    val PATH = "PATH"
    val PREVIOUS_PATH = "PREVIOUS_PATH"
    val VERSION = "VERSION"
    val PREVIOUS_VERSION = "PREVIOUS_VERSION"
    val CURRENT_VERSION_CODE = "CURRENT_VERSION_CODE"
    val SHARED_PREFERENCE_NAME = "HOT-UPDATE-REACT_NATIVE"
    val DEFAULT_BUNDLE = "assets://index.android.bundle"
    val METADATA = "METADATA"
}
