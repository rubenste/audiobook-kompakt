package com.mudita.audiobookplayer.ui.components

import android.os.SystemClock
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember

/**
 * Wraps an action so repeated invocations within [windowMs] are ignored. Spec: all interactive
 * elements debounce at 500ms to prevent double-taps on the slow-refresh E-Ink screen.
 */
@Composable
fun rememberDebounced(windowMs: Long = 500L, action: () -> Unit): () -> Unit {
    val state = remember { LongArray(1) }
    return {
        val now = SystemClock.elapsedRealtime()
        if (now - state[0] >= windowMs) {
            state[0] = now
            action()
        }
    }
}
