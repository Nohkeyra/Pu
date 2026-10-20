package com.wawasanpakusop.app.theme

import android.content.Context
import androidx.compose.ui.graphics.Color
import com.wawasanpakusop.app.ui.CustomizeUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class ThemeManager private constructor() {
    private val _uiState = MutableStateFlow(CustomizeUiState())
    val uiState: StateFlow<CustomizeUiState> = _uiState.asStateFlow()

    fun setCurrentStyleProfile(profile: String) {
        _uiState.update { currentState ->
            currentState.copy(currentStyleProfile = profile)
        }
    }

    fun setMainColor(color: Color) {
        _uiState.update { currentState ->
            currentState.copy(mainColor = color)
        }
    }

    fun setFontSizeSp(sizeSp: Int) {
        _uiState.update { currentState ->
            currentState.copy(fontSizeSp = sizeSp)
        }
    }

    fun setCardSizeDp(sizeDp: Int) {
        _uiState.update { currentState ->
            currentState.copy(cardSizeDp = sizeDp)
        }
    }

    companion object {
        @Volatile
        private var INSTANCE: ThemeManager? = null

        fun getInstance(context: Context): ThemeManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: ThemeManager().also { INSTANCE = it }
            }
        }
    }
}
