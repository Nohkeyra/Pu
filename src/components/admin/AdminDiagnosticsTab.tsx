import {
  RefreshCw, Database, Wifi, FileText, Cpu, Mail, Send, Terminal,
  Zap, ShieldCheck, Loader2, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Extracted from AdminPanel.tsx (previously the `activeTab === 'diagnostics'`
// JSX block, lines ~1666-2116). Purely presentational — no local state.
// All diagnostic run state and handlers are owned by the parent AdminPanel
// and passed down, since `runFeatureTest` writes to `previewPdfUrl` /
// `isPreviewOpen`, which are shared with the Orders tab's PDF preview
// dialog (that dialog itself stays in AdminPanel.tsx, not here).

type DiagStatus = { status: 'idle' | 'running' | 'pass' | 'fail'; message?: string };

export function AdminDiagnosticsTab({
  diagFirebase,
  diagCalendar,
  diagPdf,
  diagNative,
  diagEmail,
  diagTests,
  testEmailAddress,
  isSendingTestEmail,
  erudaEnabled,
  runAllDiagnostics,
  runFirebaseDiag,
  runCalendarDiag,
  runPdfDiag,
  runNativeDiag,
  runSendTestEmail,
  runFeatureTest,
  toggleEruda,
  setTestEmailAddress,
  setDiagTests,
}: {
  diagFirebase: DiagStatus & { projectId?: string };
  diagCalendar: DiagStatus & { calendarsReturned?: number };
  diagPdf: DiagStatus;
  diagNative: {
    status: 'idle' | 'running' | 'pass' | 'fail';
    details?: {
      isNative: boolean;
      platform: string;
      hasFilesystem: boolean;
      hasShare: boolean;
      userAgent?: string;
      deviceInfo?: Record<string, unknown>;
      deviceId?: Record<string, unknown>;
      batteryInfo?: Record<string, unknown>;
      error?: string;
    };
  };
  diagEmail: DiagStatus;
  diagTests: { id: string; status: 'idle' | 'running' | 'pass' | 'fail'; name: string }[];
  testEmailAddress: string;
  isSendingTestEmail: boolean;
  erudaEnabled: boolean;
  runAllDiagnostics: () => void;
  runFirebaseDiag: () => void;
  runCalendarDiag: () => void;
  runPdfDiag: () => void;
  runNativeDiag: () => void;
  runSendTestEmail: () => void;
  runFeatureTest: (testId: string) => void;
  toggleEruda: () => void;
  setTestEmailAddress: (v: string) => void;
  setDiagTests: React.Dispatch<React.SetStateAction<{ id: string; status: 'idle' | 'running' | 'pass' | 'fail'; name: string }[]>>;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-card/20 border border-sunshine/10 rounded-xl gap-4">
        <div>
          <h3 className="font-display font-bold text-deep-forest text-lg">System Diagnostics</h3>
          <p className="text-xs text-deep-forest/50 mt-1">Verify health and credentials of automated backend services and PDF capabilities.</p>
        </div>
        <Button
          onClick={runAllDiagnostics}
          className="bg-sunshine hover:bg-[#E0BC74] text-charcoal font-semibold flex items-center gap-2 text-xs"
        >
          <RefreshCw className="w-4 h-4" />
          Run All Diagnostics
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firebase Connectivity */}
        <div className="p-5 bg-cream-dark/20 dark:bg-black/20 border border-sunshine/10 rounded-xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-deep-forest">Firestore Database</h4>
                <p className="text-xs text-deep-forest/40">Writes/reads of orders & invoice counters</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runFirebaseDiag}
              disabled={diagFirebase.status === 'running'}
              className="border-sunshine/20 text-deep-forest text-xs hover:bg-sunshine/5"
            >
              Test
            </Button>
          </div>

          <div className="pt-2 border-t border-deep-forest/5 flex items-center justify-between text-xs">
            <span className="text-deep-forest/50">Status:</span>
            {diagFirebase.status === 'idle' && <span className="text-deep-forest/40 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cream dark:bg-background/30"></span>Idle</span>}
            {diagFirebase.status === 'running' && <span className="text-sunshine flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Running</span>}
            {diagFirebase.status === 'pass' && <span className="text-emerald-600 dark:text-green-400 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Connected</span>}
            {diagFirebase.status === 'fail' && <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" />Failed</span>}
          </div>

          {diagFirebase.status === 'pass' && (
            <div className="p-3 bg-emerald-500/[0.04] dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-mono text-emerald-800 dark:text-green-300">
              <div>✓ Production Firebase Access</div>
              <div className="mt-1 text-[10px] opacity-70 text-emerald-800/70 dark:text-green-300/70">Project ID: {diagFirebase.projectId}</div>
            </div>
          )}

          {diagFirebase.status === 'fail' && (
            <div className="p-3 bg-red-500/[0.04] dark:bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-mono text-red-700 dark:text-red-300 break-all">
              <div>✕ Connection Error</div>
              <div className="mt-1 text-[10px] opacity-70">{diagFirebase.message}</div>
            </div>
          )}
        </div>

        {/* Google Calendar Sync */}
        <div className="p-5 bg-cream-dark/20 dark:bg-black/20 border border-sunshine/10 rounded-xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-deep-forest">Google Calendar API</h4>
                <p className="text-xs text-deep-forest/40">Automated event publishing</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runCalendarDiag}
              disabled={diagCalendar.status === 'running'}
              className="border-sunshine/20 text-deep-forest text-xs hover:bg-sunshine/5"
            >
              Test
            </Button>
          </div>

          <div className="pt-2 border-t border-deep-forest/5 flex items-center justify-between text-xs">
            <span className="text-deep-forest/50">Status:</span>
            {diagCalendar.status === 'idle' && <span className="text-deep-forest/40 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cream dark:bg-background/30"></span>Idle</span>}
            {diagCalendar.status === 'running' && <span className="text-sunshine flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Running</span>}
            {diagCalendar.status === 'pass' && <span className="text-emerald-600 dark:text-green-400 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Online</span>}
            {diagCalendar.status === 'fail' && <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" />Failed</span>}
          </div>

          {diagCalendar.status === 'pass' && (
            <div className="p-3 bg-emerald-500/[0.04] dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-mono text-emerald-800 dark:text-green-300">
              <div>✓ Service Account authenticated</div>
              <div className="mt-1 text-[10px] opacity-70 text-emerald-800/70 dark:text-green-300/70">Calendars found: {diagCalendar.calendarsReturned}</div>
            </div>
          )}

          {diagCalendar.status === 'fail' && (
            <div className="p-3 bg-red-500/[0.04] dark:bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-mono text-red-700 dark:text-red-300 break-all">
              <div>✕ Authentication / Scope Issue</div>
              <div className="mt-1 text-[10px] opacity-70">{diagCalendar.message}</div>
            </div>
          )}
        </div>

        {/* PDF Generation Integrity */}
        <div className="p-5 bg-cream-dark/20 dark:bg-black/20 border border-sunshine/10 rounded-xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-deep-forest">Client PDF Engine</h4>
                <p className="text-xs text-deep-forest/40">In-memory jsPDF & formatting engine</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runPdfDiag}
              disabled={diagPdf.status === 'running'}
              className="border-sunshine/20 text-deep-forest text-xs hover:bg-sunshine/5"
            >
              Test
            </Button>
          </div>

          <div className="pt-2 border-t border-deep-forest/5 flex items-center justify-between text-xs">
            <span className="text-deep-forest/50">Status:</span>
            {diagPdf.status === 'idle' && <span className="text-deep-forest/40 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cream dark:bg-background/30"></span>Idle</span>}
            {diagPdf.status === 'running' && <span className="text-sunshine flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Running</span>}
            {diagPdf.status === 'pass' && <span className="text-emerald-600 dark:text-green-400 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Pass</span>}
            {diagPdf.status === 'fail' && <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" />Failed</span>}
          </div>

          {diagPdf.status === 'pass' && (
            <div className="p-3 bg-emerald-500/[0.04] dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-mono text-emerald-800 dark:text-green-300">
              <div>✓ PDF logic generated layout cleanly</div>
              <div className="mt-1 text-[10px] opacity-70 text-emerald-800/70 dark:text-green-300/70">{diagPdf.message}</div>
            </div>
          )}

          {diagPdf.status === 'fail' && (
            <div className="p-3 bg-red-500/[0.04] dark:bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-mono text-red-700 dark:text-red-300 break-all">
              <div>✕ PDF Service Error</div>
              <div className="mt-1 text-[10px] opacity-70">{diagPdf.message}</div>
            </div>
          )}
        </div>

        {/* Native / APK Integration Info */}
        <div className="p-5 bg-cream-dark/20 dark:bg-black/20 border border-sunshine/10 rounded-xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-deep-forest">App Environment</h4>
                <p className="text-xs text-deep-forest/40">WebView context & Native APIs</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runNativeDiag}
              disabled={diagNative.status === 'running'}
              className="border-sunshine/20 text-deep-forest text-xs hover:bg-sunshine/5"
            >
              Test
            </Button>
          </div>

          <div className="pt-2 border-t border-deep-forest/5 flex items-center justify-between text-xs">
            <span className="text-deep-forest/50">Status:</span>
            {diagNative.status === 'idle' && <span className="text-deep-forest/40 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cream dark:bg-background/30"></span>Idle</span>}
            {diagNative.status === 'running' && <span className="text-sunshine flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Running</span>}
            {diagNative.status === 'pass' && <span className="text-emerald-600 dark:text-green-400 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Pass</span>}
            {diagNative.status === 'fail' && <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" />Failed</span>}
          </div>

          {diagNative.status === 'pass' && diagNative.details && (
            <div className="p-3 bg-emerald-500/[0.04] dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-mono text-emerald-800 dark:text-green-300 space-y-1">
              <div className="flex justify-between">
                <span className="opacity-60">Context:</span>
                <span>{diagNative.details.isNative ? 'Native (APK)' : 'Web Browser'}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Platform:</span>
                <span>{diagNative.details.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Filesystem:</span>
                <span>{diagNative.details.hasFilesystem ? 'Available' : 'Unavailable'}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-60">Share API:</span>
                <span>{diagNative.details.hasShare ? 'Available' : 'Unavailable'}</span>
              </div>

              {diagNative.details.deviceInfo && (
                <>
                  <div className="flex justify-between border-t border-green-500/10 pt-1 mt-1">
                    <span className="opacity-60">Device Model:</span>
                    <span>{String(diagNative.details.deviceInfo['model'] || 'Unknown')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">OS Version:</span>
                    <span>{String(diagNative.details.deviceInfo['osVersion'] || 'Unknown')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-60">Manufacturer:</span>
                    <span>{String(diagNative.details.deviceInfo['manufacturer'] || 'Unknown')}</span>
                  </div>
                </>
              )}
              {diagNative.details.deviceId && (
                <div className="flex justify-between">
                  <span className="opacity-60">Device UUID:</span>
                  <span className="truncate max-w-[120px]" title={String(diagNative.details.deviceId['uuid'] || '')}>
                    {String(diagNative.details.deviceId['uuid'] || 'Unknown')}
                  </span>
                </div>
              )}
              {diagNative.details.batteryInfo && typeof diagNative.details.batteryInfo['batteryLevel'] !== 'undefined' && (
                <div className="flex justify-between border-t border-green-500/10 pt-1 mt-1">
                  <span className="opacity-60">Battery Level:</span>
                  <span>
                    {Math.round(Number(diagNative.details.batteryInfo['batteryLevel']) * 100)}%
                    {diagNative.details.batteryInfo['isCharging'] ? ' ⚡ (Charging)' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Brevo SMTP Diagnostic Mailer */}
      <div className="p-5 bg-cream-dark/20 dark:bg-black/20 border border-sunshine/10 rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-lg">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-deep-forest">SMTP Relay (Brevo SMTP via Render)</h4>
            <p className="text-xs text-deep-forest/40">Sends actual HTML emails to customers on approval</p>
          </div>
        </div>

        <div className="pt-2 border-t border-deep-forest/5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="Enter test recipient email address"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="bg-cream dark:bg-background/30 border-sunshine/20 text-deep-forest text-xs placeholder:text-deep-forest/30 h-10"
              />
            </div>
            <Button
              onClick={runSendTestEmail}
              disabled={isSendingTestEmail || !testEmailAddress}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-10 px-6 shrink-0 flex items-center gap-2"
            >
              {isSendingTestEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Test Email
            </Button>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-deep-forest/50">SMTP Test Status:</span>
            {diagEmail.status === 'idle' && <span className="text-deep-forest/40 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cream dark:bg-background/30"></span>Not Tested</span>}
            {diagEmail.status === 'running' && <span className="text-sunshine flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Sending...</span>}
            {diagEmail.status === 'pass' && <span className="text-emerald-600 dark:text-green-400 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Email Dispatched Successfully</span>}
            {diagEmail.status === 'fail' && <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" />Failed</span>}
          </div>

          {diagEmail.status === 'pass' && (
            <div className="p-3 bg-emerald-500/[0.04] dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-mono text-emerald-800 dark:text-green-300">
              <div>✓ SMTP Handshake & Dispatch complete. Message ID received.</div>
              <div className="mt-1 text-[10px] opacity-70 text-emerald-800/70 dark:text-green-300/70">{diagEmail.message}</div>
            </div>
          )}

          {diagEmail.status === 'fail' && (
            <div className="p-3 bg-red-500/[0.04] dark:bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-mono text-red-700 dark:text-red-300 break-all">
              <div>✕ SMTP Transport Error</div>
              <p className="mt-1 text-[10px] opacity-70 leading-relaxed">
                Render blocks outbound port 587. Ensure SMTP_PORT is set to 2525 for Brevo. Details: {diagEmail.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Developer Toolkit */}
      <div className="p-5 bg-cream-dark/20 dark:bg-black/20 border border-sunshine/10 rounded-xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg animate-pulse">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-deep-forest">Mobile Developer Toolkit</h4>
              <p className="text-xs text-deep-forest/40">In-app console, inspector & network traffic logger</p>
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={toggleEruda}
              aria-label="Toggle Mobile Developer Toolkit"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                erudaEnabled ? 'bg-emerald-500' : 'bg-cream dark:bg-background/80'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full  shadow-lg ring-0 transition duration-200 ease-in-out ${
                  erudaEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-deep-forest/5 flex items-center justify-between text-xs">
          <span className="text-deep-forest/50">Status:</span>
          {erudaEnabled ? (
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Active (Tap the floating gear)
            </span>
          ) : (
            <span className="text-deep-forest/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cream dark:bg-background/30"></span>
              Disabled
            </span>
          )}
        </div>

        <div className="p-4 bg-cream dark:bg-background/30 border border-sunshine/5 rounded-lg text-xs text-deep-forest/60 space-y-2 leading-relaxed">
          <p>
            Designed specifically for mobile-only developers. When activated, a <strong>floating gear/cog icon</strong> will appear in the bottom-right corner of your screen.
          </p>
          <p>
            Tapping it launches a full developer dashboard directly in your mobile browser, allowing you to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-deep-forest/50 text-[11px] pl-1">
            <li><strong>Inspect DOM</strong>: View and modify HTML elements/CSS styles live.</li>
            <li><strong>Console Logs</strong>: Check printouts, warnings, and uncaught exceptions.</li>
            <li><strong>Network Traffic</strong>: Monitor live fetch/XHR requests and server API payloads.</li>
            <li><strong>Local Storage</strong>: View, add, and clear cookies, session state, and local storage.</li>
            <li><strong>Testing Hub</strong>: Run stress tests on critical business logic below.</li>
            <li><strong>Cache Reset</strong>:
              <button
                onClick={() => {
                  if (confirm('Are you sure? This will clear all local settings and reload the app.')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }
                }}
                className="ml-1 text-emerald-400 hover:text-emerald-300 underline font-bold"
              >
                Purge Local Storage & Refresh
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Feature Stress Testing Hub */}
      <div className="p-6 bg-white dark:bg-card border border-deep-forest/[0.03] dark:border-white/5 rounded-2xl shadow-premium space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sunshine/10 text-sunshine rounded-xl">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-black text-deep-forest text-lg">Logic & Feature Stress Tests</h4>
              <p className="text-xs text-stone font-medium">Simulate complex services with dummy data to verify system health</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDiagTests(prev => prev.map(t => ({ ...t, status: 'idle' })))}
            className="text-[10px] uppercase tracking-widest font-black border-deep-forest/10 hover:bg-sunshine/5 text-deep-forest"
          >
            Reset Tests
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {diagTests.map((test) => (
            <div
              key={test.id}
              className="group p-4 bg-cream/30 dark:bg-white/[0.03] rounded-xl border border-deep-forest/[0.05] dark:border-white/5 flex items-center justify-between hover:border-sunshine/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  test.status === 'pass' ? 'bg-green-500/10 text-green-500' :
                  test.status === 'fail' ? 'bg-red-500/10 text-red-500' :
                  test.status === 'running' ? 'bg-sunshine/10 text-sunshine' :
                  'bg-stone/10 text-stone'
                }`}>
                  {test.status === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                   test.status === 'pass' ? <CheckCircle className="w-5 h-5" /> :
                   test.status === 'fail' ? <XCircle className="w-5 h-5" /> :
                   <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-deep-forest leading-none">{test.name}</p>
                  <p className="text-[10px] text-stone mt-1.5 font-medium">
                    {test.status === 'idle' ? 'Ready to execute' :
                     test.status === 'running' ? 'Compiling dummy payload...' :
                     test.status === 'pass' ? 'Verification successful. PDF ready.' :
                     'Execution error detected'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                disabled={test.status === 'running'}
                onClick={() => runFeatureTest(test.id)}
                className={`h-9 px-5 rounded-lg text-xs font-black shadow-sm transition-all ${
                  test.status === 'pass'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-deep-forest text-white dark:bg-sunshine dark:text-white hover:bg-sunshine dark:hover:bg-sunshine/90'
                }`}
              >
                {test.status === 'pass' ? 'Re-run Test' : 'Execute Test'}
              </Button>
            </div>
          ))}
        </div>

        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-600 dark:text-amber-400/80 leading-relaxed font-medium">
            <strong>Note for Admin:</strong> These tests use locally generated <strong>Dummy Data</strong>.
            Running them will not modify any orders in your live database, but it will generate a real PDF that you can download to verify the layout and calculation logic.
          </p>
        </div>
      </div>
    </div>
  );
}
export default AdminDiagnosticsTab;
