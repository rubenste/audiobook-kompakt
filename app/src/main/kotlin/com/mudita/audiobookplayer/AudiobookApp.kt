package com.mudita.audiobookplayer

import android.app.Application
import com.mudita.audiobookplayer.data.AppPreferences
import com.mudita.audiobookplayer.data.AudiobookScanner
import com.mudita.audiobookplayer.data.LibraryRepository
import com.mudita.audiobookplayer.playback.PlaybackConnection
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/**
 * Owns the app-scoped singletons. Lightweight manual DI keeps the MVP free of a framework while
 * sharing one [PlaybackConnection] across all screens.
 */
class AudiobookApp : Application() {

    // MediaController must be touched from the main thread, so the playback scope runs on Main.
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    lateinit var preferences: AppPreferences
        private set
    lateinit var libraryRepository: LibraryRepository
        private set
    lateinit var playbackConnection: PlaybackConnection
        private set

    override fun onCreate() {
        super.onCreate()
        preferences = AppPreferences(this)
        libraryRepository = LibraryRepository(AudiobookScanner(), preferences)
        playbackConnection = PlaybackConnection(this, preferences, appScope)
    }
}
