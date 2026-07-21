import { Palette } from 'lucide-react';

// Extracted from AdminPanel.tsx (previously the `activeTab === 'branding'`
// JSX block, lines ~2117-2204). Purely presentational — no local state,
// no data fetching. All values/handlers come from the parent AdminPanel,
// which still owns the `accent` state (via useTheme) and calls the
// server through `handleAccentChange`.
export function AdminBrandingTab({
  accent,
  onAccentChange,
}: {
  accent: 'sunshine' | 'kiwi';
  onAccentChange: (accent: 'sunshine' | 'kiwi') => void;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 bg-cream-dark/20 dark:bg-black/20 border border-sunshine/10 rounded-xl space-y-4">
        <div>
          <h3 className="font-display font-bold text-deep-forest text-lg flex items-center gap-2">
            <Palette className="w-5 h-5 text-sunshine" />
            Application Accent Color
          </h3>
          <p className="text-xs text-deep-forest/50 mt-1">
            Toggle the primary accent color of the application globally. Changing this updates the primary buttons, highlights, selections, and interactive states for all users in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Option 1: Sunshine Orange */}
          <div
            onClick={() => onAccentChange('sunshine')}
            className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col justify-between h-40 ${
              accent === 'sunshine'
                ? 'bg-sunshine/10 border-sunshine shadow-lg shadow-sunshine/5'
                : 'bg-cream dark:bg-background/20 border-sunshine/15 hover:border-sunshine/30 hover:bg-cream dark:bg-background/30'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-deep-forest text-base flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#E89025] inline-block border border-white/10" />
                  Sunshine Orange
                </h4>
                <p className="text-xs text-deep-forest/50 mt-1.5 leading-relaxed">
                  Radiant Golden Orange. Warm, high-energy, and traditional. The default aesthetic.
                </p>
              </div>
              {accent === 'sunshine' && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sunshine text-charcoal">
                  Active
                </span>
              )}
            </div>

            <div className="flex gap-1.5 mt-4">
              <div className="w-8 h-8 rounded-lg bg-[#E89025] shadow" />
              <div className="w-8 h-8 rounded-lg bg-[#F2A43F] shadow" />
              <div className="w-8 h-8 rounded-lg bg-[#E55928] shadow" />
            </div>
          </div>

          {/* Option 2: Kiwi Green */}
          <div
            onClick={() => onAccentChange('kiwi')}
            className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col justify-between h-40 ${
              accent === 'kiwi'
                ? 'bg-kiwi/10 border-kiwi shadow-lg shadow-kiwi/5'
                : 'bg-cream dark:bg-background/20 border-sunshine/15 hover:border-sunshine/30 hover:bg-cream dark:bg-background/30'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-deep-forest text-base flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#729B48] inline-block border border-white/10" />
                  Kiwi Green
                </h4>
                <p className="text-xs text-deep-forest/50 mt-1.5 leading-relaxed">
                  Fresh Leaf Green. Vibrant, organic, modern, and refreshing.
                </p>
              </div>
              {accent === 'kiwi' && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-kiwi text-charcoal">
                  Active
                </span>
              )}
            </div>

            <div className="flex gap-1.5 mt-4">
              <div className="w-8 h-8 rounded-lg bg-[#729B48] shadow" />
              <div className="w-8 h-8 rounded-lg bg-[#82AF52] shadow" />
              <div className="w-8 h-8 rounded-lg bg-[#5E8239] shadow" />
            </div>
          </div>
        </div>

        <div className="text-xs text-deep-forest/40 italic pt-2 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Your preference is saved locally and synced to all other connected clients in real-time.
        </div>
      </div>
    </div>
  );
}
export default AdminBrandingTab;
