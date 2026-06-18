package com.mudita.audiobookplayer.data

import android.net.Uri
import com.mudita.audiobookplayer.model.Audiobook
import com.mudita.audiobookplayer.model.Chapter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * Scans the audiobook root folder (default `/sdcard/Audiobooks/`) into [Audiobook]s.
 *
 * Per the spec, two folder layouts are supported:
 *  - **Two-level** `Author/BookTitle/files…` — author from the parent folder.
 *  - **Flat** `BookTitle/files…` or `Author - Title/files…` — author parsed from `Author - Title`.
 *
 * Each leaf folder containing audio files is one book; the files inside are chapters, sorted
 * alphabetically. Chapter durations are NOT read here (kept fast) — they're probed lazily when a
 * book is opened.
 */
class AudiobookScanner {

    suspend fun scan(rootPath: String): List<Audiobook> = withContext(Dispatchers.IO) {
        val root = File(rootPath)
        if (!root.isDirectory) return@withContext emptyList()

        val books = mutableListOf<Audiobook>()
        for (entry in root.listDirectories()) {
            val directAudio = entry.audioFiles()
            if (directAudio.isNotEmpty()) {
                // Flat layout: this folder is a book.
                books += buildBook(folder = entry, audioFiles = directAudio, authorFromParent = null)
            } else {
                // Two-level layout: this folder is an author; each subfolder with audio is a book.
                for (sub in entry.listDirectories()) {
                    val subAudio = sub.audioFiles()
                    if (subAudio.isNotEmpty()) {
                        books += buildBook(folder = sub, audioFiles = subAudio, authorFromParent = entry.name)
                    }
                }
            }
        }
        books.sortedBy { it.title.lowercase() }
    }

    private fun buildBook(folder: File, audioFiles: List<File>, authorFromParent: String?): Audiobook {
        val (author, title) = when {
            authorFromParent != null -> authorFromParent to folder.name
            folder.name.contains(" - ") -> {
                val parts = folder.name.split(" - ", limit = 2)
                parts[0].trim() to parts[1].trim()
            }
            else -> null to folder.name
        }
        val chapters = audioFiles
            .sortedBy { it.name.lowercase() }
            .mapIndexed { index, file ->
                Chapter(index = index, fileName = file.name, uri = Uri.fromFile(file))
            }
        return Audiobook(
            id = folder.absolutePath,
            title = title,
            author = author,
            folderPath = folder.absolutePath,
            coverUri = folder.findCover()?.let { Uri.fromFile(it) },
            chapters = chapters,
        )
    }

    private fun File.listDirectories(): List<File> =
        (listFiles()?.toList() ?: emptyList()).filter { it.isDirectory }.sortedBy { it.name.lowercase() }

    private fun File.audioFiles(): List<File> =
        (listFiles()?.toList() ?: emptyList())
            .filter { it.isFile && it.extension.lowercase() in AUDIO_EXTENSIONS }

    private fun File.findCover(): File? =
        (listFiles()?.toList() ?: emptyList())
            .firstOrNull { it.isFile && it.name.lowercase() in COVER_NAMES }

    private companion object {
        val AUDIO_EXTENSIONS = setOf("mp3", "m4a", "m4b", "mp4")
        val COVER_NAMES = setOf("cover.jpg", "cover.jpeg", "cover.png", "folder.jpg", "folder.png")
    }
}
