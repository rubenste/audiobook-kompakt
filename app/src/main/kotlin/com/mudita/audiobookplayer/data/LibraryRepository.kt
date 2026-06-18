package com.mudita.audiobookplayer.data

import com.mudita.audiobookplayer.model.Audiobook
import com.mudita.audiobookplayer.model.BookStatus
import com.mudita.audiobookplayer.model.LibraryItem

/** Library filter tabs (spec). */
enum class LibraryFilter { ALL, NEW, IN_PROGRESS, FINISHED }

/**
 * Produces the library view: scans the root folder and merges in persisted progress to derive each
 * book's status and progress %. Also applies the spec's per-tab filtering and sort rules.
 */
class LibraryRepository(
    private val scanner: AudiobookScanner,
    private val preferences: AppPreferences,
) {

    /** Scan the filesystem (occasional — only when root changes or on manual refresh). */
    suspend fun scan(rootPath: String): List<Audiobook> = scanner.scan(rootPath)

    /** Merge scanned books with persisted progress into library items (pure, cheap, reactive). */
    fun merge(books: List<Audiobook>, progress: Map<String, BookProgress>): List<LibraryItem> =
        books.map { book ->
            val bp = progress[book.id]
            val status = when {
                bp == null || !bp.isOpened -> BookStatus.NEW
                bp.isFinished -> BookStatus.FINISHED
                else -> BookStatus.IN_PROGRESS
            }
            LibraryItem(
                book = book,
                status = status,
                fraction = bp?.fraction() ?: 0f,
                openedAt = bp?.openedAt ?: 0L,
                finishedAt = bp?.finishedAt ?: 0L,
            )
        }

    /**
     * Filters and sorts per the spec:
     *  - ALL: in-progress/new by most recently opened first, finished books at the bottom (most
     *    recently finished first).
     *  - IN_PROGRESS: most recently opened first.
     *  - FINISHED: most recently finished first.
     *  - NEW: no sort (scan order, i.e. alphabetical by title).
     */
    fun applyFilter(items: List<LibraryItem>, filter: LibraryFilter): List<LibraryItem> = when (filter) {
        LibraryFilter.NEW ->
            items.filter { it.status == BookStatus.NEW }
        LibraryFilter.IN_PROGRESS ->
            items.filter { it.status == BookStatus.IN_PROGRESS }
                .sortedByDescending { it.openedAt }
        LibraryFilter.FINISHED ->
            items.filter { it.status == BookStatus.FINISHED }
                .sortedByDescending { it.finishedAt }
        LibraryFilter.ALL -> {
            val finished = items.filter { it.status == BookStatus.FINISHED }
                .sortedByDescending { it.finishedAt }
            val rest = items.filter { it.status != BookStatus.FINISHED }
                .sortedByDescending { it.openedAt }
            rest + finished
        }
    }
}
