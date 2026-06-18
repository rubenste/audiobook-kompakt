package com.mudita.audiobookplayer.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.mudita.audiobookplayer.AudiobookApp
import com.mudita.audiobookplayer.playback.PlaybackConnection
import com.mudita.audiobookplayer.ui.books.BooksScreen
import com.mudita.audiobookplayer.ui.components.NowPlayingBar
import com.mudita.audiobookplayer.ui.components.rememberDebounced
import com.mudita.audiobookplayer.ui.player.PlayerScreen
import com.mudita.audiobookplayer.ui.settings.SettingsScreen
import com.mudita.audiobookplayer.ui.theme.AppType
import com.mudita.audiobookplayer.ui.theme.AudiobookTheme
import com.mudita.mmd.components.buttons.ButtonMMD
import com.mudita.mmd.components.text.TextMMD
import kotlinx.coroutines.flow.first

private enum class Screen { BOOKS, PLAYER, SETTINGS }

@Composable
fun AppRoot() {
    AudiobookTheme {
        val context = LocalContext.current
        val app = context.applicationContext as AudiobookApp

        // Initialize playback and restore the last-opened book paused (spec: no autoplay on relaunch).
        LaunchedEffect(Unit) {
            app.playbackConnection.initialize()
            val progress = app.preferences.currentProgress()
            val lastId = progress.entries.filter { it.value.openedAt > 0 }.maxByOrNull { it.value.openedAt }?.key
            if (lastId != null) {
                val books = app.libraryRepository.scan(app.preferences.settings.first().rootPath)
                books.firstOrNull { it.id == lastId }?.let { app.playbackConnection.openBook(it, autoPlay = false) }
            }
        }

        var hasPermission by remember { mutableStateOf(context.hasPermission(audioPermission())) }

        if (hasPermission) {
            AppNavigation(app.playbackConnection)
        } else {
            PermissionGate(onGranted = { hasPermission = true })
        }
    }
}

@Composable
private fun AppNavigation(connection: PlaybackConnection) {
    val backStack = remember { mutableStateListOf(Screen.BOOKS) }
    val current = backStack.last()
    val playback by connection.state.collectAsStateWithLifecycle()

    fun navigate(screen: Screen) { if (backStack.last() != screen) backStack.add(screen) }
    fun back() { if (backStack.size > 1) backStack.removeAt(backStack.lastIndex) }

    // System back returns through the stack (and falls through to exit at the root).
    BackHandler(enabled = backStack.size > 1) { back() }

    Column(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.weight(1f)) {
            when (current) {
                Screen.BOOKS -> BooksScreen(
                    onOpenSettings = { navigate(Screen.SETTINGS) },
                    onOpenPlayer = { navigate(Screen.PLAYER) },
                )
                Screen.PLAYER -> PlayerScreen(onBack = { back() })
                Screen.SETTINGS -> SettingsScreen(onBack = { back() })
            }
        }
        // Now-playing bar on Books & Settings when a book is active (not on the Player itself).
        if (playback.hasBook && current != Screen.PLAYER) {
            NowPlayingBar(
                state = playback,
                onPlayPause = { connection.playPause() },
                onOpenPlayer = { navigate(Screen.PLAYER) },
            )
        }
    }
}

@Composable
private fun PermissionGate(onGranted: () -> Unit) {
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        if (result[audioPermission()] == true) onGranted()
    }
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        TextMMD(
            "This app needs access to the audio files on your device to show your audiobooks.",
            textAlign = TextAlign.Center,
            style = AppType.body,
        )
        Spacer(Modifier.size(12.dp))
        ButtonMMD(onClick = rememberDebounced { launcher.launch(requiredPermissions()) }) {
            TextMMD("Grant access", style = AppType.transport)
        }
    }
}

private fun audioPermission(): String =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        Manifest.permission.READ_MEDIA_AUDIO
    } else {
        Manifest.permission.READ_EXTERNAL_STORAGE
    }

private fun requiredPermissions(): Array<String> =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        arrayOf(Manifest.permission.READ_MEDIA_AUDIO, Manifest.permission.POST_NOTIFICATIONS)
    } else {
        arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE)
    }

private fun android.content.Context.hasPermission(permission: String): Boolean =
    ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
