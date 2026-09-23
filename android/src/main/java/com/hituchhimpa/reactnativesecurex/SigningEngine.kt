package com.hituchhimpa.reactnativesecurex

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricPrompt
import androidx.biometric.BiometricManager
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature

object SigningEngine {

    private const val ANDROID_KEYSTORE = "AndroidKeyStore"

    /**
     * Generates a P-256 ECC signing key pair inside the Android Keystore (StrongBox if available).
     * Returns the Base64-encoded DER public key.
     */
    fun generateSigningKeyPair(tag: String, context: android.content.Context): String {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        // Delete existing key if any
        if (keyStore.containsAlias(tag)) {
            keyStore.deleteEntry(tag)
        }

        val kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE)

        val builder = KeyGenParameterSpec.Builder(
            tag,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        )
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setKeySize(256)

        // Use StrongBox if available (hardware security module)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            if (context.packageManager.hasSystemFeature("android.hardware.strongbox_keystore")) {
                try {
                    builder.setIsStrongBoxBacked(true)
                } catch (_: Exception) {}
            }
        }

        kpg.initialize(builder.build())
        val keyPair = kpg.generateKeyPair()

        val publicKeyBytes = keyPair.public.encoded
        return Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)
    }

    /**
     * Generates a P-256 ECC signing key pair protected by Biometric authentication.
     */
    fun generateBiometricSigningKeyPair(tag: String, context: android.content.Context): String {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        if (keyStore.containsAlias(tag)) {
            keyStore.deleteEntry(tag)
        }

        val kpg = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE)

        val builder = KeyGenParameterSpec.Builder(
            tag,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
        )
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setUserAuthenticationParameters(
                0,
                KeyProperties.AUTH_BIOMETRIC_STRONG
            )
        } else {
            @Suppress("DEPRECATION")
            builder.setUserAuthenticationValidityDurationSeconds(-1)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            if (context.packageManager.hasSystemFeature("android.hardware.strongbox_keystore")) {
                try {
                    builder.setIsStrongBoxBacked(true)
                } catch (_: Exception) {}
            }
        }

        kpg.initialize(builder.build())
        val keyPair = kpg.generateKeyPair()

        val publicKeyBytes = keyPair.public.encoded
        return Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)
    }

    fun biometricKeysExist(tag: String): Boolean {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)
        return keyStore.containsAlias(tag)
    }

    fun deleteSigningKeyPair(tag: String): Boolean {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)
        if (keyStore.containsAlias(tag)) {
            keyStore.deleteEntry(tag)
        }
        return true
    }

    /**
     * Signs the given data string using the key identified by [tag].
     * Returns Base64-encoded DER signature.
     */
    fun signData(tag: String, data: String): String {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        val privateKey = keyStore.getKey(tag, null)
            ?: throw IllegalArgumentException("Signing key not found for tag: $tag. Call generateSigningKeyPair first.")

        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(privateKey as PrivateKey)
        signature.update(data.toByteArray(Charsets.UTF_8))

        val signed = signature.sign()
        return Base64.encodeToString(signed, Base64.NO_WRAP)
    }

    /**
     * Signs the given data string with biometric prompt authentication.
     */
    fun signDataWithBiometrics(
        activity: FragmentActivity,
        tag: String,
        data: String,
        promptMessage: String,
        cancelButtonText: String,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        val privateKey = keyStore.getKey(tag, null) as? PrivateKey ?: run {
            onError("Biometric key not found for tag: $tag. Call createKeys first.")
            return
        }

        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(privateKey)

        activity.runOnUiThread {
            val executor = ContextCompat.getMainExecutor(activity)
            val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    onError(errString.toString())
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    try {
                        val sig = result.cryptoObject?.signature ?: signature
                        sig.update(data.toByteArray(Charsets.UTF_8))
                        val signed = sig.sign()
                        onSuccess(Base64.encodeToString(signed, Base64.NO_WRAP))
                    } catch (e: Exception) {
                        onError("Signing failed: ${e.message}")
                    }
                }
            })

            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle(promptMessage)
                .setNegativeButtonText(if (cancelButtonText.isNotEmpty()) cancelButtonText else "Cancel")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .build()

            prompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(signature))
        }
    }
}
