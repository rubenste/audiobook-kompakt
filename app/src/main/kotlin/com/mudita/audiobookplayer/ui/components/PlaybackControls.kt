package com.mudita.audiobookplayer.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.mudita.audiobookplayer.R
import com.mudita.audiobookplayer.ui.theme.AppType
import com.mudita.mmd.components.buttons.ButtonMMD
import com.mudita.mmd.components.buttons.OutlinedButtonMMD
import com.mudita.mmd.components.slider.SliderMMD
import com.mudita.mmd.components.text.TextMMD

/** Filled play/pause button — a rounded-rectangle primary Button (matches the Penpot design: 80×70, r=18). */
@Composable
fun PlayPauseButton(
    isPlaying: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    width: Dp = 80.dp,
    height: Dp = 70.dp,
    cornerRadius: Dp = 18.dp,
    iconSize: Dp = 32.dp,
) {
    val debounced = rememberDebounced(action = onClick)
    ButtonMMD(
        onClick = debounced,
        modifier = modifier.width(width).height(height),
        shape = RoundedCornerShape(cornerRadius),
    ) {
        if (isPlaying) {
            Icon(painterResource(R.drawable.ic_pause), contentDescription = "Pause", modifier = Modifier.size(iconSize))
        } else {
            Icon(Icons.Filled.PlayArrow, contentDescription = "Play", modifier = Modifier.size(iconSize))
        }
    }
}

/** −1m / −10s / play-pause / +10s / +1m. Shared by the Player screen and the mini-player. */
@Composable
fun TransportRow(
    isPlaying: Boolean,
    onMinus1m: () -> Unit,
    onMinus10s: () -> Unit,
    onPlayPause: () -> Unit,
    onPlus10s: () -> Unit,
    onPlus1m: () -> Unit,
    modifier: Modifier = Modifier,
    playWidth: Dp = 80.dp,
    playHeight: Dp = 70.dp,
    playCorner: Dp = 18.dp,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SkipButton("-1m", onMinus1m)
        SkipButton("-10s", onMinus10s)
        PlayPauseButton(isPlaying = isPlaying, onClick = onPlayPause, width = playWidth, height = playHeight, cornerRadius = playCorner)
        SkipButton("+10s", onPlus10s)
        SkipButton("+1m", onPlus1m)
    }
}

@Composable
private fun SkipButton(label: String, onClick: () -> Unit) {
    val debounced = rememberDebounced(action = onClick)
    OutlinedButtonMMD(onClick = debounced) {
        TextMMD(label, style = AppType.transport)
    }
}

/**
 * Progress bar with a visible thumb (MMD slider). Holds a local fraction while dragging so the 1s
 * position ticker doesn't fight the thumb. Optional timestamp labels.
 */
@Composable
fun Scrubber(
    fraction: Float,
    onSeekFraction: (Float) -> Unit,
    modifier: Modifier = Modifier,
    leftLabel: String? = null,
    rightLabel: String? = null,
    onRightLabelClick: (() -> Unit)? = null,
) {
    var scrub by remember { mutableStateOf<Float?>(null) }
    Column(modifier = modifier.fillMaxWidth()) {
        SliderMMD(
            value = scrub ?: fraction,
            onValueChange = { scrub = it },
            onValueChangeFinished = {
                scrub?.let(onSeekFraction)
                scrub = null
            },
            modifier = Modifier.fillMaxWidth(),
        )
        if (leftLabel != null || rightLabel != null) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextMMD(leftLabel.orEmpty(), style = AppType.time)
                val rightModifier = if (onRightLabelClick != null) {
                    Modifier.clickableNoRipple(onRightLabelClick)
                } else {
                    Modifier
                }
                TextMMD(rightLabel.orEmpty(), modifier = rightModifier, style = AppType.time)
            }
        }
    }
}
