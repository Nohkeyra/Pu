import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface DashboardUiState {
  isOpen: boolean;
  whatsappNumber: string;
  whatsappMessage: string;
  breakfastTitle: string;
  lunchTitle: string;
  hiteaTitle: string;
  businessHours: string;
  footerAnnouncement: string;
}

export default function WawasanNeonDashboard() {
  const [liveData, setLiveData] = useState<DashboardUiState>({
    isOpen: true,
    whatsappNumber: "60123456789",
    whatsappMessage: "Salam Pak Usop, saya nak order makanan.",
    breakfastTitle: "NASI LEMAK & KUIH-MUIH FRESH",
    lunchTitle: "NASI CAMPUR & MEE REBUS PAK USOP",
    hiteaTitle: "ROJAK SINGAPORE & TEH TARIK",
    businessHours: "OPEN FOR BREAKFAST, LUNCH & HI-TEA ONLY",
    footerAnnouncement: "JARANG TAK SEDAP!"
  });

  const config = {
    fontSizeSp: 18,
    cardSizeDp: 120,
    mainColor: "#F69913"
  };

  useEffect(() => {
    try {
      const docRef = doc(db, 'restaurant_metadata', 'wawasan_status');
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setLiveData({
              isOpen: data.isOpen ?? true,
              whatsappNumber: data.whatsappNumber || '60123456789',
              whatsappMessage: data.whatsappMessage || 'Salam Pak Usop, saya nak order makanan.',
              breakfastTitle: data.breakfastTitle || 'NASI LEMAK & KUIH-MUIH FRESH',
              lunchTitle: data.lunchTitle || 'NASI CAMPUR & MEE REBUS PAK USOP',
              hiteaTitle: data.hiteaTitle || 'ROJAK SINGAPORE & TEH TARIK',
              businessHours: data.businessHours || 'OPEN FOR BREAKFAST, LUNCH & HI-TEA ONLY',
              footerAnnouncement: data.footerAnnouncement || 'JARANG TAK SEDAP!',
            });
          }
        },
        (error) => {
          console.warn('Firestore snapshot listener warning:', error);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.error('Failed to attach snapshot listener:', e);
    }
  }, []);

  const handleWhatsAppClick = () => {
    const encodedMsg = encodeURIComponent(liveData.whatsappMessage);
    window.open(`https://wa.me/${liveData.whatsappNumber}?text=${encodedMsg}`, '_blank');
  };

  return (
    <div className="w-full min-h-screen bg-[#030A09] text-[#f4ecd8] p-4 flex flex-col items-center justify-start font-sans antialiased selection:bg-[#E03F14]">
      
      {/* ==========================================
          1. NEON HEADER PANEL
         ========================================== */}
      <header className="w-full max-w-[450px] flex flex-col items-center py-6 mb-2">
        <h1 className="font-black text-4xl text-white text-center leading-none tracking-tight select-none">
          WAWASAN<br />PAK USOP
        </h1>
        
        {/* Multilayered Horizontal Neon Accent Divider Line */}
        <div className="w-3/5 h-[3px] mt-3 bg-gradient-to-r from-[#E03F14] via-[#F69913] to-[#0C453C] rounded-full shadow-[0_0_8px_rgba(246,153,19,0.5)]" />
        
        <p className="mt-3 font-mono text-[10px] tracking-wider text-center font-bold uppercase" style={{ color: config.mainColor }}>
          {liveData.businessHours}
        </p>
      </header>

      {/* ==========================================
          2. CORE BENTO ARRAY CONTAINER
         ========================================== */}
      <main className="w-full max-w-[450px] flex flex-col gap-4">
        
        {/* PRIMARY CALL TO ACTION: WHATSAPP DIRECT LINK INTEGRATION */}
        <div 
          onClick={handleWhatsAppClick}
          className="w-full rounded-[14px] bg-[#030A09] border-[1.2px] border-white p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer select-none active:scale-[0.99]"
          style={{ 
            height: `${config.cardSizeDp}px`,
            boxShadow: `0 0 0 3px rgba(224,63,20,0.4), 0 0 0 6px rgba(224,63,20,0.15)`
          }}
        >
          <span className="font-mono text-[10px] font-black tracking-wider text-[#E03F14] uppercase">
            {liveData.isOpen ? "● ACCEPTING ORDERS LIVE" : "● KITCHEN CLOSED"}
          </span>
          <span className="font-black uppercase leading-tight text-white" style={{ fontSize: `${config.fontSizeSp}px` }}>
            ORDER LUNCH VIA WHATSAPP 📱
          </span>
        </div>

        {/* ASYMMETRIC GRID COLUMN SPLIT: BREAKFAST & LUNCH MATRIX */}
        <div className="w-full grid grid-cols-2 gap-3">
          
          {/* BREAKFAST CONTAINER BLOCK */}
          <div 
            className="h-[130px] rounded-[14px] bg-[#030A09] border border-white p-4 flex flex-col justify-between transition-transform duration-200 cursor-pointer active:scale-[0.98]"
            style={{ boxShadow: `0 0 0 4px rgba(233,98,18,0.35)` }}
          >
            <span className="font-mono text-[9px] text-[#E96212] font-bold tracking-widest">🕒 07:00 AM</span>
            <span className="font-black text-white leading-tight uppercase" style={{ fontSize: `${Math.max(11, config.fontSizeSp - 3)}px` }}>
              {liveData.breakfastTitle}
            </span>
          </div>

          {/* LUNCH CONTAINER BLOCK */}
          <div 
            className="h-[130px] rounded-[14px] bg-[#030A09] border border-white p-4 flex flex-col justify-between transition-transform duration-200 cursor-pointer active:scale-[0.98]"
            style={{ boxShadow: `0 0 0 4px rgba(246,153,19,0.35)` }}
          >
            <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: config.mainColor }}>📋 12:00 PM</span>
            <span className="font-black text-white leading-tight uppercase" style={{ fontSize: `${Math.max(11, config.fontSizeSp - 3)}px` }}>
              {liveData.lunchTitle}
            </span>
          </div>

        </div>

        {/* SECONDARY ROW TARGET: HI-TEA OPERATIONAL TIMELINE WINDOW */}
        <div 
          className="w-full h-[100px] rounded-[14px] bg-[#030A09] border border-white p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer active:scale-[0.99]"
          style={{ boxShadow: `0 0 0 4px rgba(12,69,60,0.4)` }}
        >
          <span className="font-mono text-[10px] text-white/60 font-bold tracking-wider">🕒 04:00 PM // HI-TEA</span>
          <span className="font-black text-white uppercase leading-tight" style={{ fontSize: `${Math.max(12, config.fontSizeSp - 2)}px` }}>
            {liveData.hiteaTitle}
          </span>
        </div>

      </main>

      {/* ==========================================
          3. GRAPHIC ACCENT INTERFACE FOOTER
         ========================================== */}
      <footer className="mt-8 font-black text-2xl text-[#E03F14] tracking-wide select-none drop-shadow-[0_2px_4px_rgba(224,63,20,0.3)]">
        {liveData.footerAnnouncement}
      </footer>

    </div>
  );
}
