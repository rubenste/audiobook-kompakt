package com.mudita.audiobookplayer.ui.books

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mudita.audiobookplayer.R
import com.mudita.audiobookplayer.data.LibraryFilter
import com.mudita.audiobookplayer.model.BookStatus
import com.mudita.audiobookplayer.model.LibraryItem
import com.mudita.audiobookplayer.ui.appViewModelFactory
import com.mudita.audiobookplayer.ui.components.DottedDivider
import com.mudita.audiobookplayer.ui.components.clickableNoRipple
import com.mudita.audiobookplayer.ui.components.rememberDebounced
import com.mudita.audiobookplayer.ui.theme.AppType
import com.mudita.mmd.components.bottom_sheet.ModalBottomSheetMMD
import com.mudita.mmd.components.bottom_sheet.rememberModalBottomSheetMMDState
import com.mudita.mmd.components.buttons.OutlinedButtonMMD
import com.mudita.mmd.components.divider.HorizontalDividerMMD
import com.mudita.mmd.components.lazy.LazyColumnMMD
import com.mudita.mmd.components.progress_indicator.CircularProgressIndicatorMMD
import com.mudita.mmd.components.progress_indicator.LinearProgressIndicatorMMD
import com.mudita.mmd.components.radio_button.RadioButtonMMD
import com.mudita.mmd.components.text.TextMMD
import com.mudita.mmd.components.top_app_bar.TopAppBarMMD

private fun LibraryFilter.label(): String = when (this) {
    LibraryFilter.ALL -> "All"
    LibraryFilter.NEW -> "New"
    LibraryFilter.IN_PROGRESS -> "In Progress"
    LibraryFilter.FINISHED -> "Finished"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BooksScreen(
    onOpenSettings: () -> Unit,
    onOpenPlayer: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: BooksViewModel = viewModel(factory = appViewModelFactory()),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(modifier = modifier.fillMaxSize()) {
        // Settings gear in the top bar (right). The filter moves into the list (below).
        TopAppBarMMD(
            title = { TextMMD("Books", style = AppType.screenTitle) },
            showDivider = false,
            actions = {
                IconButton(onClick = rememberDebounced(action = onOpenSettings)) {
                    Icon(Icons.Filled.Settings, contentDescription = "Settings", modifier = Modifier.size(28.dp))
                }
            },
        )
        HorizontalDividerMMD(thickness = 2.dp)

        when {
            state.isLoading -> CenteredMessage(loading = true, text = "Loading library…")
            state.items.isEmpty() -> CenteredMessage(loading = false, text = "No audiobooks found.")
            else -> LazyColumnMMD(modifier = Modifier.fillMaxSize()) {
                // Filter is the first list item — scrolls with the list, not sticky.
                item {
                    OutlinedButtonMMD(
                        onClick = rememberDebounced { viewModel.openFilterSheet() },
                        modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 8.dp),
                    ) {
                        TextMMD("Filter: ${state.filter.label()}", style = AppType.filterLabel)
                    }
                    DottedDivider(modifier = Modifier.padding(horizontal = 16.dp))
                }
                items(items = state.items, key = { it.book.id }) { item ->
                    BookRow(
                        item = item,
                        onClick = { viewModel.onBookSelected(item.book); onOpenPlayer() },
                    )
                    DottedDivider(modifier = Modifier.padding(horizontal = 16.dp))
                }
            }
        }
    }

    if (state.showFilterSheet) {
        val sheetState = rememberModalBottomSheetMMDState()
        ModalBottomSheetMMD(
            onDismissRequest = { viewModel.dismissFilterSheet() },
            sheetState = sheetState,
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                TextMMD("Show", style = AppType.settingLabel)
                Spacer(Modifier.height(8.dp))
                LibraryFilter.entries.forEach { option ->
                    val select = rememberDebounced { viewModel.onFilterSelected(option) }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .clickableNoRipple(select),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButtonMMD(selected = option == state.filter, onClick = select)
                        Spacer(Modifier.padding(horizontal = 8.dp))
                        TextMMD(
                            option.label(),
                            fontWeight = if (option == state.filter) FontWeight.Bold else FontWeight.Normal,
                            style = AppType.body,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun BookRow(item: LibraryItem, onClick: () -> Unit) {
    val debounced = rememberDebounced(action = onClick)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickableNoRipple(debounced)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            item.book.author?.let {
                TextMMD(it, style = AppType.bookAuthor, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            TextMMD(
                item.book.title,
                style = AppType.bookTitle,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            TextMMD(
                "${item.book.chapterCount} chapters",
                style = AppType.bookMeta,
            )
            // In-progress: a thumbless progress bar (per the Progress Bar & Slider guideline).
            if (item.status == BookStatus.IN_PROGRESS) {
                Spacer(Modifier.height(8.dp))
                LinearProgressIndicatorMMD(
                    progress = { item.fraction },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
        // Finished: a check mark instead of a progress bar.
        if (item.status == BookStatus.FINISHED) {
            Icon(
                painterResource(R.drawable.ic_check_circle),
                contentDescription = "Finished",
                modifier = Modifier.size(28.dp),
            )
        }
    }
}

@Composable
private fun CenteredMessage(loading: Boolean, text: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            if (loading) {
                CircularProgressIndicatorMMD()
                Spacer(Modifier.height(12.dp))
            }
            TextMMD(text, style = AppType.body)
        }
    }
}
