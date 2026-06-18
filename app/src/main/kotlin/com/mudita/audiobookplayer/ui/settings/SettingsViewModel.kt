package com.mudita.audiobookplayer.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mudita.audiobookplayer.data.AppPreferences
import com.mudita.audiobookplayer.data.AppSettings
import com.mudita.audiobookplayer.data.BookProgress
import com.mudita.audiobookplayer.playback.PlaybackConnection
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val preferences: AppPreferences,
    private val playbackConnection: PlaybackConnection,
) : ViewModel() {

    val settings: StateFlow<AppSettings> = preferences.settings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AppSettings(rootPath = ""))

    val progress: StateFlow<Map<String, BookProgress>> = preferences.progress
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyMap())

    fun setRootPath(path: String) = viewModelScope.launch { preferences.setRootPath(path) }

    fun cycleDefaultSpeed(current: Float) = viewModelScope.launch {
        val options = AppSettings.SPEED_OPTIONS
        val idx = options.indexOfFirst { kotlin.math.abs(it - current) < 0.01f }.takeIf { it >= 0 } ?: 0
        preferences.setDefaultSpeed(options[(idx + 1) % options.size])
    }

    /** Stop App: persist current position and stop audio (the UI then exits). */
    fun stopPlayback() = playbackConnection.stop()
}
