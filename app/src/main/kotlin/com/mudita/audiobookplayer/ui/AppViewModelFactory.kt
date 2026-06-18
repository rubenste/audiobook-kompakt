package com.mudita.audiobookplayer.ui

import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.mudita.audiobookplayer.AudiobookApp
import com.mudita.audiobookplayer.ui.books.BooksViewModel
import com.mudita.audiobookplayer.ui.player.PlayerViewModel
import com.mudita.audiobookplayer.ui.settings.SettingsViewModel

/** Single factory pulling the app-scoped singletons off [AudiobookApp] into each ViewModel. */
fun appViewModelFactory(): ViewModelProvider.Factory = viewModelFactory {
    initializer {
        val app = app()
        BooksViewModel(app.libraryRepository, app.preferences, app.playbackConnection)
    }
    initializer {
        PlayerViewModel(app().playbackConnection)
    }
    initializer {
        val app = app()
        SettingsViewModel(app.preferences, app.playbackConnection)
    }
}

private fun CreationExtras.app(): AudiobookApp =
    this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as AudiobookApp
