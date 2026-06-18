package com.mudita.audiobookplayer.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.mudita.mmd.eInkTypography

/**
 * Type scale taken verbatim from the Penpot design (sizes + weights), built on MMD's bundled Lato
 * family. The design uses Lato Regular (400) / Bold (700) / Black (900) — all present in MMD's font.
 * (The Lato family is reused from [eInkTypography] since MMD doesn't expose it directly.)
 */
object AppType {
    private val Lato = eInkTypography.bodyLarge.fontFamily

    val screenTitle = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Black, fontSize = 24.sp)

    // Books list
    val bookTitle = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Black, fontSize = 21.sp)
    val bookAuthor = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Normal, fontSize = 18.sp)
    val bookMeta = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Normal, fontSize = 18.sp)
    val percent = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Normal, fontSize = 16.sp)

    // Settings rows
    val settingLabel = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Black, fontSize = 21.sp)
    val settingValue = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Normal, fontSize = 18.sp)

    // Player
    val playerTitle = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Bold, fontSize = 32.sp)
    val playerAuthor = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Normal, fontSize = 18.sp)
    val speed = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Bold, fontSize = 24.sp)
    val chapterLabel = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Normal, fontSize = 16.sp)
    val filename = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Normal, fontSize = 12.sp)
    val time = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Normal, fontSize = 16.sp)

    // Now-playing bar
    val nowPlayingTitle = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Black, fontSize = 24.sp)
    val nowPlayingAuthor = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Normal, fontSize = 20.sp)

    // Shared controls / chrome
    val transport = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Bold, fontSize = 16.sp)
    val filterLabel = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Bold, fontSize = 16.sp)
    val body = TextStyle(fontFamily = Lato, fontWeight = FontWeight.Normal, fontSize = 18.sp)

    fun navLabel(selected: Boolean) =
        TextStyle(fontFamily = Lato, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal, fontSize = 15.sp)
}
