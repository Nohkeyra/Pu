package com.wawasanpakusop.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.firestore.FirebaseFirestore
import com.wawasanpakusop.app.theme.ThemeManager

@Composable
fun WawasanNeonDashboard(
    onWhatsAppClick: (String, String) -> Unit = { _, _ -> },
    onMenuNavigate: (String) -> Unit = {}
) {
    val context = LocalContext.current
    val themeManager = ThemeManager.getInstance(context)
    val uiState by themeManager.uiState.collectAsState()

    var liveData by remember { mutableStateOf(DashboardUiState()) }

    DisposableEffect(Unit) {
        val db = FirebaseFirestore.getInstance()
        val listenerRegistration = db.collection("restaurant_metadata")
            .document("wawasan_status")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    liveData = DashboardUiState(
                        isOpen = snapshot.getBoolean("isOpen") ?: true,
                        whatsappNumber = snapshot.getString("whatsappNumber") ?: "60123456789",
                        whatsappMessage = snapshot.getString("whatsappMessage") ?: "Salam Pak Usop...",
                        breakfastTitle = snapshot.getString("breakfastTitle") ?: "BREAKFAST MENU",
                        lunchTitle = snapshot.getString("lunchTitle") ?: "LUNCH MATRIX MENU",
                        hiteaTitle = snapshot.getString("hiteaTitle") ?: "HI-TEA / MINUM PETANG",
                        businessHours = snapshot.getString("businessHours") ?: "OPEN FOR BREAKFAST, LUNCH & HI-TEA ONLY",
                        footerAnnouncement = snapshot.getString("footerAnnouncement") ?: "JARANG TAK SEDAP!"
                    )
                }
            }
        
        onDispose {
            listenerRegistration.remove()
        }
    }

    val nightBg = Color(0xFF030A09)
    val neonTeal = Color(0xFF0C453C)
    val neonGold = uiState.mainColor 
    val neonOrange = Color(0xFFE96212)
    val neonTomato = Color(0xFFE03F14)
    val cardShape = RoundedCornerShape(14.dp)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(nightBg)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("WAWASAN\nPAK USOP", color = Color.White, fontSize = 38.sp, fontWeight = FontWeight.Black, lineHeight = 34.sp, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(10.dp))
            Box(modifier = Modifier.fillMaxWidth(0.6f).height(3.dp).background(Brush.horizontalGradient(colors = listOf(neonTomato, neonGold, neonTeal))))
            Spacer(modifier = Modifier.height(6.dp))
            Text(liveData.businessHours, color = neonGold, fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, fontFamily = FontFamily.Monospace)
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .height(uiState.cardSizeDp.dp)
                .border(5.dp, neonTomato.copy(alpha = 0.15f), cardShape)
                .border(2.5.dp, neonTomato.copy(alpha = 0.4f), cardShape)
                .border(1.2.dp, Color.White, cardShape)
                .clip(cardShape)
                .background(nightBg)
                .clickable { onWhatsAppClick(liveData.whatsappNumber, liveData.whatsappMessage) }
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(if (liveData.isOpen) "● ACCEPTING ORDERS LIVE" else "● KITCHEN CLOSED", color = neonTomato, fontSize = 11.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
            Text("ORDER LUNCH VIA WHATSAPP 📱", color = Color.White, fontSize = uiState.fontSizeSp.sp, fontWeight = FontWeight.Black)
        }

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(
                modifier = Modifier.weight(1f).height(130.dp).border(4.dp, neonOrange.copy(alpha = 0.35f), cardShape).border(1.dp, Color.White, cardShape).clip(cardShape).background(nightBg).clickable { onMenuNavigate("breakfast") }.padding(14.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Text("🕒 07:00 AM", color = neonOrange, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
                Text(liveData.breakfastTitle, color = Color.White, fontSize = (uiState.fontSizeSp - 3).coerceAtLeast(11).sp, fontWeight = FontWeight.ExtraBold)
            }
            Column(
                modifier = Modifier.weight(1f).height(130.dp).border(4.dp, neonGold.copy(alpha = 0.35f), cardShape).border(1.dp, Color.White, cardShape).clip(cardShape).background(nightBg).clickable { onMenuNavigate("lunch") }.padding(14.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Text("🕛 12:00 PM", color = neonGold, fontSize = 9.sp, fontFamily = FontFamily.Monospace)
                Text(liveData.lunchTitle, color = Color.White, fontSize = (uiState.fontSizeSp - 3).coerceAtLeast(11).sp, fontWeight = FontWeight.ExtraBold)
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .border(4.dp, neonTeal.copy(alpha = 0.4f), cardShape)
                .border(1.dp, Color.White, cardShape)
                .clip(cardShape)
                .background(nightBg)
                .clickable { onMenuNavigate("hitea") }
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text("🕒 04:00 PM // HI-TEA", color = Color.White.copy(alpha = 0.6f), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
            Text(liveData.hiteaTitle, color = Color.White, fontSize = (uiState.fontSizeSp - 2).coerceAtLeast(12).sp, fontWeight = FontWeight.Bold)
        }

        Spacer(modifier = Modifier.height(8.dp))
        Text(liveData.footerAnnouncement, color = neonTomato, fontSize = 24.sp, fontWeight = FontWeight.Black)
    }
}
