package com.mudita.audiobookplayer.data

/** Persisted listening progress for a single chapter. */
data class ChapterProgress(
    val positionMs: Long = 0L,
    val durationMs: Long = 0L,
    val done: Boolean = false,
)

/**
 * Persisted progress for one book, keyed by chapter index. [openedAt] is 0 until the book is first
 * opened; [finishedAt] is 0 until the last chapter is done. Used to derive [com.mudita.audiobookplayer.model.BookStatus].
 */
data class BookProgress(
    val lastChapterIndex: Int = 0,
    val openedAt: Long = 0L,
    val finishedAt: Long = 0L,
    val chapters: Map<Int, ChapterProgress> = emptyMap(),
) {
    val isOpened: Boolean get() = openedAt > 0L
    val isFinished: Boolean get() = finishedAt > 0L

    /** Total listened milliseconds: full duration for done chapters, saved position otherwise. */
    fun listenedMs(): Long = chapters.values.sumOf { if (it.done) it.durationMs else it.positionMs }

    /** Total of cached chapter durations (0 until durations have been probed). */
    fun totalDurationMs(): Long = chapters.values.sumOf { it.durationMs }

    /** 0f..1f progress over total book duration; 0 when durations unknown. */
    fun fraction(): Float {
        val total = totalDurationMs()
        if (total <= 0L) return 0f
        return (listenedMs().toFloat() / total).coerceIn(0f, 1f)
    }
}
