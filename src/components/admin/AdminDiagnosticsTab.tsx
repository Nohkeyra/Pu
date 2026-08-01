import React from 'react';
import { 
  Database, Calendar, FileText, Smartphone, Mail, Activity, 
  Terminal, ShieldCheck, AlertTriangle, Loader2, Play, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface DiagState {
  status: 'idle' | 'running' | 'pass' | 'fail';
  projectId?: string;
  authStatus?: string;
  message?: string;
}

interface AdminDiagnosticsTabProps {
  diagFirebase: DiagState;
  diagCalendar: DiagState;
  diagPdf: DiagState;
  diagNative: DiagState;
  diagEmail: DiagState;
  diagTests: { id: string; status: 'idle' | 'running' | 'pass' | 'fail'; name: string }[];
  testEmailAddress: string;
  isSendingTestEmail: boolean;
  erudaEnabled: boolean;
  runAllDiagnostics: () => void;
  runFirebaseDiag: () => void;
  runCalendarDiag: () => void;
  runPdfDiag: () => void;
  runNativeDiag: () => void;
  runSendTestEmail: (e: React.FormEvent) => void;
  runFeatureTest: (feature: string) => void;
  toggleEruda: () => void;
  setTestEmailAddress: (val: string) => void;
  setDiagTests: React.Dispatch<React.SetStateAction<{ id: string; status: 'idle' | 'running' | 'pass' | 'fail'; name: string }[]>>;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pass': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'fail': return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
    case 'running': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
    default: return 'text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-white/5 border-stone-200 dark:border-white/10';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pass': return <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    case 'fail': return <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
    case 'running': return <Loader2 className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-spin" />;
    default: return <Activity className="w-5 h-5 text-stone-400" />;
  }
};

const DiagCard = ({
  icon: Icon,
  title,
  description,
  state,
  onRun
}: {
  icon: React.ElementType,
  title: string,
  description: string,
  state: DiagState,
  onRun: () => void
}) => (
  <div className="bg-white dark:bg-card border border-stone-200/60 dark:border-white/10 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md group">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          getStatusColor(state.status)
        )}>
          {getStatusIcon(state.status)}
        </div>
        <div>
          <h3 className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Icon className="w-4 h-4 text-stone-500" />
            {title}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{description}</p>
        </div>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        onClick={onRun}
        disabled={state.status === 'running'}
        className="shrink-0 rounded-xl h-8 text-xs font-semibold px-3"
      >
        {state.status === 'running' ? 'Running...' : 'Test'}
      </Button>
    </div>
    
    {(state.message || state.projectId || state.authStatus) && (
      <div className={cn(
        "mt-4 p-3 rounded-xl text-xs font-mono break-all",
        state.status === 'fail' ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300" :
        state.status === 'pass' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" :
        "bg-stone-50 dark:bg-white/5 text-stone-600 dark:text-stone-300"
      )}>
        {state.projectId && <div>Project ID: {state.projectId}</div>}
        {state.authStatus && <div>Auth: {state.authStatus}</div>}
        {state.message && <div>Output: {state.message}</div>}
      </div>
    )}
  </div>
);

export function AdminDiagnosticsTab({
  diagFirebase,
  diagCalendar,
  diagPdf,
  diagNative,
  diagEmail,
  testEmailAddress,
  isSendingTestEmail,
  erudaEnabled,
  runAllDiagnostics,
  runFirebaseDiag,
  runCalendarDiag,
  runPdfDiag,
  runNativeDiag,
  runSendTestEmail,
  toggleEruda,
  setTestEmailAddress
}: AdminDiagnosticsTabProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-stone-900 to-stone-800 dark:from-stone-900 dark:to-stone-950 p-6 rounded-3xl shadow-lg border border-stone-800">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Terminal className="w-6 h-6 text-emerald-400" />
            System Health
          </h2>
          <p className="text-stone-400 text-sm font-medium mt-1">
            Run diagnostic checks to verify system integrations and capabilities.
          </p>
        </div>
        <Button 
          onClick={runAllDiagnostics}
          className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-emerald-500/20 shadow-lg rounded-xl font-bold px-6 h-11 shrink-0 w-full sm:w-auto flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          Run All Checks
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DiagCard 
          icon={Database}
          title="Firebase & Firestore"
          description="Checks connection and write permissions to the Firestore database."
          state={diagFirebase}
          onRun={runFirebaseDiag}
        />
        <DiagCard 
          icon={Calendar}
          title="Google Calendar API"
          description="Verifies the OAuth integration and calendar access."
          state={diagCalendar}
          onRun={runCalendarDiag}
        />
        <DiagCard 
          icon={FileText}
          title="PDF Engine"
          description="Tests the html2canvas and jspdf generation pipeline."
          state={diagPdf}
          onRun={runPdfDiag}
        />
        <DiagCard 
          icon={Smartphone}
          title="Native Capabilities"
          description="Checks Capacitor plugins (Filesystem, Share, Network) for mobile."
          state={diagNative}
          onRun={runNativeDiag}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white dark:bg-card border border-stone-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100">SMTP Email Delivery</h3>
              <p className="text-xs text-stone-500">Test outbound email configuration</p>
            </div>
          </div>
          
          <form onSubmit={runSendTestEmail} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-stone-700 dark:text-stone-300">Test Email Address</Label>
              <Input
                type="email"
                required
                placeholder="admin@example.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="bg-stone-50 dark:bg-background/50 border-stone-200 dark:border-white/10"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSendingTestEmail || !testEmailAddress}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-bold shadow-blue-500/20 shadow-lg"
            >
              {isSendingTestEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Test Invoice
            </Button>
            
            {diagEmail.status !== 'idle' && (
              <div className={cn(
                "p-3 rounded-xl text-xs font-mono mt-3",
                diagEmail.status === 'pass' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" :
                diagEmail.status === 'fail' ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300" :
                "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
              )}>
                {diagEmail.message || (diagEmail.status === 'running' ? 'Sending email...' : '')}
              </div>
            )}
          </form>
        </div>

        <div className="bg-white dark:bg-card border border-stone-200/60 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 dark:text-stone-100">Developer Tools</h3>
              <p className="text-xs text-stone-500">Advanced settings for debugging</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-stone-200/60 dark:border-white/10 bg-stone-50 dark:bg-white/5">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-stone-900 dark:text-stone-100 cursor-pointer">
                  Eruda Console
                </Label>
                <p className="text-xs text-stone-500">
                  Enable mobile developer console overlay for debugging Capacitor WebView.
                </p>
              </div>
              <Switch 
                checked={erudaEnabled} 
                onCheckedChange={toggleEruda}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

