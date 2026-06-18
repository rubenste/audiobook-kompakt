package com.mudita.audiobookplayer.ui.settings

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.os.SystemClock
import android.provider.DocumentsContract
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mudita.audiobookplayer.playback.PlaybackService
import com.mudita.audiobookplayer.ui.appViewModelFactory
import com.mudita.audiobookplayer.ui.components.DottedDivider
import com.mudita.audiobookplayer.ui.components.clickableNoRipple
import com.mudita.audiobookplayer.ui.components.rememberDebounced
import com.mudita.audiobookplayer.ui.theme.AppType
import com.mudita.mmd.components.bottom_sheet.ModalBottomSheetMMD
import com.mudita.mmd.components.bottom_sheet.rememberModalBottomSheetMMDState
import com.mudita.mmd.components.divider.HorizontalDividerMMD
import com.mudita.mmd.components.text.TextMMD
import com.mudita.mmd.components.top_app_bar.TopAppBarMMD
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = viewModel(factory = appViewModelFactory()),
) {
    val settings by viewModel.settings.collectAsStateWithLifecycle()
    val context = LocalContext.current

    val folderPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        uri?.let { resolveTreePathOrNull(it)?.let(viewModel::setRootPath) }
    }

    // Secret debug: tap the title 5x rapidly.
    var tapCount by remember { mutableStateOf(0) }
    var lastTap by remember { mutableStateOf(0L) }
    var showDebug by remember { mutableStateOf(false) }
    val onTitleTap = {
        val now = SystemClock.elapsedRealtime()
        tapCount = if (now - lastTap < 600L) tapCount + 1 else 1
        lastTap = now
        if (tapCount >= 5) { showDebug = true; tapCount = 0 }
    }

    Column(modifier = modifier.fillMaxSize()) {
        TopAppBarMMD(
            title = {
                TextMMD("Settings", style = AppType.screenTitle, modifier = Modifier.clickableNoRipple(onTitleTap))
            },
            navigationIcon = {
                IconButton(onClick = rememberDebounced(action = onBack)) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", modifier = Modifier.size(24.dp))
                }
            },
            showDivider = false,
        )
        HorizontalDividerMMD(thickness = 2.dp)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
        ) {
            SettingRow(
                label = "Root folder",
                value = settings.rootPath,
                onClick = rememberDebounced { folderPicker.launch(null) },
                valueBelow = true,
            )
            DottedDivider(modifier = Modifier.padding(horizontal = 16.dp))
            SettingRow(
                label = "Default speed",
                value = "${formatSpeed(settings.defaultSpeed)}x",
                onClick = rememberDebounced { viewModel.cycleDefaultSpeed(settings.defaultSpeed) },
            )
            DottedDivider(modifier = Modifier.padding(horizontal = 16.dp))
            SettingRow(
                label = "Stop app",
                value = "",
                onClick = rememberDebounced {
                    viewModel.stopPlayback()
                    context.stopService(Intent(context, PlaybackService::class.java))
                    (context as? Activity)?.finishAndRemoveTask()
                },
            )
            DottedDivider(modifier = Modifier.padding(horizontal = 16.dp))
        }
    }

    if (showDebug) {
        val progress by viewModel.progress.collectAsStateWithLifecycle()
        val sheetState = rememberModalBottomSheetMMDState()
        ModalBottomSheetMMD(onDismissRequest = { showDebug = false }, sheetState = sheetState) {
            Column(modifier = Modifier.padding(16.dp).verticalScroll(rememberScrollState())) {
                TextMMD("Debug — stored progress", style = AppType.settingLabel)
                if (progress.isEmpty()) {
                    TextMMD("(empty)", style = AppType.body)
                }
                progress.forEach { (id, bp) ->
                    val name = id.substringAfterLast('/')
                    val pct = (bp.fraction() * 100).roundToInt()
                    TextMMD(
                        "$name — ch ${bp.lastChapterIndex}, $pct%, opened=${bp.openedAt > 0}, finished=${bp.isFinished}",
                        style = AppType.filename,
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingRow(
    label: String,
    value: String,
    onClick: () -> Unit,
    valueBelow: Boolean = false,
) {
    val base = Modifier
        .fillMaxWidth()
        .clickableNoRipple(onClick)
        .padding(horizontal = 16.dp, vertical = 32.dp)
    if (valueBelow) {
        Column(modifier = base) {
            TextMMD(label, style = AppType.settingLabel)
            if (value.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                TextMMD(value, style = AppType.settingValue)
            }
        }
    } else {
        Row(
            modifier = base,
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            TextMMD(label, style = AppType.settingLabel)
            if (value.isNotBlank()) {
                TextMMD(value, style = AppType.settingValue)
            }
        }
    }
}

/** Resolve a primary-storage SAF tree Uri to an absolute path for the File-based scanner. */
private fun resolveTreePathOrNull(uri: Uri): String? {
    val docId = runCatching { DocumentsContract.getTreeDocumentId(uri) }.getOrNull() ?: return null
    val parts = docId.split(":", limit = 2)
    if (parts[0] != "primary") return null
    val sub = parts.getOrNull(1).orEmpty()
    val base = Environment.getExternalStorageDirectory().absolutePath
    return if (sub.isBlank()) base else "$base/$sub"
}

private fun formatSpeed(speed: Float): String =
    if (speed % 1f == 0f) speed.toInt().toString() else speed.toString()
