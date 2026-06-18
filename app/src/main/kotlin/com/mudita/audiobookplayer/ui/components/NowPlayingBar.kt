package com.mudita.audiobookplayer.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.mudita.audiobookplayer.R
import com.mudita.audiobookplayer.playback.PlaybackState
import com.mudita.audiobookplayer.ui.theme.AppType
import com.mudita.mmd.components.divider.HorizontalDividerMMD
import com.mudita.mmd.components.text.TextMMD

/**
 * Compact "now playing" bar (Kompakt music-player style). Shows the active book's title + author
 * and a play/pause button — no progress. Tapping the play/pause button toggles playback; tapping
 * anywhere else opens the full Player. Shown on Books & Settings when a book is loaded.
 */
@Composable
fun NowPlayingBar(
    state: PlaybackState,
    onPlayPause: () -> Unit,
    onOpenPlayer: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val open = rememberDebounced(action = onOpenPlayer)
    val playPause = rememberDebounced(action = onPlayPause)
    Column(modifier = modifier.fillMaxWidth()) {
        HorizontalDividerMMD(thickness = 2.dp)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickableNoRipple(open)
                .padding(horizontal = 20.dp, vertical = 32.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(modifier = Modifier.weight(1f)) {
                TextMMD(
                    state.bookTitle,
                    style = AppType.nowPlayingTitle,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                state.author?.let {
                    Spacer(Modifier.height(4.dp))
                    TextMMD(it, style = AppType.nowPlayingAuthor, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            // Play/pause has its own tap target so it doesn't open the Player.
            Box(
                modifier = Modifier.size(44.dp).clickableNoRipple(playPause),
                contentAlignment = Alignment.Center,
            ) {
                if (state.isPlaying) {
                    Icon(painterResource(R.drawable.ic_pause), contentDescription = "Pause", modifier = Modifier.size(32.dp))
                } else {
                    Icon(Icons.Filled.PlayArrow, contentDescription = "Play", modifier = Modifier.size(32.dp))
                }
            }
        }
    }
}
