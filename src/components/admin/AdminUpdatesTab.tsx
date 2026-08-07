import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { 
  Sparkles, 
  Send, 
  RefreshCw, 
  Download, 
  AlertTriangle, 
  ShieldCheck, 
  Eye,
  Radio
} from 'lucide-react';
import { 
  fetchLatestAppVersion, 
  publishAppUpdate, 
  DEFAULT_APK_URL,
  CURRENT_APP_VERSION,
  type AppVersionConfig 
} from '@/services/updateService';
import { triggerLightImpact, triggerMediumImpact } from '@/lib/haptics';

interface AdminUpdatesTabProps {
  adminToken?: string;
  onPreviewModal?: (config: AppVersionConfig) => void;
}

export function AdminUpdatesTab({ adminToken, onPreviewModal }: AdminUpdatesTabProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isBM = language === 'bm';

  const [currentConfig, setCurrentConfig] = useState<AppVersionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Form states
  const [version, setVersion] = useState('1.2.5');
  const [minVersion, setMinVersion] = useState('1.2.0');
  const [buildNumber, setBuildNumber] = useState('125');
  const [apkUrl, setApkUrl] = useState(DEFAULT_APK_URL);
  const [bundleUrl, setBundleUrl] = useState('');
  const [releaseNotesRaw, setReleaseNotesRaw] = useState(
    '1. Penambahbaikan prestasi & tindak balas aplikasi.\n2. In-App Live Updates untuk kemaskini terus APK.\n3. Penyelarasan notifikasi real-time.'
  );
  const [forceUpdate, setForceUpdate] = useState(false);

  const loadVersion = async () => {
    setLoading(true);
    try {
      const cfg = await fetchLatestAppVersion();
      setCurrentConfig(cfg);
      setVersion(cfg.latestVersion || '1.2.5');
      setMinVersion(cfg.minVersion || '1.2.0');
      setBuildNumber(String(cfg.buildNumber || 125));
      setApkUrl(cfg.apkUrl || DEFAULT_APK_URL);
      setBundleUrl(cfg.bundleUrl || '');
      setForceUpdate(cfg.forceUpdate || false);
      if (cfg.releaseNotes && cfg.releaseNotes.length > 0) {
        setReleaseNotesRaw(cfg.releaseNotes.join('\n'));
      }
    } catch (err) {
      console.warn('[AdminUpdatesTab] Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVersion();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerMediumImpact();

    const notesList = releaseNotesRaw
      .split('\n')
      .map((line) => line.trim().replace(/^[0-9]+\.\s*/, ''))
      .filter((line) => line.length > 0);

    setPublishing(true);
    try {
      const payload: Partial<AppVersionConfig> = {
        latestVersion: version.trim(),
        minVersion: minVersion.trim(),
        buildNumber: parseInt(buildNumber, 10) || 125,
        apkUrl: apkUrl.trim(),
        bundleUrl: bundleUrl.trim(),
        releaseNotes: notesList.length > 0 ? notesList : ['Penambahbaikan prestasi dan kestabilan sistem.'],
        forceUpdate,
      };

      const published = await publishAppUpdate(payload, adminToken);
      setCurrentConfig(published);

      toast({
        title: isBM ? 'Siaran Kemaskini Berjaya!' : 'Update Broadcast Live!',
        description: isBM 
          ? `Versi ${published.latestVersion} telah disiarkan secara langsung kepada semua pengguna.` 
          : `Version ${published.latestVersion} broadcasted live to all app instances.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: isBM ? 'Gagal Menyiarkan Kemaskini' : 'Failed to Broadcast Update',
        description: String(err),
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handlePreview = async () => {
    await triggerLightImpact();
    const notesList = releaseNotesRaw
      .split('\n')
      .map((line) => line.trim().replace(/^[0-9]+\.\s*/, ''))
      .filter((line) => line.length > 0);

    const testConfig: AppVersionConfig = {
      latestVersion: version.trim(),
      minVersion: minVersion.trim(),
      buildNumber: parseInt(buildNumber, 10) || 125,
      apkUrl: apkUrl.trim(),
      bundleUrl: bundleUrl.trim(),
      releaseNotes: notesList.length > 0 ? notesList : ['Preview live update dialog.'],
      forceUpdate,
      updatedAt: new Date().toISOString(),
      publishedBy: 'Admin Preview'
    };

    if (onPreviewModal) {
      onPreviewModal(testConfig);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[var(--color-sunshine-cta)]/10 via-[var(--color-sunshine)]/10 to-amber-500/10 border border-[var(--color-sunshine-cta)]/20 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[var(--color-sunshine-cta)]/20 text-[var(--color-sunshine-cta)]">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-deep-forest dark:text-white">
              {isBM ? 'Pusat Kawalan In-App Live Updates' : 'In-App Live Updates Broadcast Center'}
            </h3>
            <p className="text-xs text-stone dark:text-stone/75 mt-0.5">
              {isBM 
                ? 'Siarkan kemaskini versi aplikasi, pautan APK terkini, dan nota pelepasan secara real-time.' 
                : 'Broadcast instant app updates, APK release links, and release notes in real time to all devices.'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={loadVersion}
          disabled={loading}
          className="rounded-2xl min-h-[44px] border-border hover:bg-stone/10 font-bold flex items-center gap-2 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {isBM ? 'Muat Semula Status' : 'Refresh Status'}
        </Button>
      </div>

      {/* Current Active Broadcast Version Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-card border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-deep-forest dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            {isBM ? 'Versi Disiarkan Semasa' : 'Current Live Broadcast Version'}
          </span>
          <span className="text-[11px] font-mono text-stone dark:text-stone/70">
            Internal Build: v{CURRENT_APP_VERSION}
          </span>
        </div>

        {loading ? (
          <div className="py-6 text-center text-xs text-stone animate-pulse">
            {isBM ? 'Memuatkan maklumat versi...' : 'Loading version info...'}
          </div>
        ) : currentConfig ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
            <div className="p-3 rounded-2xl bg-cream/70 dark:bg-stone/10 border border-border/60 space-y-1">
              <span className="text-[10px] uppercase text-stone dark:text-stone/70 block">
                {isBM ? 'Versi Terkini' : 'Latest Version'}
              </span>
              <span className="font-mono text-base font-bold text-[var(--color-sunshine-cta)]">
                v{currentConfig.latestVersion}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-cream/70 dark:bg-stone/10 border border-border/60 space-y-1">
              <span className="text-[10px] uppercase text-stone dark:text-stone/70 block">
                {isBM ? 'Versi Minimum' : 'Min Mandatory'}
              </span>
              <span className="font-mono text-base font-bold text-deep-forest dark:text-white">
                v{currentConfig.minVersion}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-cream/70 dark:bg-stone/10 border border-border/60 space-y-1">
              <span className="text-[10px] uppercase text-stone dark:text-stone/70 block">
                {isBM ? 'Status Kemaskini' : 'Update Type'}
              </span>
              <span className={`font-semibold text-xs px-2 py-0.5 rounded-full inline-block ${currentConfig.forceUpdate ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                {currentConfig.forceUpdate ? (isBM ? 'Wajib (Critical)' : 'Mandatory') : (isBM ? 'Pilihan' : 'Optional')}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-cream/70 dark:bg-stone/10 border border-border/60 space-y-1">
              <span className="text-[10px] uppercase text-stone dark:text-stone/70 block">
                {isBM ? 'Tarikh Disiar' : 'Last Broadcast'}
              </span>
              <span className="font-mono text-xs text-stone dark:text-stone/80 truncate block">
                {new Date(currentConfig.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Broadcast Form */}
      <form onSubmit={handlePublish} className="p-6 rounded-3xl bg-white dark:bg-card border border-border shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Sparkles className="w-5 h-5 text-[var(--color-sunshine-cta)]" />
          <h4 className="font-bold text-deep-forest dark:text-white">
            {isBM ? 'Bina & Siarkan Kemaskini Baru' : 'Publish New Live Release'}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{isBM ? 'Nombor Versi Baru' : 'New Version Number'}</Label>
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.2.5"
              required
              className="rounded-xl font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{isBM ? 'Versi Minimum Wajib' : 'Min Mandatory Version'}</Label>
            <Input
              value={minVersion}
              onChange={(e) => setMinVersion(e.target.value)}
              placeholder="1.2.0"
              required
              className="rounded-xl font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{isBM ? 'Nombor Binaan (Build Code)' : 'Build Number'}</Label>
            <Input
              type="number"
              value={buildNumber}
              onChange={(e) => setBuildNumber(e.target.value)}
              placeholder="125"
              required
              className="rounded-xl font-mono text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">{isBM ? 'Pautan Muat Turun APK Terkini' : 'Direct APK Download URL'}</Label>
            <div className="relative">
              <Input
                value={apkUrl}
                onChange={(e) => setApkUrl(e.target.value)}
                placeholder="https://github.com/.../Wawasan.Hub.apk"
                required
                className="rounded-xl font-mono text-xs pr-10"
              />
              <Download className="w-4 h-4 text-stone absolute right-3 top-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>{isBM ? 'Pautan Capgo OTA Zip Bundle (Pilihan / Instant)' : 'Capgo OTA Zip Bundle URL (Optional / Instant)'}</span>
              <span className="text-[10px] text-[var(--color-sunshine-cta)] font-bold">Capgo Live</span>
            </Label>
            <div className="relative">
              <Input
                value={bundleUrl}
                onChange={(e) => setBundleUrl(e.target.value)}
                placeholder="https://my-bucket.com/dist-v1.2.5.zip"
                className="rounded-xl font-mono text-xs pr-10"
              />
              <Radio className="w-4 h-4 text-[var(--color-sunshine-cta)] absolute right-3 top-3" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">{isBM ? 'Nota Pelepasan (Release Notes - 1 Per Baris)' : 'Release Notes (1 per line)'}</Label>
          <textarea
            value={releaseNotesRaw}
            onChange={(e) => setReleaseNotesRaw(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="1. Penambahbaikan prestasi..."
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              {isBM ? 'Kemaskini Wajib (Mandatory Critical Update)' : 'Mandatory Critical Update'}
            </span>
            <span className="text-[11px] text-stone dark:text-stone/75 block">
              {isBM 
                ? 'Jika diaktifkan, pengguna wajib mengemaskini aplikasi sebelum meneruskan penggunaan.' 
                : 'When enabled, forces users to update before accessing the application.'}
            </span>
          </div>
          <Switch
            checked={forceUpdate}
            onCheckedChange={setForceUpdate}
            aria-label="Toggle mandatory update"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            className="w-full sm:w-auto rounded-2xl min-h-[44px] font-bold flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4 text-[var(--color-sunshine-cta)]" />
            {isBM ? 'Pra-Tonton Dialog Dialog In-App' : 'Preview Live Update Dialog'}
          </Button>

          <Button
            type="submit"
            disabled={publishing}
            className="btn-cta w-full sm:flex-1 rounded-2xl min-h-[44px] font-bold flex items-center justify-center gap-2 shadow-md"
          >
            {publishing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {isBM ? 'Menyiarkan...' : 'Broadcasting...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {isBM ? 'Siarkan Kemaskini Terus Sekarang' : 'Broadcast Live In-App Update'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
