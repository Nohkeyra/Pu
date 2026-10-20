package com.wawasanpakusop.app.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import com.wawasanpakusop.app.ui.CustomizeUiState

// Default Core Wawasan Theme Colors
val TomatoBurst = Color(0xFFE03F14)
val RoyalGold = Color(0xFFF69913)
val DeepForest = Color(0xFF0C453C)
val DarkBackground = Color(0xFF030A09)
val SurfaceDark = Color(0xFF121214)

private val DarkColorScheme = darkColorScheme(
    primary = RoyalGold,
    secondary = TomatoBurst,
    tertiary = DeepForest,
    background = DarkBackground,
    surface = SurfaceDark,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = Color(0xFFF4ECD8),
    onSurface = Color(0xFFF4ECD8)
)

private val LightColorScheme = lightColorScheme(
    primary = TomatoBurst,
    secondary = RoyalGold,
    tertiary = DeepForest,
    background = Color(0xFFFCF5E3),
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = Color.Black,
    onBackground = Color(0xFF1B1B1E),
    onSurface = Color(0xFF1B1B1E)
)

@Composable
fun AppTheme(
    uiState: CustomizeUiState = CustomizeUiState(),
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    // Dynamic color override based on active custom profile or mainColor
    val activePrimary = when (uiState.currentStyleProfile) {
        "NEO_BRUTALIST" -> TomatoBurst
        "NEON_NIGHT" -> RoyalGold
        else -> uiState.mainColor
    }

    // Fix: Memoize the color scheme to prevent unnecessary allocations on every recomposition
    val colorScheme = remember(activePrimary, darkTheme) {
        val baseColorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
        baseColorScheme.copy(primary = activePrimary)
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
