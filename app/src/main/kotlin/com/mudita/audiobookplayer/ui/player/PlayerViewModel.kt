package com.mudita.audiobookplayer.ui.player

import androidx.lifecycle.ViewModel
import com.mudita.audiobookplayer.data.AppSettings
import com.mudita.audiobookplayer.playback.PlaybackConnection
import com.mudita.audiobookplayer.playback.PlaybackState
import kotlinx.coroutines.flow.StateFlow

/** Thin forwarder to the shared [PlaybackConnection]; the connection is the source of truth. */
class PlayerViewModel(
    private val playbackConnection: PlaybackConnection,
) : ViewModel() {

    val state: StateFlow<PlaybackState> = playbackConnection.state

    fun playPause() = playbackConnection.playPause()
    fun seekInChapter(positionMs: Long) = playbackConnection.seekTo(positionMs)
    fun skipBackSmall() = playbackConnection.skip(-10)
    fun skipBackLarge() = playbackConnection.skip(-60)
    fun skipForwardSmall() = playbackConnection.skip(10)
    fun skipForwardLarge() = playbackConnection.skip(60)
    fun nextChapter() = playbackConnection.nextChapter()
    fun previousChapter() = playbackConnection.previousChapter()

    fun cycleSpeed(current: Float) {
        val options = AppSettings.SPEED_OPTIONS
        val next = options[(options.indexOfNearest(current) + 1) % options.size]
        playbackConnection.setSpeed(next)
    }

    private fun List<Float>.indexOfNearest(value: Float): Int {
        var best = 0
        var bestDiff = Float.MAX_VALUE
        forEachIndexed { i, f ->
            val d = kotlin.math.abs(f - value)
            if (d < bestDiff) { bestDiff = d; best = i }
        }
        return best
    }
}
