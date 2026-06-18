package com.mudita.audiobookplayer.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed

/** A clickable with no ripple/indication, matching MMD's E-Ink (no animation) interaction model. */
fun Modifier.clickableNoRipple(onClick: () -> Unit): Modifier = composed {
    val interaction = remember { MutableInteractionSource() }
    clickable(interactionSource = interaction, indication = null, onClick = onClick)
}
