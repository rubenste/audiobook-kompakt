package com.mudita.audiobookplayer.data

import android.content.Context
import android.os.Environment
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONObject

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "audiobooks")

/** User settings (spec: root folder + default playback speed). */
data class AppSettings(
    val rootPath: String,
    val defaultSpeed: Float = 1.0f,
) {
    companion object {
        val SPEED_OPTIONS = listOf(1.0f, 1.25f, 1.5f, 1.75f, 2.0f)
    }
}

/**
 * Persists settings and per-book listening progress. Progress is stored as a single JSON blob
 * (no extra dependencies); for a personal audiobook library the data is small enough that
 * read-modify-write on each save is fine.
 */
class AppPreferences(context: Context) {

    private val dataStore = context.dataStore
    private val defaultRoot = Environment.getExternalStorageDirectory().absolutePath + "/Audiobooks"

    val settings: Flow<AppSettings> = dataStore.data.map { prefs ->
        AppSettings(
            rootPath = prefs[KEY_ROOT_PATH] ?: defaultRoot,
            defaultSpeed = prefs[KEY_DEFAULT_SPEED] ?: 1.0f,
        )
    }

    val progress: Flow<Map<String, BookProgress>> =
        dataStore.data.map { parseProgress(it[KEY_PROGRESS]) }

    suspend fun currentProgress(): Map<String, BookProgress> = progress.first()

    suspend fun setRootPath(path: String) {
        dataStore.edit { it[KEY_ROOT_PATH] = path }
    }

    suspend fun setDefaultSpeed(speed: Float) {
        dataStore.edit { it[KEY_DEFAULT_SPEED] = speed }
    }

    /** Read-modify-write the progress entry for one book. */
    private suspend fun updateBook(bookId: String, transform: (BookProgress) -> BookProgress) {
        dataStore.edit { prefs ->
            val all = parseProgress(prefs[KEY_PROGRESS]).toMutableMap()
            val updated = transform(all[bookId] ?: BookProgress())
            all[bookId] = updated
            prefs[KEY_PROGRESS] = serializeProgress(all)
        }
    }

    suspend fun markOpened(bookId: String) = updateBook(bookId) {
        if (it.isOpened) it else it.copy(openedAt = System.currentTimeMillis())
    }

    suspend fun setLastChapter(bookId: String, chapterIndex: Int) = updateBook(bookId) {
        it.copy(lastChapterIndex = chapterIndex, openedAt = if (it.isOpened) it.openedAt else System.currentTimeMillis())
    }

    suspend fun savePosition(bookId: String, chapterIndex: Int, positionMs: Long) = updateBook(bookId) { book ->
        val ch = book.chapters[chapterIndex] ?: ChapterProgress()
        book.copy(chapters = book.chapters + (chapterIndex to ch.copy(positionMs = positionMs)))
    }

    suspend fun markChapterDone(bookId: String, chapterIndex: Int, done: Boolean) = updateBook(bookId) { book ->
        val ch = book.chapters[chapterIndex] ?: ChapterProgress()
        book.copy(chapters = book.chapters + (chapterIndex to ch.copy(done = done)))
    }

    /** Cache probed chapter durations (index -> ms). Needed for total-duration progress %. */
    suspend fun cacheDurations(bookId: String, durations: Map<Int, Long>) = updateBook(bookId) { book ->
        val merged = book.chapters.toMutableMap()
        durations.forEach { (index, dur) ->
            val ch = merged[index] ?: ChapterProgress()
            merged[index] = ch.copy(durationMs = dur)
        }
        book.copy(chapters = merged)
    }

    suspend fun setFinished(bookId: String, finished: Boolean) = updateBook(bookId) {
        it.copy(finishedAt = if (finished) System.currentTimeMillis() else 0L)
    }

    // --- JSON (de)serialization of the progress map ---

    private fun parseProgress(json: String?): Map<String, BookProgress> {
        if (json.isNullOrBlank()) return emptyMap()
        return runCatching {
            val root = JSONObject(json)
            buildMap {
                root.keys().forEach { bookId ->
                    val b = root.getJSONObject(bookId)
                    val chJson = b.optJSONObject("ch") ?: JSONObject()
                    val chapters = buildMap<Int, ChapterProgress> {
                        chJson.keys().forEach { idx ->
                            val c = chJson.getJSONObject(idx)
                            put(
                                idx.toInt(),
                                ChapterProgress(
                                    positionMs = c.optLong("pos"),
                                    durationMs = c.optLong("dur"),
                                    done = c.optBoolean("done"),
                                ),
                            )
                        }
                    }
                    put(
                        bookId,
                        BookProgress(
                            lastChapterIndex = b.optInt("last"),
                            openedAt = b.optLong("opened"),
                            finishedAt = b.optLong("finished"),
                            chapters = chapters,
                        ),
                    )
                }
            }
        }.getOrDefault(emptyMap())
    }

    private fun serializeProgress(map: Map<String, BookProgress>): String {
        val root = JSONObject()
        map.forEach { (bookId, bp) ->
            val ch = JSONObject()
            bp.chapters.forEach { (index, cp) ->
                ch.put(
                    index.toString(),
                    JSONObject()
                        .put("pos", cp.positionMs)
                        .put("dur", cp.durationMs)
                        .put("done", cp.done),
                )
            }
            root.put(
                bookId,
                JSONObject()
                    .put("last", bp.lastChapterIndex)
                    .put("opened", bp.openedAt)
                    .put("finished", bp.finishedAt)
                    .put("ch", ch),
            )
        }
        return root.toString()
    }

    private companion object {
        val KEY_ROOT_PATH = stringPreferencesKey("root_path")
        val KEY_DEFAULT_SPEED = floatPreferencesKey("default_speed")
        val KEY_PROGRESS = stringPreferencesKey("progress_json")
    }
}
