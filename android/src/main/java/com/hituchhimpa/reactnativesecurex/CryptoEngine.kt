package com.hituchhimpa.reactnativesecurex

import android.content.Context
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class CryptoEngine(private val context: Context) {
    private val keyAliasBiometric = "SecureXKey_Biometric"
    private val keyAliasNonBiometric = "SecureXKey_NonBiometric"
    private val androidKeyStore = "AndroidKeyStore"

    init {
        try {
            generateKey(keyAliasBiometric, true)
        } catch (e: Exception) {
            // Biometric-gated key may fail if no secure lock screen is setup; fallback on-demand
        }
        try {
            generateKey(keyAliasNonBiometric, false)
        } catch (e: Exception) {
            // no-op
        }
    }

    private fun generateKey(alias: String, requireAuth: Boolean) {
        val keyStore = KeyStore.getInstance(androidKeyStore)
        keyStore.load(null)

        if (!keyStore.containsAlias(alias)) {
            val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, androidKeyStore)
            
            val builder = KeyGenParameterSpec.Builder(
                alias,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setUserAuthenticationRequired(requireAuth)

            if (requireAuth) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    builder.setUserAuthenticationParameters(
                        0, 
                        KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL
                    )
                } else {
                    @Suppress("DEPRECATION")
                    builder.setUserAuthenticationValidityDurationSeconds(-1)
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                if (context.packageManager.hasSystemFeature("android.hardware.strongbox_keystore")) {
                    builder.setIsStrongBoxBacked(true)
                }
            }

            try {
                keyGenerator.init(builder.build())
                keyGenerator.generateKey()
            } catch (e: Exception) {
                if (requireAuth) {
                    // Fallback to standard keystore key if device has no secure lock screen
                    val fallbackBuilder = KeyGenParameterSpec.Builder(
                        alias,
                        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                    )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setUserAuthenticationRequired(false)
                    keyGenerator.init(fallbackBuilder.build())
                    keyGenerator.generateKey()
                } else {
                    throw e
                }
            }
        }
    }

    private fun getCipher(): Cipher {
        return Cipher.getInstance("${KeyProperties.KEY_ALGORITHM_AES}/${KeyProperties.BLOCK_MODE_GCM}/${KeyProperties.ENCRYPTION_PADDING_NONE}")
    }

    private fun getSecretKey(alias: String): SecretKey {
        val keyStore = KeyStore.getInstance(androidKeyStore)
        keyStore.load(null)
        if (!keyStore.containsAlias(alias)) {
            generateKey(alias, alias == keyAliasBiometric)
        }
        val key = keyStore.getKey(alias, null) as? SecretKey
        if (key == null) {
            generateKey(alias, false)
            val fallbackKey = keyStore.getKey(alias, null) as? SecretKey
            if (fallbackKey != null) return fallbackKey
            throw IllegalStateException("Failed to initialize or retrieve SecretKey: $alias")
        }
        return key
    }

    fun encrypt(activity: FragmentActivity, plainText: String, title: String, onSuccess: (String) -> Unit, onError: (String) -> Unit) {
        val requireAuth = title.isNotEmpty()
        if (requireAuth) {
            authenticate(activity, Cipher.ENCRYPT_MODE, null, title, { cipher ->
                try {
                    val iv = cipher.iv
                    val encryptedData = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
                    
                    val combined = ByteArray(iv.size + encryptedData.size)
                    System.arraycopy(iv, 0, combined, 0, iv.size)
                    System.arraycopy(encryptedData, 0, combined, iv.size, encryptedData.size)
                    
                    onSuccess(Base64.encodeToString(combined, Base64.DEFAULT))
                } catch (e: Exception) {
                    onError("Encryption failed: ${e.message}")
                }
            }, onError)
        } else {
            try {
                val cipher = getCipher()
                val secretKey = getSecretKey(keyAliasNonBiometric)
                cipher.init(Cipher.ENCRYPT_MODE, secretKey)
                val iv = cipher.iv
                val encryptedData = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
                
                val combined = ByteArray(iv.size + encryptedData.size)
                System.arraycopy(iv, 0, combined, 0, iv.size)
                System.arraycopy(encryptedData, 0, combined, iv.size, encryptedData.size)
                
                onSuccess(Base64.encodeToString(combined, Base64.DEFAULT))
            } catch (e: Exception) {
                onError("Encryption failed: ${e.message}")
            }
        }
    }

    fun decrypt(activity: FragmentActivity, encryptedBase64: String, title: String, onSuccess: (String) -> Unit, onError: (String) -> Unit) {
        val requireAuth = title.isNotEmpty()
        try {
            val combined = Base64.decode(encryptedBase64, Base64.DEFAULT)
            // GCM IV is 12 bytes
            val iv = ByteArray(12)
            val encryptedData = ByteArray(combined.size - 12)
            System.arraycopy(combined, 0, iv, 0, 12)
            System.arraycopy(combined, 12, encryptedData, 0, encryptedData.size)

            if (requireAuth) {
                authenticate(activity, Cipher.DECRYPT_MODE, iv, title, { cipher ->
                    try {
                        val decryptedData = cipher.doFinal(encryptedData)
                        onSuccess(String(decryptedData, Charsets.UTF_8))
                    } catch (e: Exception) {
                        onError("Decryption failed: ${e.message}")
                    }
                }, onError)
            } else {
                try {
                    val cipher = getCipher()
                    val secretKey = getSecretKey(keyAliasNonBiometric)
                    cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(128, iv))
                    val decryptedData = cipher.doFinal(encryptedData)
                    onSuccess(String(decryptedData, Charsets.UTF_8))
                } catch (e: Exception) {
                    onError("Decryption failed: ${e.message}")
                }
            }
        } catch (e: Exception) {
            onError("Invalid data format")
        }
    }

    private fun authenticate(activity: FragmentActivity, mode: Int, iv: ByteArray?, title: String, onSuccess: (Cipher) -> Unit, onError: (String) -> Unit) {
        activity.runOnUiThread {
            val executor = ContextCompat.getMainExecutor(context)
            val biometricPrompt = BiometricPrompt(activity, executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        super.onAuthenticationError(errorCode, errString)
                        onError("Authentication error: $errString")
                    }

                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        super.onAuthenticationSucceeded(result)
                        val cipher = result.cryptoObject?.cipher
                        if (cipher != null) {
                            onSuccess(cipher)
                        } else {
                            try {
                                val fallbackCipher = getCipher()
                                val secretKey = getSecretKey(keyAliasBiometric)
                                if (mode == Cipher.ENCRYPT_MODE) {
                                    fallbackCipher.init(mode, secretKey)
                                } else {
                                    fallbackCipher.init(mode, secretKey, GCMParameterSpec(128, iv))
                                }
                                onSuccess(fallbackCipher)
                            } catch (e: Exception) {
                                onError("Cipher not initialized: ${e.message}")
                            }
                        }
                    }

                    override fun onAuthenticationFailed() {
                        super.onAuthenticationFailed()
                        onError("Authentication failed")
                    }
                })

            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL)
                .build()

            try {
                val cipher = getCipher()
                val secretKey = getSecretKey(keyAliasBiometric)
                try {
                    if (mode == Cipher.ENCRYPT_MODE) {
                        cipher.init(mode, secretKey)
                    } else {
                        if (iv == null) throw IllegalArgumentException("IV required for decryption")
                        cipher.init(mode, secretKey, GCMParameterSpec(128, iv))
                    }
                    biometricPrompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(cipher))
                } catch (e: Exception) {
                    biometricPrompt.authenticate(promptInfo)
                }
            } catch (e: Exception) {
                onError("Crypto initialization failed: ${e.message}")
            }
        }
    }
}
