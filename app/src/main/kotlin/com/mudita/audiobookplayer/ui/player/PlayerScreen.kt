package com.mudita.audiobookplayer.ui.player

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mudita.audiobookplayer.R
import com.mudita.audiobookplayer.playback.PlaybackState
import com.mudita.audiobookplayer.ui.appViewModelFactory
import com.mudita.audiobookplayer.ui.components.Scrubber
import com.mudita.audiobookplayer.ui.components.TransportRow
import com.mudita.audiobookplayer.ui.components.clickableNoRipple
import com.mudita.audiobookplayer.ui.components.rememberDebounced
import com.mudita.audiobookplayer.ui.theme.AppType
import com.mudita.audiobookplayer.util.formatDuration
import com.mudita.mmd.components.divider.HorizontalDividerMMD
import com.mudita.mmd.components.text.TextMMD
import com.mudita.mmd.components.top_app_bar.TopAppBarMMD

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PlayerScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: PlayerViewModel = viewModel(factory = appViewModelFactory()),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(modifier = modifier.fillMaxSize()) {
        TopAppBarMMD(
            title = {},
            navigationIcon = {
                IconButton(onClick = rememberDebounced(action = onBack)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", modifier = Modifier.size(24.dp))
                }
            },
            showDivider = false,
        )

        if (!state.hasBook) {
            Box(modifier = Modifier.weight(1f).fillMaxSize(), contentAlignment = Alignment.Center) {
                TextMMD(
                    "Nothing playing yet.\nChoose a book from your library.",
                    modifier = Modifier.padding(32.dp),
                    textAlign = TextAlign.Center,
                    style = AppType.body,
                )
            }
        } else {
            PlayerContent(state = state, viewModel = viewModel, modifier = Modifier.weight(1f))
            HorizontalDividerMMD(thickness = 2.dp)
            TransportRow(
                isPlaying = state.isPlaying,
                onMinus1m = viewModel::skipBackLarge,
                onMinus10s = viewModel::skipBackSmall,
                onPlayPause = viewModel::playPause,
                onPlus10s = viewModel::skipForwardSmall,
                onPlus1m = viewModel::skipForwardLarge,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp),
            )
        }
    }
}

@Composable
private fun ColumnScope.PlayerContent(state: PlaybackState, viewModel: PlayerViewModel, modifier: Modifier) {
    var showTotal by remember { mutableStateOf(false) }
    val chapterDuration = state.chapterDurationMs
    val fraction = if (chapterDuration > 0) (state.positionInChapterMs.toFloat() / chapterDuration).coerceIn(0f, 1f) else 0f

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(40.dp))
        state.author?.let {
            TextMMD(it, style = AppType.playerAuthor, textAlign = TextAlign.Center, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(12.dp))
        }
        TextMMD(
            state.bookTitle,
            style = AppType.playerTitle,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )

        Spacer(Modifier.height(20.dp))
        ChapterNav(state = state, onPrev = viewModel::previousChapter, onNext = viewModel::nextChapter)

        Spacer(Modifier.weight(1f))

        TextMMD(
            text = "${formatSpeed(state.speed)}x",
            style = AppType.speed,
            modifier = Modifier
                .fillMaxWidth()
                .clickableNoRipple(rememberDebounced { viewModel.cycleSpeed(state.speed) }),
        )
        Spacer(Modifier.height(12.dp))
        Scrubber(
            fraction = fraction,
            onSeekFraction = { f -> viewModel.seekInChapter((f * chapterDuration).toLong()) },
            leftLabel = formatDuration(state.positionInChapterMs),
            rightLabel = formatDuration(if (showTotal) state.bookDurationMs else chapterDuration),
            onRightLabelClick = { showTotal = !showTotal },
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun ChapterNav(state: PlaybackState, onPrev: () -> Unit, onNext: () -> Unit) {
    val prev = rememberDebounced(action = onPrev)
    val next = rememberDebounced(action = onNext)
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(
            modifier = Modifier.width(296.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Icon(
                painterResource(R.drawable.ic_chapter_prev),
                contentDescription = "Previous chapter",
                modifier = Modifier.size(24.dp).clickableNoRipple(prev),
            )
            TextMMD("${state.chapterIndex + 1}/${state.chapterCount}", style = AppType.chapterLabel)
            Icon(
                painterResource(R.drawable.ic_chapter_next),
                contentDescription = "Next chapter",
                modifier = Modifier.size(24.dp).clickableNoRipple(next),
            )
        }
    }
}

private fun formatSpeed(speed: Float): String =
    if (speed % 1f == 0f) speed.toInt().toString() else speed.toString()
