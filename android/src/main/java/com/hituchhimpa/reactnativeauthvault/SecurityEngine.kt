package com.hituchhimpa.reactnativeauthvault

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Debug
import android.util.Base64
import java.io.File
import java.security.MessageDigest

object SecurityEngine {

    private const val PREFS_NAME = "av_security_prefs"
    private const val KEY_BIOMETRIC_HASH = "av_biometric_hash"

    fun audit(context: Context): Map<String, Any> {
        val rooted = isRooted()
        val emulator = isEmulator()
        val debugger = isDebuggerAttached()
        val hooking = isHookingDetected()
        val tampered = isAppTampered(context)
        val biometricChanged = isBiometricEnrollmentChanged(context)

        val hardwareBacked = context.packageManager.hasSystemFeature("android.hardware.strongbox_keystore")
        val biometricEnabled = androidx.biometric.BiometricManager.from(context)
            .canAuthenticate(androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG) ==
            androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS
        val vaultUsable = isVaultUsable(context)

        var score = 100
        if (rooted) score -= 50
        if (emulator) score -= 20
        if (debugger) score -= 20
        if (hooking) score -= 50
        if (tampered) score -= 40
        if (biometricChanged) score -= 30
        if (!hardwareBacked) score -= 10
        if (!biometricEnabled) score -= 5

        return mapOf(
            "secureStorage" to true,
            "hardwareBacked" to hardwareBacked,
            "biometricEnabled" to biometricEnabled,
            "vaultUsable" to vaultUsable,
            "rooted" to rooted,
            "jailbroken" to false,
            "emulator" to emulator,
            "debuggerAttached" to debugger,
            "hookingDetected" to hooking,
            "appTampered" to tampered,
            "biometricEnrollmentChanged" to biometricChanged,
            "securityScore" to maxOf(score, 0)
        )
    }

    // MARK: - Vault Usability
    // Auth-gated keys (biometric/device-credential encrypt & decrypt calls) require a secure
    // lock screen (PIN/pattern/password/biometric). Without one, KeyStore refuses to generate
    // the key, so those calls will always fail. Apps should check this before calling
    // encrypt/decrypt/setItem/getItem with a non-empty prompt.
    fun isVaultUsable(context: Context): Boolean {
        val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as? android.app.KeyguardManager
            ?: return false
        return keyguardManager.isDeviceSecure
    }

    // MARK: - Biometric Enrollment Change Detection
    // Hashes the APK signing certificate — if it changes between runs, fingerprint changed.
    fun isBiometricEnrollmentChanged(context: Context): Boolean {
        try {
            val currentHash = getSigningCertHash(context) ?: return false
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val savedHash = prefs.getString(KEY_BIOMETRIC_HASH, null)

            return if (savedHash == null) {
                prefs.edit().putString(KEY_BIOMETRIC_HASH, currentHash).apply()
                false
            } else {
                savedHash != currentHash
            }
        } catch (e: Exception) {
            return false
        }
    }

    // MARK: - Runtime App Tamper Detection
    fun isAppTampered(context: Context): Boolean {
        return try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.GET_SIGNING_CERTIFICATES
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.GET_SIGNATURES
                )
            }

            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                packageInfo.signatures
            }

            // If there are multiple signers (tampered repack usually re-signs), flag it
            signatures != null && signatures.size > 1
        } catch (e: Exception) {
            false
        }
    }

    private fun getSigningCertHash(context: Context): String? {
        return try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.GET_SIGNING_CERTIFICATES
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_SIGNATURES)
            }

            val signature = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.signingInfo?.apkContentsSigners?.firstOrNull()
            } else {
                @Suppress("DEPRECATION")
                packageInfo.signatures?.firstOrNull()
            } ?: return null

            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(signature.toByteArray())
            Base64.encodeToString(hash, Base64.NO_WRAP)
        } catch (e: Exception) {
            null
        }
    }

    // MARK: - Root Detection
    private fun isRooted(): Boolean {
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) return true

        val paths = arrayOf(
            "/system/app/Superuser.apk", "/sbin/su", "/system/bin/su",
            "/system/xbin/su", "/data/local/xbin/su", "/data/local/bin/su",
            "/system/sd/xbin/su", "/system/bin/failsafe/su", "/data/local/su", "/su/bin/su"
        )
        for (path in paths) {
            if (File(path).exists()) return true
        }
        return false
    }

    // MARK: - Emulator Detection
    private fun isEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                || "google_sdk" == Build.PRODUCT)
    }

    // MARK: - Debugger Detection
    private fun isDebuggerAttached(): Boolean {
        return Debug.isDebuggerConnected() || Debug.waitingForDebugger()
    }

    // MARK: - Hooking Detection (Frida / Xposed)
    private fun isHookingDetected(): Boolean {
        try {
            val maps = File("/proc/self/maps")
            if (maps.exists()) {
                val contents = maps.readText()
                val suspiciousKeywords = arrayOf("frida", "xposed", "edxposed", "lsposed", "substrate")
                for (keyword in suspiciousKeywords) {
                    if (contents.contains(keyword, ignoreCase = true)) return true
                }
            }
        } catch (e: Exception) {
            // Ignore
        }
        return false
    }
}
