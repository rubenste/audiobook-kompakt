package com.mudita.audiobookplayer.model

import android.net.Uri

/**
 * One chapter = one audio file inside a book folder. [index] is the alphabetical position used as
 * the play order and as part of the persisted position key. [durationMs] is filled in lazily once
 * the player has read the file's metadata (0 until known).
 */
data class Chapter(
    val index: Int,
    val fileName: String,
    val uri: Uri,
    val durationMs: Long = 0L,
)

/**
 * An audiobook = one folder of chapter files (per the spec's `/sdcard/Audiobooks/` layout).
 * [author] is null when the folder structure doesn't encode one. [id] is the folder path, stable
 * across scans and used to key persisted progress.
 */
data class Audiobook(
    val id: String,
    val title: String,
    val author: String?,
    val folderPath: String,
    val coverUri: Uri?,
    val chapters: List<Chapter>,
) {
    val chapterCount: Int get() = chapters.size

    /** Sum of known chapter durations; may be partial until all chapters are probed. */
    val totalDurationMs: Long get() = chapters.sumOf { it.durationMs }
}

/** Derived reading state used by the library tabs/filter. */
enum class BookStatus { NEW, IN_PROGRESS, FINISHED }
