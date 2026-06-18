package com.mudita.audiobookplayer.model

/**
 * A book as shown in the library: the scanned [Audiobook] plus derived reading state.
 * [fraction] is progress over total book duration (0 until durations are cached).
 */
data class LibraryItem(
    val book: Audiobook,
    val status: BookStatus,
    val fraction: Float,
    val openedAt: Long,
    val finishedAt: Long,
)
