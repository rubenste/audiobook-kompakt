package com.mudita.audiobookplayer

import android.media.AudioManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.mudita.audiobookplayer.ui.AppRoot

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Spec: hardware volume buttons control media volume, not the ringer.
        volumeControlStream = AudioManager.STREAM_MUSIC
        enableEdgeToEdge()
        setContent {
            AppRoot()
        }
    }
}
