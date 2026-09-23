package com.hituchhimpa.reactnativesecurex

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import androidx.fragment.app.FragmentActivity
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
