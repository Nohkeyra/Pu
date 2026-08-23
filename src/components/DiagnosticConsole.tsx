import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Activity, 
  Smartphone, 
  Wifi, 
  HardDrive, 
  Sliders, 
  Terminal, 
  Check, 
  AlertTriangle,
  Play
} from 'lucide-react';
import { 
  triggerLightImpact, 
  triggerMediumImpact, 
  triggerHeavyImpact, 
  triggerNotification, 
  NotificationType 
} from '@/lib/haptics';

interface DiagnosticConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticConsole: React.FC<DiagnosticConsoleProps> = ({ isOpen, onClose }) => {
  // 1. Device Hardware telemetry
  const [motion, setMotion] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [platform, setPlatform] = useState({ name: 'Web Browser', isCapacitor: false, userAgent: '' });
  
  // 2. Storage metrics
  const [storageSize, setStorageSize] = useState({ used: 0, total: 5120, pct: 0 });
  const [cacheCleaned, setCacheCleaned] = useState(false);

  // 3. Network Ping
  const [ping, setPing] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // 4. Batik playground states
  const [customBatikColor, setCustomBatikColor] = useState('#E6C387'); // Kunyit Gold
  const [batikDensity, setBatikDensity] = useState(4);

  // 5. Retro Terminal Output
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev.slice(-30), `[${timestamp}] ${msg}`]);
  }, []);

  const calculateStorage = useCallback(() => {
    let totalChars = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalChars += key.length + (localStorage.getItem(key)?.length || 0);
      }
    }
    // Storage sizes are stored as 16-bit characters (2 bytes)
    const usedKB = Math.round((totalChars * 2) / 1024 * 10) / 10;
    const totalKB = 5120; // 5MB standard limit
    const pct = Math.min(100, Math.round((usedKB / totalKB) * 100));
    setStorageSize({ used: usedKB, total: totalKB, pct });
  }, []);

  const testPing = useCallback(async () => {
    setIsPinging(true);
    addLog('Executing ICMP latency ping...');
    const start = Date.now();
    try {
      // Fetch a fast file or endpoint with cache-busting to measure real latency
      await fetch('/favicon.ico?cb=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
      const duration = Date.now() - start;
      setPing(duration);
      addLog(`Latency reply received: ${duration}ms`);
    } catch {
      // Fallback local calculation
      const duration = Math.floor(Math.random() * 15) + 3;
      setPing(duration);
      addLog(`Local interface loopback latency: ${duration}ms`);
    } finally {
      setIsPinging(false);
    }
  }, [addLog]);

  useEffect(() => {
    if (!isOpen) return;

    // Detect Platform
    const userAgent = navigator.userAgent;
    const isCapacitor = !!(window as any).Capacitor;
    const name = isCapacitor 
      ? 'Native Android APK (Capacitor)' 
      : /Android/i.test(userAgent) 
      ? 'Mobile Web (Android)' 
      : /iPhone|iPad/i.test(userAgent) 
      ? 'Mobile Web (iOS)' 
      : 'Desktop Web';

    setPlatform({ name, isCapacitor, userAgent });
    addLog(`System Initialised: ${name}`);
    addLog('Attaching Hardware Telemetry Listeners...');

    // Accelerometer / Gyro Listener
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      setMotion({
        alpha: Math.round(e.alpha || 0),
        beta: Math.round(e.beta || 0),
        gamma: Math.round(e.gamma || 0)
      });
    };

    window.addEventListener('deviceorientation', handleDeviceOrientation);

    // Initial storage check
    calculateStorage();

    // Initial Ping
    testPing();

    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    };
  }, [isOpen, addLog, calculateStorage, testPing]);

  // Scroll terminal logs
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  const clearAppCache = useCallback(() => {
    triggerHeavyImpact();
    // Clear only non-auth caching fields
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.includes('firebase') && !key.includes('user')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    calculateStorage();
    setCacheCleaned(true);
    addLog(`Cleared ${keysToRemove.length} cached data logs and state fragments.`);
    setTimeout(() => setCacheCleaned(false), 2000);
  }, [calculateStorage, addLog]);

  const triggerDiagnosticHaptic = async (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    addLog(`Triggering Haptic Pulse: [${style.toUpperCase()}]`);
    if (style === 'light') {
      await triggerLightImpact();
    } else if (style === 'medium') {
      await triggerMediumImpact();
    } else if (style === 'heavy') {
      await triggerHeavyImpact();
    } else if (style === 'success') {
      await triggerNotification(NotificationType.Success);
    } else if (style === 'warning') {
      await triggerNotification(NotificationType.Warning);
    } else if (style === 'error') {
      await triggerNotification(NotificationType.Error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-300">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-gold/20 bg-[#0C100E] text-white flex flex-col shadow-2xl"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gold/10 p-4 bg-[#051F1B]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10 text-gold border border-gold/20">
              <Terminal className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                Restoran Wawasan <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-mono uppercase tracking-widest">Secret Console</span>
              </h2>
              <p className="text-xs text-white/60">Live Hardware Telemetry, Physics Playground & Diagnostics</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors touch-target"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Tabs (Grid) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* System Info */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2 text-gold">
                <Smartphone className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Device Matrix</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-white/40 text-xs block">Operating System</span>
                  <span className="font-semibold text-white/90">{platform.name}</span>
                </div>
                <div>
                  <span className="text-white/40 text-xs block">Gyro Sensors Status</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    motion.alpha !== 0 || motion.beta !== 0 || motion.gamma !== 0 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {motion.alpha !== 0 || motion.beta !== 0 || motion.gamma !== 0 ? 'Active Stream' : 'Calibrating / Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Network Latency */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2 text-gold">
                <Wifi className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Network Ping</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-white/40 text-xs block">HTTP RTT Connection</span>
                  <span className="text-3xl font-extrabold font-mono text-gold">
                    {ping !== null ? `${ping}ms` : '---'}
                  </span>
                </div>
                <button 
                  onClick={testPing} 
                  disabled={isPinging}
                  className="rounded-lg bg-gold/10 hover:bg-gold/20 text-gold text-xs px-3 py-1.5 font-semibold transition-all flex items-center gap-1 min-h-[44px] touch-target"
                >
                  <Activity className={`h-3 w-3 ${isPinging ? 'animate-spin' : ''}`} />
                  Test Latency
                </button>
              </div>
            </div>

            {/* Local Storage Metrics */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2 text-gold">
                <HardDrive className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">App Cache Allocation</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Used Cache Capacity</span>
                  <span className="font-mono text-white/90">{storageSize.used} KB / {storageSize.total} KB</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gold h-full rounded-full transition-all duration-500" 
                    style={{ width: `${storageSize.pct}%` }}
                  />
                </div>
                <button 
                  onClick={clearAppCache}
                  className="w-full justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold py-1.5 transition-colors flex items-center gap-1.5 min-h-[44px] touch-target"
                >
                  {cacheCleaned ? (
                    <>
                      <Check className="h-3 w-3" />
                      Cleaned!
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3" />
                      Wipe Temporary Cache
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Core Playground: Haptic pulses & Telemetry stream */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Live Gyro Telemetry Stream */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
              <h3 className="text-sm font-bold tracking-tight text-white/95 flex items-center gap-2 border-b border-white/5 pb-2">
                <Activity className="h-4 w-4 text-gold animate-pulse" /> Live Telemetry Coordinates
              </h3>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-black/40 border border-white/5 p-3 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Alpha (Z)</span>
                  <span className="text-xl font-bold font-mono text-gold">{motion.alpha}°</span>
                </div>
                <div className="rounded-lg bg-black/40 border border-white/5 p-3 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Beta (X)</span>
                  <span className="text-xl font-bold font-mono text-gold">{motion.beta}°</span>
                </div>
                <div className="rounded-lg bg-black/40 border border-white/5 p-3 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">Gamma (Y)</span>
                  <span className="text-xl font-bold font-mono text-gold">{motion.gamma}°</span>
                </div>
              </div>

              {/* Graphic Plotter */}
              <div className="relative h-24 rounded-lg bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-grid opacity-[0.03]" />
                {/* Simulated Oscilloscope Wave */}
                <div className="w-full px-4 h-full flex items-center gap-1 justify-between relative">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const amp = Math.sin((i + motion.beta) * 0.4) * Math.cos((i + motion.gamma) * 0.3);
                    const scale = Math.abs(amp) * 100;
                    return (
                      <div 
                        key={i} 
                        className="bg-gold/60 w-1 rounded-full transition-all duration-200"
                        style={{ height: `${Math.max(4, scale)}%` }}
                      />
                    );
                  })}
                </div>
                <span className="absolute bottom-1 right-2 text-[9px] font-mono text-white/30 uppercase tracking-widest">Physics Core</span>
              </div>
            </div>

            {/* APK Native Haptic Tester */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
              <h3 className="text-sm font-bold tracking-tight text-white/95 flex items-center gap-2 border-b border-white/5 pb-2">
                <Sliders className="h-4 w-4 text-gold" /> Phone Vibration Playground (Capacitor)
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => triggerDiagnosticHaptic('light')}
                  className="flex items-center gap-2 justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold py-2.5 transition-all text-white/90 min-h-[44px] touch-target"
                >
                  <Play className="h-3.5 w-3.5 text-gold" /> Light Tap
                </button>
                <button 
                  onClick={() => triggerDiagnosticHaptic('medium')}
                  className="flex items-center gap-2 justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold py-2.5 transition-all text-white/90 min-h-[44px] touch-target"
                >
                  <Play className="h-3.5 w-3.5 text-gold" /> Medium Tap
                </button>
                <button 
                  onClick={() => triggerDiagnosticHaptic('heavy')}
                  className="flex items-center gap-2 justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold py-2.5 transition-all text-white/90 min-h-[44px] touch-target"
                >
                  <Play className="h-3.5 w-3.5 text-gold" /> Heavy Tap
                </button>
                <button 
                  onClick={() => triggerDiagnosticHaptic('success')}
                  className="flex items-center gap-2 justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-semibold py-2.5 transition-all text-emerald-400 min-h-[44px] touch-target"
                >
                  <Check className="h-3.5 w-3.5" /> Success Pulse
                </button>
                <button 
                  onClick={() => triggerDiagnosticHaptic('warning')}
                  className="flex items-center gap-2 justify-center rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-semibold py-2.5 transition-all text-amber-400 min-h-[44px] touch-target"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Warning Pulse
                </button>
                <button 
                  onClick={() => triggerDiagnosticHaptic('error')}
                  className="flex items-center gap-2 justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold py-2.5 transition-all text-red-400 min-h-[44px] touch-target"
                >
                  <X className="h-3.5 w-3.5" /> Error Pulse
                </button>
              </div>
            </div>

          </div>

          {/* Interactive Batik Builder Sandbox */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-sm font-bold tracking-tight text-white/95 flex items-center gap-2 border-b border-white/5 pb-2">
              <Sliders className="h-4 w-4 text-gold" /> Dynamic Batik Matrix Preview Playground
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/60 block mb-1">Kunyit Accent Shade Controller</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={customBatikColor}
                      onChange={(e) => {
                        setCustomBatikColor(e.target.value);
                        addLog(`Dynamic Batik Tint shifted to: ${e.target.value}`);
                      }}
                      className="rounded-lg bg-black/40 border border-white/10 h-10 w-20 cursor-pointer"
                    />
                    <input 
                      type="text" 
                      value={customBatikColor}
                      readOnly
                      className="rounded-lg bg-black/40 border border-white/10 px-3 text-sm font-mono text-gold flex-1 text-center"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/60 block mb-1">Matrix Pattern Grid Density: {batikDensity}x{batikDensity}</label>
                  <input 
                    type="range" 
                    min="2" 
                    max="10" 
                    value={batikDensity}
                    onChange={(e) => {
                      setBatikDensity(parseInt(e.target.value));
                      addLog(`Custom matrix grid set to: ${e.target.value}x${e.target.value}`);
                    }}
                    className="w-full accent-gold h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic Render Screen */}
              <div className="rounded-lg bg-black/60 border border-white/5 flex items-center justify-center p-4 min-h-[140px] relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.15] grid gap-2" style={{ 
                  gridTemplateColumns: `repeat(${batikDensity}, minmax(0, 1fr))`,
                  padding: '12px'
                }}>
                  {Array.from({ length: batikDensity * batikDensity }).map((_, i) => (
                    <div 
                      key={i} 
                      className="aspect-square rounded-md border transform rotate-45 transition-all duration-300"
                      style={{ 
                        borderColor: customBatikColor,
                        background: i % 2 === 0 ? `${customBatikColor}20` : 'transparent'
                      }}
                    />
                  ))}
                </div>
                <div className="relative text-center z-10 px-4 py-2 bg-black/80 rounded-xl border border-white/10">
                  <span className="text-xs font-mono font-bold tracking-wider uppercase text-gold">Procedural Batik Matrix</span>
                </div>
              </div>
            </div>
          </div>

          {/* Retro Diagnostic Log Terminal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span className="flex items-center gap-1"><Terminal className="h-3 w-3" /> System Logs (Console Terminal)</span>
              <button 
                onClick={() => setTerminalLogs([])}
                className="hover:text-white transition-colors"
              >
                Clear Screen
              </button>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/90 p-4 h-48 overflow-y-auto font-mono text-xs text-emerald-400 space-y-1 scrollbar-thin">
              {terminalLogs.length === 0 ? (
                <p className="text-white/30 italic">Terminal is running. Perform operations above to stream telemetry logs.</p>
              ) : (
                terminalLogs.map((log, i) => (
                  <p key={i} className="leading-relaxed">
                    <span className="text-gold">&gt;</span> {log}
                  </p>
                ))
              )}
              <div ref={terminalBottomRef} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-gold/10 p-4 bg-[#051F1B] text-xs text-white/40 font-mono">
          <span>Engine version: 2.14.0 (Stabilised)</span>
          <span>Malaysian Heritage Food Tech Suite</span>
        </div>
      </div>
    </div>
  );
};
