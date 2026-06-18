package com.mudita.audiobookplayer.playback

import android.content.ComponentName
import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import androidx.core.content.ContextCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.mudita.audiobookplayer.data.AppPreferences
import com.mudita.audiobookplayer.model.Audiobook
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/** Everything the UI needs to render playback, including chapter context. */
data class PlaybackState(
    val isReady: Boolean = false,
    val isPlaying: Boolean = false,
    val bookId: String? = null,
    val bookTitle: String = "",
    val author: String? = null,
    val artworkUri: Uri? = null,
    val chapterIndex: Int = 0,
    val chapterCount: Int = 0,
    val chapterFileName: String = "",
    val positionInChapterMs: Long = 0L,
    val chapterDurationMs: Long = 0L,
    val bookPositionMs: Long = 0L,
    val bookDurationMs: Long = 0L,
    val speed: Float = 1.0f,
) {
    val hasBook: Boolean get() = bookId != null
}

private const val CHAPTER_DONE_THRESHOLD_MS = 5_000L

/**
 * App-scoped bridge to the [PlaybackService]. Loads a book's chapters as a playlist, tracks
 * per-chapter resume positions, marks chapters/books done per the spec, and exposes a single
 * [state] flow. All [MediaController] calls happen on the main thread (the [scope] uses Main).
 */
class PlaybackConnection(
    private val context: Context,
    private val prefs: AppPreferences,
    private val scope: CoroutineScope,
) {
    private var controller: MediaController? = null
    private var currentBook: Audiobook? = null
    private val chapterDurations = mutableMapOf<Int, Long>()
    private var lastSeenChapter = 0

    private val _state = MutableStateFlow(PlaybackState())
    val state: StateFlow<PlaybackState> = _state.asStateFlow()

    private val listener = object : Player.Listener {
        override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
            val c = controller ?: return
            val newIndex = c.currentMediaItemIndex
            // Moving forward (auto-advance or skip-to-next) completes the chapter we left.
            if (newIndex > lastSeenChapter) markChapterDone(lastSeenChapter)
            lastSeenChapter = newIndex
            currentBook?.let { scope.launch { prefs.setLastChapter(it.id, newIndex) } }
            pushState()
        }

        override fun onPlaybackStateChanged(playbackState: Int) {
            // Reaching the end of the playlist completes the final chapter (no transition fires for it).
            if (playbackState == Player.STATE_ENDED) {
                controller?.let { markChapterDone(it.currentMediaItemIndex) }
            }
        }

        override fun onEvents(player: Player, events: Player.Events) {
            pushState()
        }
    }

    fun initialize() {
        if (controller != null) return
        val token = SessionToken(context, ComponentName(context, PlaybackService::class.java))
        val future = MediaController.Builder(context, token).buildAsync()
        future.addListener({
            controller = future.get().also { it.addListener(listener) }
            startTicker()
        }, ContextCompat.getMainExecutor(context))
    }

    /**
     * Loads [book] as a chapter playlist, resuming the last chapter/position. [autoPlay] true when
     * the user opened the book; false when restoring the last book on app launch (spec: no autoplay
     * on relaunch).
     */
    fun openBook(book: Audiobook, autoPlay: Boolean) {
        val c = controller ?: return
        scope.launch {
            val progressMap = prefs.currentProgress()
            val bp = progressMap[book.id]
            val startChapter = bp?.lastChapterIndex?.coerceIn(0, (book.chapters.size - 1).coerceAtLeast(0)) ?: 0
            val startPosition = bp?.chapters?.get(startChapter)?.positionMs ?: 0L

            currentBook = book
            chapterDurations.clear()
            bp?.chapters?.forEach { (idx, cp) -> if (cp.durationMs > 0) chapterDurations[idx] = cp.durationMs }
            lastSeenChapter = startChapter

            val items = book.chapters.map { chapter ->
                MediaItem.Builder()
                    .setMediaId("${book.id}::${chapter.index}")
                    .setUri(chapter.uri)
                    .setMediaMetadata(
                        MediaMetadata.Builder()
                            .setTitle(book.title)
                            .setArtist(book.author)
                            .setArtworkUri(book.coverUri)
                            .build(),
                    )
                    .build()
            }
            c.setMediaItems(items, startChapter, startPosition)
            c.setPlaybackSpeed(prefs.settings.first().defaultSpeed)
            c.prepare()
            c.playWhenReady = autoPlay

            prefs.setLastChapter(book.id, startChapter)
            pushState()
            preloadDurations(book)
        }
    }

    fun playPause() {
        val c = controller ?: return
        if (c.isPlaying) c.pause() else c.play()
    }

    fun seekTo(positionInChapterMs: Long) {
        controller?.seekTo(positionInChapterMs.coerceAtLeast(0L))
    }

    fun skip(seconds: Int) {
        val c = controller ?: return
        val duration = c.duration.takeIf { it != C.TIME_UNSET } ?: Long.MAX_VALUE
        val target = (c.currentPosition + seconds * 1_000L).coerceIn(0L, duration)
        c.seekTo(target)
    }

    fun nextChapter() {
        val c = controller ?: return
        if (c.currentMediaItemIndex < c.mediaItemCount - 1) {
            val wasPlaying = c.isPlaying
            markChapterDone(c.currentMediaItemIndex)
            c.seekToNextMediaItem()
            // seekToNextMediaItem can clear playWhenReady; keep playing if we were.
            if (wasPlaying) c.play()
        }
    }

    fun previousChapter() {
        val c = controller ?: return
        val wasPlaying = c.isPlaying
        c.seekToPreviousMediaItem()
        if (wasPlaying) c.play()
    }

    fun setSpeed(speed: Float) {
        controller?.setPlaybackSpeed(speed)
        scope.launch { prefs.setDefaultSpeed(speed) }
        pushState()
    }

    /** Stop App: persist the current position, then stop playback (audio ceases). */
    fun stop() {
        persistPosition()
        controller?.pause()
        controller?.stop()
    }

    private fun startTicker() {
        scope.launch {
            while (controller != null) {
                val c = controller
                if (c != null && c.isPlaying) {
                    persistPosition()
                    checkChapterNearEnd()
                    pushState()
                }
                delay(1_000L)
            }
        }
    }

    private fun checkChapterNearEnd() {
        val c = controller ?: return
        val dur = c.duration.takeIf { it != C.TIME_UNSET } ?: return
        if (dur > 0 && c.currentPosition >= dur - CHAPTER_DONE_THRESHOLD_MS) {
            markChapterDone(c.currentMediaItemIndex)
        }
    }

    private fun markChapterDone(chapterIndex: Int) {
        val book = currentBook ?: return
        scope.launch {
            prefs.markChapterDone(book.id, chapterIndex, true)
            // Book is finished when its last chapter is done.
            if (chapterIndex == book.chapters.lastIndex) prefs.setFinished(book.id, true)
        }
    }

    private fun persistPosition() {
        val c = controller ?: return
        val book = currentBook ?: return
        scope.launch {
            prefs.savePosition(book.id, c.currentMediaItemIndex, c.currentPosition.coerceAtLeast(0L))
        }
    }

    /** Probe each chapter's duration off the main thread and cache it (for total-book progress %). */
    private fun preloadDurations(book: Audiobook) {
        scope.launch {
            val durations = withContext(Dispatchers.IO) {
                val out = mutableMapOf<Int, Long>()
                book.chapters.forEach { ch ->
                    // A fresh retriever per file — reusing one instance across setDataSource calls is flaky.
                    val retriever = MediaMetadataRetriever()
                    runCatching {
                        val path = ch.uri.path
                        if (path != null) retriever.setDataSource(path) else retriever.setDataSource(context, ch.uri)
                        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
                            ?.let { out[ch.index] = it }
                    }
                    runCatching { retriever.release() }
                }
                out
            }
            if (durations.isNotEmpty() && currentBook?.id == book.id) {
                chapterDurations.putAll(durations)
                prefs.cacheDurations(book.id, durations)
                pushState()
            }
        }
    }

    private fun pushState() {
        val c = controller ?: return
        val book = currentBook
        val index = c.currentMediaItemIndex
        val chapterDuration = c.duration.takeIf { it != C.TIME_UNSET } ?: (chapterDurations[index] ?: 0L)
        if (chapterDuration > 0) chapterDurations[index] = chapterDuration
        val position = c.currentPosition.coerceAtLeast(0L)
        val priorMs = (0 until index).sumOf { chapterDurations[it] ?: 0L }
        val totalMs = chapterDurations.values.sum()

        _state.value = PlaybackState(
            isReady = true,
            isPlaying = c.isPlaying,
            bookId = book?.id,
            bookTitle = book?.title ?: c.mediaMetadata.title?.toString().orEmpty(),
            author = book?.author,
            artworkUri = book?.coverUri,
            chapterIndex = index,
            chapterCount = c.mediaItemCount,
            chapterFileName = book?.chapters?.getOrNull(index)?.fileName ?: "",
            positionInChapterMs = position,
            chapterDurationMs = chapterDuration,
            bookPositionMs = priorMs + position,
            bookDurationMs = totalMs,
            speed = c.playbackParameters.speed,
        )
    }
}
