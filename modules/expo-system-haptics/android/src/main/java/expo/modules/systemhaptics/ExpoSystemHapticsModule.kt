package expo.modules.systemhaptics

import android.content.Context
import android.content.SharedPreferences
import android.media.audiofx.HapticGenerator
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Switch for the system haptic generator that the patched react-native-queue-player
 * runs against its audio sessions. The two sides talk through the preferences file
 * [PREFS]: this module writes [KEY_ENABLED] and reads back [KEY_STATUS].
 */
class ExpoSystemHapticsModule : Module() {
  private val prefs: SharedPreferences?
    get() = appContext.reactContext?.applicationContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  override fun definition() = ModuleDefinition {
    Name("ExpoSystemHaptics")

    Function("isAvailable") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && HapticGenerator.isAvailable()
    }

    Function("setEnabled") { enabled: Boolean ->
      prefs?.edit()?.putBoolean(KEY_ENABLED, enabled)?.apply()
    }

    Function("getStatus") {
      prefs?.getString(KEY_STATUS, "off") ?: "off"
    }
  }

  private companion object {
    const val PREFS = "musicode_system_haptics"
    const val KEY_ENABLED = "enabled"
    const val KEY_STATUS = "status"
  }
}
