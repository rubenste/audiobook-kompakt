package com.mudita.audiobookplayer.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Dotted black divider for list/settings rows (MMD List component). Lighter than the solid
 * structural dividers — per the "Avoid Grey" guideline we use dots, not grey, to soften a line.
 */
@Composable
fun DottedDivider(
    modifier: Modifier = Modifier,
    color: Color = Color.Black,
    thickness: Dp = 1.dp,
    gap: Dp = 4.dp,
) {
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(thickness),
    ) {
        val dot = size.height
        drawLine(
            color = color,
            start = Offset(dot / 2f, size.height / 2f),
            end = Offset(size.width - dot / 2f, size.height / 2f),
            strokeWidth = size.height,
            cap = StrokeCap.Round,
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(dot, gap.toPx()), 0f),
        )
    }
}
