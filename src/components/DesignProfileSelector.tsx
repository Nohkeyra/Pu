import React from 'react';
import { useSettings, type StyleProfile } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';
import { useToast } from '@/components/ui/Toast';
import {
  Sun,
  Moon,
  Sparkles,
  Check,
  RotateCcw,
  Palette,
  Flame,
  Zap,
  Coffee,
  Shapes,
  Compass,
} from 'lucide-react';

interface ProfileMeta {
  id: StyleProfile;
  nameEn: string;
  nameBm: string;
  taglineEn: string;
  taglineBm: string;
  icon: React.ComponentType<{ className?: string }>;
  vibeBadge: string;
  colors: {
    day: { primary: string; surface: string; text: string; accent: string };
    night: { primary: string; surface: string; text: string; accent: string };
  };
  sampleButtonText: { en: string; bm: string };
  sampleCardTitle: { en: string; bm: string };
}

const PROFILES: ProfileMeta[] = [
  {
    id: 'DEFAULT',
    nameEn: 'Nusantara Heritage',
    nameBm: 'Warisan Nusantara',
    taglineEn: 'Authentic Malaysian kopitiam warmth with forest green, golden mustard & royal batik accents.',
    taglineBm: 'Kehangatan kopitiam warisan Malaysia dengan hijau rimba, kuning mustard & motif batik diraja.',
    icon: Compass,
    vibeBadge: 'Original Wawasan',
    colors: {
      day: { primary: '#E03F14', surface: '#FCF5E3', text: '#0C453C', accent: '#F69913' },
      night: { primary: '#F69913', surface: '#141E1C', text: '#F5F5F5', accent: '#D4A853' },
    },
    sampleButtonText: { en: 'Order Now', bm: 'Pesan Sekarang' },
    sampleCardTitle: { en: 'Nasi Lemak Ayam Berempah', bm: 'Nasi Lemak Ayam Berempah' },
  },
  {
    id: 'NEO_BRUTALIST',
    nameEn: 'Street Neo-Brutalist',
    nameBm: 'Neo-Brutalis Jalanan',
    taglineEn: 'Raw modernist edge: 0px sharp corners, bold inky borders, hard-drop offset shadows, and heavy uppercase type.',
    taglineBm: 'Gaya moden mentah: bucu tajam 0px, bingkai tebal hitam, bayang offset keras, dan tipografi tebal.',
    icon: Zap,
    vibeBadge: 'High-Impact Raw',
    colors: {
      day: { primary: '#E03F14', surface: '#FFFFFF', text: '#000000', accent: '#000000' },
      night: { primary: '#E03F14', surface: '#0A0A0A', text: '#FFFFFF', accent: '#FFFFFF' },
    },
    sampleButtonText: { en: 'ORDER NOW', bm: 'PESAN SEKARANG' },
    sampleCardTitle: { en: 'ROTI BAKAR ARANG', bm: 'ROTI BAKAR ARANG' },
  },
  {
    id: 'NEON_NIGHT',
    nameEn: 'Neon Night Market',
    nameBm: 'Pasar Malam Neon',
    taglineEn: 'Cyberpunk night-market aesthetic: obsidian acrylic backdrop, glowing neon tubes, frosted glass and cyber amber CTAs.',
    taglineBm: 'Estetik pasar malam moden: latar obsidian gelap, bingkai bercahaya neon, kaca berkabus & butang amber.',
    icon: Sparkles,
    vibeBadge: 'Cyberpunk Glow',
    colors: {
      day: { primary: '#0284C7', surface: '#F0F4F8', text: '#0F172A', accent: '#38BDF8' },
      night: { primary: '#F59E0B', surface: '#030712', text: '#E2FEF9', accent: '#38BDF8' },
    },
    sampleButtonText: { en: '⚡ Instant Order', bm: '⚡ Pesan Segera' },
    sampleCardTitle: { en: 'Mee Goreng Mamak Special', bm: 'Mee Goreng Mamak Khas' },
  },
  {
    id: 'DARK_EMBER',
    nameEn: 'Dark Ember Slate',
    nameBm: 'Bara Api Obsidian',
    taglineEn: 'Glare-free volcanic basalt canvas with warm fiery ember CTAs — crafted for long POS & kitchen shifts.',
    taglineBm: 'Kanvas basalt gunung berapi bebas silau dengan butang bara api hangat — mesra mata syif dapur panjang.',
    icon: Flame,
    vibeBadge: 'Anti-Glare Warmth',
    colors: {
      day: { primary: '#FF5C00', surface: '#F4F5F7', text: '#111827', accent: '#FF5C00' },
      night: { primary: '#FF5C00', surface: '#0C0E12', text: '#F9FAFB', accent: '#FF7A1A' },
    },
    sampleButtonText: { en: '🔥 Add to Cart', bm: '🔥 Masuk Troli' },
    sampleCardTitle: { en: 'Kambing Bakar Rempah', bm: 'Kambing Bakar Rempah' },
  },
  {
    id: 'RETRO_SUNSET',
    nameEn: 'Retro Sunset 70s',
    nameBm: 'Kopitiam Retro 70-an',
    taglineEn: 'Vintage 1970s nostalgia: bone cream surfaces, champagne gold outlines, warm pill buttons, and Playfair serif headings.',
    taglineBm: 'Nostalgia kopitiam 1970-an: latar krim gading, bingkai emas champagne, butang pil hangat & tajuk klasik.',
    icon: Coffee,
    vibeBadge: 'Vintage Luxury',
    colors: {
      day: { primary: '#0C453C', surface: '#FBF8F1', text: '#0C453C', accent: '#C5A059' },
      night: { primary: '#C5A059', surface: '#061A17', text: '#E8DCC4', accent: '#D4A853' },
    },
    sampleButtonText: { en: 'Nikmati Warisan', bm: 'Nikmati Warisan' },
    sampleCardTitle: { en: 'Kopi Kaw & Telur Separuh Masak', bm: 'Kopi Kaw & Telur Separuh Masak' },
  },
  {
    id: 'BAUHAUS_POP',
    nameEn: 'Bauhaus Pop Modern',
    nameBm: 'Bauhaus Pop Moden',
    taglineEn: 'Geometric Bauhaus art: stark architectural framing, kinetic red accent top-bars, yellow geometry, and bold typography.',
    taglineBm: 'Seni geometri Bauhaus: bingkai seni bina hitam-putih, bar merah kinetik, aksen kuning ceria & teks padu.',
    icon: Shapes,
    vibeBadge: 'Kinetic Blocks',
    colors: {
      day: { primary: '#FACC15', surface: '#FFFFFF', text: '#000000', accent: '#E03F14' },
      night: { primary: '#E03F14', surface: '#000000', text: '#FFFFFF', accent: '#FACC15' },
    },
    sampleButtonText: { en: 'SELECT ITEM', bm: 'PILIH MENU' },
    sampleCardTitle: { en: 'AYAM GORENG CRISPY', bm: 'AYAM GORENG CRISPY' },
  },
];

interface DesignProfileSelectorProps {
  compact?: boolean;
  className?: string;
}

export function DesignProfileSelector({ compact = false, className = '' }: DesignProfileSelectorProps) {
  const { currentStyleProfile, setCurrentStyleProfile, resetUiToDefault } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const { toast } = useToast();

  const handleSelectProfile = async (profileId: StyleProfile) => {
    await triggerLightImpact();
    setCurrentStyleProfile(profileId);
    
    const profile = PROFILES.find(p => p.id === profileId);
    const profileName = language === 'bm' ? profile?.nameBm : profile?.nameEn;
    
    toast({
      title: language === 'bm' ? 'Profil Reka Bentuk Diaktifkan' : 'Design Profile Applied',
      description: language === 'bm' 
        ? `Profil "${profileName}" telah diterapkan ke seluruh paparan sistem.` 
        : `"${profileName}" style profile is now live across the entire interface.`,
      variant: 'success',
    });
  };

  const handleToggleDayNight = async () => {
    await triggerMediumImpact();
    toggleTheme();
    toast({
      title: theme === 'dark' 
        ? (language === 'bm' ? 'Mod Siang (Day) Diaktifkan' : 'Day Mode (Light) Activated')
        : (language === 'bm' ? 'Mod Malam (Night) Diaktifkan' : 'Night Mode (Dark) Activated'),
      description: theme === 'dark'
        ? (language === 'bm' ? 'Paparan cerah dioptimumkan untuk siang hari.' : 'Light theme optimized for daytime reading.')
        : (language === 'bm' ? 'Paparan gelap dioptimumkan untuk malam.' : 'Dark theme optimized for night-time comfort.'),
      variant: 'success',
    });
  };

  const handleReset = async () => {
    await triggerMediumImpact();
    await resetUiToDefault();
    toast({
      title: language === 'bm' ? 'Seta Semula Berjaya' : 'Reset to Default',
      description: language === 'bm' 
        ? 'Profil reka bentuk dan warna telah dipulihkan ke asal.' 
        : 'Design profile and layout tokens restored to original Wawasan theme.',
      variant: 'success',
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header & Day/Night Mode Switcher Studio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/40 dark:via-orange-950/20 dark:to-transparent border border-amber-500/30 dark:border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-deep-forest dark:text-white flex items-center gap-2">
              <span>{language === 'bm' ? 'Profil Reka Bentuk Visual' : 'Visual Design Profiles'}</span>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                {language === 'bm' ? 'Mod Dwi-Sistem' : 'Dual-Mode Studio'}
              </span>
            </h3>
            <p className="text-xs text-stone dark:text-stone/75 leading-relaxed">
              {language === 'bm'
                ? 'Pilih estetik UI kegemaran anda. Setiap profil dioptimumkan sepenuhnya untuk Mod Siang & Mod Malam.'
                : 'Select your preferred UI aesthetic. Every profile is crafted with dedicated Day and Night modes.'}
            </p>
          </div>
        </div>

        {/* Day / Night Mode Quick Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleToggleDayNight}
            aria-label={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-amber-500/30 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md text-deep-forest dark:text-white text-xs font-bold shadow-sm hover:shadow transition-all active:scale-95"
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{language === 'bm' ? 'Mod Malam (Aktif)' : 'Night Mode (Active)'}</span>
                <span className="text-[10px] text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded-md font-mono">🌙</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-600 animate-spin-slow" />
                <span>{language === 'bm' ? 'Mod Siang (Aktif)' : 'Day Mode (Active)'}</span>
                <span className="text-[10px] text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded-md font-mono">☀️</span>
              </>
            )}
          </button>

          {currentStyleProfile !== 'DEFAULT' && (
            <button
              type="button"
              onClick={handleReset}
              title={language === 'bm' ? 'Kembali ke Asal' : 'Reset to Default'}
              className="p-2 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:text-amber-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Grid of Visual Profile Cards */}
      <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4 sm:gap-5`}>
        {PROFILES.map((profile) => {
          const isSelected = currentStyleProfile === profile.id;
          const Icon = profile.icon;
          const currentColors = theme === 'dark' ? profile.colors.night : profile.colors.day;
          const name = language === 'bm' ? profile.nameBm : profile.nameEn;
          const tagline = language === 'bm' ? profile.taglineBm : profile.taglineEn;
          const btnText = language === 'bm' ? profile.sampleButtonText.bm : profile.sampleButtonText.en;
          const cardTitle = language === 'bm' ? profile.sampleCardTitle.bm : profile.sampleCardTitle.en;

          return (
            <div
              key={profile.id}
              onClick={() => handleSelectProfile(profile.id)}
              className={`group relative rounded-3xl p-5 border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${
                isSelected
                  ? 'bg-white dark:bg-stone-900/90 border-amber-500 shadow-xl ring-4 ring-amber-500/20 scale-[1.01]'
                  : 'bg-white/70 dark:bg-stone-900/40 border-stone-200/80 dark:border-stone-800/80 hover:border-amber-500/50 hover:bg-white dark:hover:bg-stone-900/70 hover:shadow-lg'
              }`}
            >
              {/* Background ambient accent tint */}
              <div 
                className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl pointer-events-none transition-opacity group-hover:opacity-20"
                style={{ backgroundColor: currentColors.primary }}
              />

              {/* Card Top Row: Icon + Badge + Check Indicator */}
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: currentColors.primary }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-deep-forest dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {name}
                      </h4>
                      <span className="text-[10px] font-semibold text-stone dark:text-stone/60 uppercase tracking-wider">
                        {profile.vibeBadge}
                      </span>
                    </div>
                  </div>

                  {/* Active Indicator Radio Check */}
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-amber-500 text-white shadow-md scale-110' 
                        : 'border-2 border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                <p className="text-xs text-stone dark:text-stone/75 leading-relaxed line-clamp-2">
                  {tagline}
                </p>

                {/* 3. Interactive Dual-Mode Mini Live Mockup */}
                <div 
                  className="rounded-2xl p-3 border transition-all duration-300 overflow-hidden space-y-2 relative"
                  style={{
                    backgroundColor: currentColors.surface,
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span 
                      className="text-xs font-bold truncate max-w-[150px]"
                      style={{ color: currentColors.text }}
                    >
                      {cardTitle}
                    </span>
                    <span 
                      className="text-[11px] font-extrabold font-mono px-1.5 py-0.5 rounded-md"
                      style={{ 
                        backgroundColor: currentColors.accent + '25',
                        color: currentColors.primary 
                      }}
                    >
                      RM 14.00
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] opacity-70 truncate" style={{ color: currentColors.text }}>
                      {theme === 'dark' ? '🌙 Night Theme' : '☀️ Day Theme'}
                    </span>
                    
                    <button
                      type="button"
                      tabIndex={-1}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm transition-transform active:scale-95 pointer-events-none"
                      style={{ backgroundColor: currentColors.primary }}
                    >
                      {btnText}
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Color Swatches Footer */}
              <div className="pt-4 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between mt-3 text-[11px] text-stone dark:text-stone/60">
                <span className="font-mono text-[10px] uppercase">
                  {isSelected ? (
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      {language === 'bm' ? 'Sedang Aktif' : 'Active Profile'}
                    </span>
                  ) : (
                    <span>{language === 'bm' ? 'Ketik untuk Pilih' : 'Tap to apply'}</span>
                  )}
                </span>

                {/* Color chips */}
                <div className="flex items-center gap-1">
                  <span 
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" 
                    style={{ backgroundColor: currentColors.primary }} 
                    title="Primary CTA"
                  />
                  <span 
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" 
                    style={{ backgroundColor: currentColors.accent }} 
                    title="Accent"
                  />
                  <span 
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" 
                    style={{ backgroundColor: currentColors.surface }} 
                    title="Surface"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DesignProfileSelector;
