package com.wawasanpakusop.app.ui.dashboard

/**
 * Production DTO mapping state variables directly from Cloud Firestore.
 * Explicitly structures Wawasan Pak Usop's operating timeline windows.
 */
data class DashboardUiState(
    val isOpen: Boolean = true,
    val whatsappNumber: String = "60123456789",
    val whatsappMessage: String = "Salam Pak Usop, saya nak order makanan.",
    val breakfastTitle: String = "NASI LEMAK & KUIH-MUIH FRESH",
    val lunchTitle: String = "NASI CAMPUR & MEE REBUS PAK USOP",
    val hiteaTitle: String = "ROJAK SINGAPORE & TEH TARIK",
    val businessHours: String = "OPEN FOR BREAKFAST, LUNCH & HI-TEA ONLY",
    val footerAnnouncement: String = "JARANG TAK SEDAP!"
)
