package com.hituchhimpa.reactnativesecurex

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
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
     * Signs the given data string using the key identified by [tag].
     * Returns Base64-encoded DER signature.
     */
    fun signData(tag: String, data: String): String {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
        keyStore.load(null)

        val privateKey = keyStore.getKey(tag, null)
            ?: throw IllegalArgumentException("Signing key not found for tag: $tag. Call generateSigningKeyPair first.")

        val signature = Signature.getInstance("SHA256withECDSA")
        signature.initSign(privateKey as java.security.PrivateKey)
        signature.update(data.toByteArray(Charsets.UTF_8))

        val signed = signature.sign()
        return Base64.encodeToString(signed, Base64.NO_WRAP)
    }
}
