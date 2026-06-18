package com.mudita.audiobookplayer.ui.books

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mudita.audiobookplayer.data.AppPreferences
import com.mudita.audiobookplayer.data.LibraryFilter
import com.mudita.audiobookplayer.data.LibraryRepository
import com.mudita.audiobookplayer.model.Audiobook
import com.mudita.audiobookplayer.model.LibraryItem
import com.mudita.audiobookplayer.playback.PlaybackConnection
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class BooksUiState(
    val isLoading: Boolean = true,
    val filter: LibraryFilter = LibraryFilter.ALL,
    val items: List<LibraryItem> = emptyList(),
    val showFilterSheet: Boolean = false,
)

class BooksViewModel(
    private val repository: LibraryRepository,
    private val preferences: AppPreferences,
    private val playbackConnection: PlaybackConnection,
) : ViewModel() {

    private val scanned = MutableStateFlow<List<Audiobook>>(emptyList())
    private val filter = MutableStateFlow(LibraryFilter.ALL)
    private val loading = MutableStateFlow(true)
    private val showSheet = MutableStateFlow(false)

    val uiState: StateFlow<BooksUiState> =
        combine(scanned, preferences.progress, filter, loading, showSheet) { books, progress, f, isLoading, sheet ->
            val merged = repository.merge(books, progress)
            BooksUiState(
                isLoading = isLoading,
                filter = f,
                items = repository.applyFilter(merged, f),
                showFilterSheet = sheet,
            )
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), BooksUiState())

    init {
        refresh()
    }

    fun refresh() {
        loading.value = true
        viewModelScope.launch {
            val rootPath = preferences.settings.first().rootPath
            scanned.value = repository.scan(rootPath)
            loading.value = false
        }
    }

    fun onFilterSelected(value: LibraryFilter) {
        filter.value = value
        showSheet.value = false
    }

    fun openFilterSheet() { showSheet.value = true }
    fun dismissFilterSheet() { showSheet.value = false }

    fun onBookSelected(book: Audiobook) {
        playbackConnection.openBook(book, autoPlay = true)
    }
}
