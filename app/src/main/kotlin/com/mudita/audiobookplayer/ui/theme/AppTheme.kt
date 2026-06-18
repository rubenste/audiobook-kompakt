package com.mudita.audiobookplayer.ui.theme

import androidx.compose.runtime.Composable
import com.mudita.mmd.ThemeMMD

/**
 * App theme. Delegates entirely to [ThemeMMD], which applies the E-Ink monochrome color scheme,
 * the Lato typography, and disables ripple. Per MMD, emphasis is expressed with FontWeight.Bold
 * (applied at call sites via TextMMD), not a custom type scale.
 */
@Composable
fun AudiobookTheme(content: @Composable () -> Unit) {
    ThemeMMD(content = content)
}
