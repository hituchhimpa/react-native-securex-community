package com.hituchhimpa.reactnativesecurex

import java.util.concurrent.ConcurrentHashMap

/**
 * In-memory secure store.
 * Values are stored as CharArray (not String) so they can be explicitly zeroed on wipe.
 */
object SecureMemoryStore {

    private val store = ConcurrentHashMap<String, CharArray>()

    fun store(key: String, value: String) {
        // Wipe old value if exists
        store[key]?.let { chars -> chars.fill('\u0000') }
        store[key] = value.toCharArray()
    }

    fun read(key: String): String? {
        val chars = store[key] ?: return null
        return String(chars)
    }

    fun wipe() {
        store.values.forEach { chars -> chars.fill('\u0000') }
        store.clear()
    }
}
