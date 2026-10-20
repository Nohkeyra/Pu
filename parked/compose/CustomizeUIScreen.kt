package com.wawasanpakusop.app.ui

import com.wawasanpakusop.app.theme.ThemeManager

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class CustomizeUiState(
    val currentStyleProfile: String = "DEFAULT",
    val fontSizeSp: Int = 16,
    val cardSizeDp: Int = 120,
    val mainColor: Color = Color(0xFFF69913)
)

@Composable
fun CustomizeUIScreen(
    uiState: CustomizeUiState,
    themeManager: ThemeManager,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        // ============================================================================
        // GOOGLE AI STUDIO INSTRUCTION METADATA
        // TARGET FILE: CustomizeUIScreen.kt (Place inside the main Column container)
        // OBJECTIVE: Append a global layout profile switcher component.
        // DEPENDENCIES: ThemeManager instance (themeManager), UI state flow (uiState)
        // CRITICAL: Ensure full variable continuity with the existing state flow structure.
        // ============================================================================

        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.GridView, 
                        contentDescription = null, 
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Select Design Profile (Global Override)", 
                        fontWeight = FontWeight.Bold, 
                        fontSize = 16.sp
                    )
                }
                
                Spacer(modifier = Modifier.height(14.dp))
                
                // 1. OPTION BLOCK: STREET NEO-BRUTALIST PROFILE
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .background(
                            if (uiState.currentStyleProfile == "NEO_BRUTALIST") MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) 
                            else Color.Transparent, 
                            RoundedCornerShape(12.dp)
                        )
                        .border(
                            width = if (uiState.currentStyleProfile == "NEO_BRUTALIST") 2.dp else 1.dp,
                            color = if (uiState.currentStyleProfile == "NEO_BRUTALIST") MaterialTheme.colorScheme.primary else Color.LightGray.copy(alpha = 0.3f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .clickable {
                            // Update state variables synchronously to trigger global recomposition
                            themeManager.setCurrentStyleProfile("NEO_BRUTALIST")
                            themeManager.setMainColor(Color(0xFFE03F14)) // Hard reset to Tomato Burst
                        }
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "🔥 Street Neo-Brutalist", 
                            fontWeight = FontWeight.ExtraBold, 
                            fontSize = 14.sp
                        )
                        Text(
                            text = "Asymmetric bento boxes, thick black borders, high-impact high-contrast blocks.", 
                            fontSize = 11.sp, 
                            color = Color.Gray,
                            lineHeight = 15.sp
                        )
                    }
                    RadioButton(
                        selected = uiState.currentStyleProfile == "NEO_BRUTALIST",
                        onClick = {
                            themeManager.setCurrentStyleProfile("NEO_BRUTALIST")
                            themeManager.setMainColor(Color(0xFFE03F14))
                        }
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                // 2. OPTION BLOCK: NEON NIGHT MARKET PROFILE
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .background(
                            if (uiState.currentStyleProfile == "NEON_NIGHT") MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) 
                            else Color.Transparent, 
                            RoundedCornerShape(12.dp)
                        )
                        .border(
                            width = if (uiState.currentStyleProfile == "NEON_NIGHT") 2.dp else 1.dp,
                            color = if (uiState.currentStyleProfile == "NEON_NIGHT") MaterialTheme.colorScheme.primary else Color.LightGray.copy(alpha = 0.3f),
                            shape = RoundedCornerShape(12.dp)
                        )
                        .clickable {
                            themeManager.setCurrentStyleProfile("NEON_NIGHT")
                            themeManager.setMainColor(Color(0xFFF69913)) // Hard reset to Neon Gold
                        }
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "🌌 Neon Night Market", 
                            fontWeight = FontWeight.ExtraBold, 
                            fontSize = 14.sp
                        )
                        Text(
                            text = "Authentic night market vibe, pitch-black cyberpunk backdrop, layered glowing neon tube outlines.", 
                            fontSize = 11.sp, 
                            color = Color.Gray,
                            lineHeight = 15.sp
                        )
                    }
                    RadioButton(
                        selected = uiState.currentStyleProfile == "NEON_NIGHT",
                        onClick = {
                            themeManager.setCurrentStyleProfile("NEON_NIGHT")
                            themeManager.setMainColor(Color(0xFFF69913))
                        }
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(14.dp)) // Dynamic structural buffer gap
    }
}
