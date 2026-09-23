package com.hituchhimpa.reactnativesecurex

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import androidx.fragment.app.FragmentActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.hardware.fingerprint.FingerprintManagerCompat
import android.content.pm.PackageManager
import android.os.Build
import java.security.KeyStore

class ReactNativeSecureXModule(reactContext: ReactApplicationContext) :
  NativeReactNativeSecureXSpec(reactContext) {

  private val cryptoEngine = CryptoEngine(reactContext)

  // --- Session State ---
  private var sessionStartTime: Long = System.currentTimeMillis()
  private var sessionTimeoutMs: Long = Long.MAX_VALUE

  // MARK: - Core Vault

  override fun audit(): WritableMap {
    val map = Arguments.createMap()
    val auditResult = SecurityEngine.audit(reactApplicationContext)
    for ((key, value) in auditResult) {
      when (value) {
        is Boolean -> map.putBoolean(key, value)
        is Int -> map.putInt(key, value)
        is Double -> map.putDouble(key, value)
        is String -> map.putString(key, value)
      }
    }
    return map
  }

  override fun encrypt(plainText: String, prompt: String, promise: Promise) {
    val activity = getReactApplicationContext().getCurrentActivity() as? FragmentActivity ?: run {
      promise.reject("ERR_ACTIVITY", "Activity is null or not a FragmentActivity"); return
    }
    cryptoEngine.encrypt(activity, plainText, prompt,
      onSuccess = { promise.resolve(it) },
      onError = { promise.reject("ERR_ENCRYPT", it) })
  }

  override fun decrypt(encryptedBase64: String, prompt: String, promise: Promise) {
    val activity = getReactApplicationContext().getCurrentActivity() as? FragmentActivity ?: run {
      promise.reject("ERR_ACTIVITY", "Activity is null or not a FragmentActivity"); return
    }
    cryptoEngine.decrypt(activity, encryptedBase64, prompt,
      onSuccess = { promise.resolve(it) },
      onError = { promise.reject("ERR_DECRYPT", it) })
  }

  private fun getSharedPreferences(): android.content.SharedPreferences {
    return reactApplicationContext.getSharedPreferences("ReactNativeSecureXStorage", android.content.Context.MODE_PRIVATE)
  }

  override fun setItem(key: String, value: String, prompt: String, promise: Promise) {
    val activity = getReactApplicationContext().getCurrentActivity() as? FragmentActivity ?: run {
      promise.reject("ERR_ACTIVITY", "Activity is null or not a FragmentActivity"); return
    }
    cryptoEngine.encrypt(activity, value, prompt,
      onSuccess = { encrypted ->
        getSharedPreferences().edit().putString(key, encrypted).apply()
        promise.resolve(true)
      },
      onError = { promise.reject("ERR_ENCRYPT", it) })
  }

  override fun getItem(key: String, prompt: String, promise: Promise) {
    val encrypted = getSharedPreferences().getString(key, null) ?: run { promise.resolve(null); return }
    val activity = getReactApplicationContext().getCurrentActivity() as? FragmentActivity ?: run {
      promise.reject("ERR_ACTIVITY", "Activity is null or not a FragmentActivity"); return
    }
    cryptoEngine.decrypt(activity, encrypted, prompt,
      onSuccess = { promise.resolve(it) },
      onError = { promise.reject("ERR_DECRYPT", it) })
  }

  override fun removeItem(key: String, promise: Promise) {
    getSharedPreferences().edit().remove(key).apply()
    promise.resolve(true)
  }

  // MARK: - Fortress

  override fun setPrivacyScreenEnabled(enabled: Boolean) {
    val activity = getReactApplicationContext().getCurrentActivity() ?: return
    activity.runOnUiThread {
      if (enabled) activity.window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)
      else activity.window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)
    }
  }

  override fun setOverlayProtectionEnabled(enabled: Boolean) {
    val activity = getReactApplicationContext().getCurrentActivity() ?: return
    activity.runOnUiThread {
      activity.window.decorView.rootView.filterTouchesWhenObscured = enabled
    }
  }

  override fun generateAttestation(nonce: String, promise: Promise) {
    val activity = getReactApplicationContext().getCurrentActivity() ?: run { promise.reject("ERR_ACTIVITY", "Activity is null"); return }
    val integrityManager = com.google.android.play.core.integrity.IntegrityManagerFactory.create(activity)
    val request = com.google.android.play.core.integrity.IntegrityTokenRequest.builder().setNonce(nonce).build()
    integrityManager.requestIntegrityToken(request)
      .addOnSuccessListener { promise.resolve(it.token()) }
      .addOnFailureListener { promise.reject("ERR_ATTESTATION", "Failed to generate attestation", it) }
  }

  // MARK: - Biometric Hardware & Enrollment Detection

  override fun isSensorAvailable(promise: Promise) {
    try {
      val biometricManager = BiometricManager.from(reactApplicationContext)
      val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK
      val canAuthenticate = biometricManager.canAuthenticate(authenticators)

      val pm = reactApplicationContext.packageManager
      val hasFingerprintHardware = pm.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT) ||
        FingerprintManagerCompat.from(reactApplicationContext).isHardwareDetected()

      val hasFaceHardware = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pm.hasSystemFeature(PackageManager.FEATURE_FACE)) ||
        pm.hasSystemFeature("android.hardware.biometrics.face") ||
        pm.hasSystemFeature("com.samsung.android.bio.face")

      val hasIrisHardware = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && pm.hasSystemFeature(PackageManager.FEATURE_IRIS)) ||
        pm.hasSystemFeature("android.hardware.biometrics.iris") ||
        pm.hasSystemFeature("com.samsung.android.bio.iris")

      val supportedArray = Arguments.createArray()
      val supportedList = mutableListOf<String>()
      if (hasFingerprintHardware) {
        supportedList.add("Fingerprint")
        supportedArray.pushString("Fingerprint")
      }
      if (hasFaceHardware) {
        supportedList.add("Face")
        supportedArray.pushString("Face")
      }
      if (hasIrisHardware) {
        supportedList.add("Iris")
        supportedArray.pushString("Iris")
      }

      val biometryType = when {
        supportedList.size > 1 -> "Biometrics"
        supportedList.size == 1 -> supportedList[0]
        else -> "Biometrics"
      }

      val map = Arguments.createMap()
      map.putArray("biometricsSupported", supportedArray)
      map.putBoolean("hasFingerprint", hasFingerprintHardware)
      map.putBoolean("hasFace", hasFaceHardware)
      map.putBoolean("hasIris", hasIrisHardware)
      map.putString("biometryType", biometryType)

      when (canAuthenticate) {
        BiometricManager.BIOMETRIC_SUCCESS -> {
          map.putBoolean("available", true)
          map.putBoolean("enrolled", true)
        }
        BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
          map.putBoolean("available", false)
          map.putBoolean("enrolled", false)
          map.putString("error", "BIOMETRIC_ERROR_NONE_ENROLLED")
        }
        BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> {
          map.putBoolean("available", false)
          map.putBoolean("enrolled", false)
          map.putString("error", "BIOMETRIC_ERROR_NO_HARDWARE")
        }
        BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> {
          map.putBoolean("available", false)
          map.putBoolean("enrolled", false)
          map.putString("error", "BIOMETRIC_ERROR_HW_UNAVAILABLE")
        }
        BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED -> {
          map.putBoolean("available", false)
          map.putBoolean("enrolled", true)
          map.putString("error", "BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED")
        }
        else -> {
          map.putBoolean("available", false)
          map.putBoolean("enrolled", false)
          map.putString("error", "BIOMETRICS_UNAVAILABLE")
        }
      }
      promise.resolve(map)
    } catch (e: Exception) {
      val map = Arguments.createMap()
      map.putBoolean("available", false)
      map.putBoolean("enrolled", false)
      map.putArray("biometricsSupported", Arguments.createArray())
      map.putBoolean("hasFingerprint", false)
      map.putBoolean("hasFace", false)
      map.putBoolean("hasIris", false)
      map.putString("error", e.message ?: "Unknown error")
      promise.resolve(map)
    }
  }

  // MARK: - Biometric Authentication & PKI Signatures (react-native-biometrics compatible)

  private val BIOMETRIC_DEFAULT_KEY_TAG = "SecureX_Biometric_Login"

  override fun simplePrompt(promptMessage: String, cancelButtonText: String, promise: Promise) {
    val activity = getReactApplicationContext().getCurrentActivity() as? FragmentActivity ?: run {
      val map = Arguments.createMap()
      map.putBoolean("success", false)
      map.putString("error", "Activity is null or not a FragmentActivity")
      promise.resolve(map)
      return
    }

    activity.runOnUiThread {
      val executor = ContextCompat.getMainExecutor(activity)
      val biometricPrompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
          val map = Arguments.createMap()
          map.putBoolean("success", false)
          map.putString("error", errString.toString())
          promise.resolve(map)
        }

        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
          val map = Arguments.createMap()
          map.putBoolean("success", true)
          promise.resolve(map)
        }
      })

      val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle(promptMessage)
        .setNegativeButtonText(if (cancelButtonText.isNotEmpty()) cancelButtonText else "Cancel")
        .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK)
        .build()

      biometricPrompt.authenticate(promptInfo)
    }
  }

  override fun createKeys(promise: Promise) {
    try {
      val publicKey = SigningEngine.generateBiometricSigningKeyPair(BIOMETRIC_DEFAULT_KEY_TAG, reactApplicationContext)
      val map = Arguments.createMap()
      map.putString("publicKey", publicKey)
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("ERR_CREATE_KEYS", e.message ?: "Failed to generate biometric keys")
    }
  }

  override fun biometricKeysExist(promise: Promise) {
    val exists = SigningEngine.biometricKeysExist(BIOMETRIC_DEFAULT_KEY_TAG)
    val map = Arguments.createMap()
    map.putBoolean("keysExist", exists)
    promise.resolve(map)
  }

  override fun deleteKeys(promise: Promise) {
    val success = SigningEngine.deleteSigningKeyPair(BIOMETRIC_DEFAULT_KEY_TAG)
    val map = Arguments.createMap()
    map.putBoolean("success", success)
    promise.resolve(map)
  }

  override fun createSignature(promptMessage: String, payload: String, cancelButtonText: String, promise: Promise) {
    val activity = getReactApplicationContext().getCurrentActivity() as? FragmentActivity ?: run {
      val map = Arguments.createMap()
      map.putBoolean("success", false)
      map.putString("error", "Activity is null or not a FragmentActivity")
      promise.resolve(map)
      return
    }

    SigningEngine.signDataWithBiometrics(
      activity,
      BIOMETRIC_DEFAULT_KEY_TAG,
      payload,
      promptMessage,
      cancelButtonText,
      onSuccess = { sig ->
        val map = Arguments.createMap()
        map.putBoolean("success", true)
        map.putString("signature", sig)
        promise.resolve(map)
      },
      onError = { err ->
        val map = Arguments.createMap()
        map.putBoolean("success", false)
        map.putString("error", err)
        promise.resolve(map)
      }
    )
  }

  // MARK: - Biometric Enrollment Change Detection

  override fun isBiometricEnrollmentChanged(): Boolean {
    return SecurityEngine.isBiometricEnrollmentChanged(reactApplicationContext)
  }

  // MARK: - Vault Usability

  override fun hasSecureLockScreen(): Boolean {
    return SecurityEngine.hasSecureLockScreen(reactApplicationContext)
  }

  // MARK: - Session Key Expiry

  override fun setSessionTimeout(seconds: Double) {
    sessionTimeoutMs = (seconds * 1000).toLong()
    sessionStartTime = System.currentTimeMillis()
  }

  override fun isSessionExpired(): Boolean {
    val expired = System.currentTimeMillis() - sessionStartTime > sessionTimeoutMs
    if (expired) {
      emitSecurityEvent("SESSION_EXPIRED", "Session timed out after ${sessionTimeoutMs / 1000}s")
    }
    return expired
  }

  override fun wipeSession() {
    sessionStartTime = System.currentTimeMillis()
    sessionTimeoutMs = Long.MAX_VALUE
    SecureMemoryStore.wipe()
  }

  // MARK: - ECC Hardware Key Pairs + Signing

  override fun generateSigningKeyPair(tag: String, promise: Promise) {
    try {
      val publicKey = SigningEngine.generateSigningKeyPair(tag, reactApplicationContext)
      promise.resolve(publicKey)
    } catch (e: Exception) {
      promise.reject("ERR_SIGNING_KEYGEN", e.message ?: "Key generation failed", e)
    }
  }

  override fun signData(tag: String, data: String, promise: Promise) {
    try {
      val signature = SigningEngine.signData(tag, data)
      promise.resolve(signature)
    } catch (e: Exception) {
      promise.reject("ERR_SIGN", e.message ?: "Signing failed", e)
    }
  }

  // MARK: - Secure In-Memory Storage

  override fun secureStore(key: String, value: String) {
    SecureMemoryStore.store(key, value)
  }

  override fun secureRead(key: String): String? {
    return SecureMemoryStore.read(key)
  }

  override fun secureWipe() {
    SecureMemoryStore.wipe()
  }

  // MARK: - Runtime App Tamper Detection

  override fun isAppTampered(): Boolean {
    val tampered = SecurityEngine.isAppTampered(reactApplicationContext)
    if (tampered) emitSecurityEvent("APP_TAMPERED", "APK signing certificate mismatch detected")
    return tampered
  }

  // MARK: - Key Rotation

  override fun rotateEncryptionKey(promise: Promise) {
    try {
      val keyStore = KeyStore.getInstance("AndroidKeyStore")
      keyStore.load(null)
      // Delete existing keys — next encrypt/decrypt call will regenerate them
      listOf("SecureXKey_Biometric", "SecureXKey_NonBiometric").forEach { alias ->
        if (keyStore.containsAlias(alias)) keyStore.deleteEntry(alias)
      }
      // Re-initialize crypto engine (triggers key regeneration in CryptoEngine.init)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ERR_KEY_ROTATION", e.message ?: "Key rotation failed", e)
    }
  }

  // MARK: - Security Events (NativeEventEmitter support)

  override fun addListener(eventName: String) { /* required */ }
  override fun removeListeners(count: Double) { /* required */ }

  private fun emitSecurityEvent(type: String, detail: String) {
    val payload = Arguments.createMap().apply {
      putString("type", type)
      putString("detail", detail)
      putDouble("timestamp", System.currentTimeMillis().toDouble())
    }
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("SecurityEvent", payload)
  }

  companion object {
    const val NAME = NativeReactNativeSecureXSpec.NAME
  }
}
