import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, ArrowLeft, Shield, Sun, Moon, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminPanel from '@/components/AdminPanel';
import { Batik3DMotion } from '@/components/Batik3DMotion';
import { getApiUrl } from '@/lib/api';
import { getAssetUrl } from '@/lib/utils';
import { setSecureItem, getSecureItem, removeSecureItem } from '@/lib/preferences';

// NOTE: the admin password itself is never stored anywhere on the device
// (not localStorage, not Preferences). It is sent to the server exactly
// once, at login, in exchange for a short-lived (12h) JWT session token.
// That token — never the password — is what gets persisted and resent on
// subsequent admin API calls.
const ADMIN_TOKEN_STORAGE_KEY = 'wawasan_admin_token';

export default function AdminPage() {
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const storedToken = await getSecureItem(ADMIN_TOKEN_STORAGE_KEY);
      if (storedToken) {
        setToken(storedToken);
        setIsAuthenticated(true);
      }
    };
    init();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(getApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok && data.success && data.token) {
        setToken(data.token);
        await setSecureItem(ADMIN_TOKEN_STORAGE_KEY, data.token);
        setIsAuthenticated(true);
      } else {
        setError(t('wrong_password') || 'Invalid password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background pattern-dots flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 bg-cream/90 dark:bg-background/90 backdrop-blur-xl border-b border-border pt-[var(--sat)]">
          <div className="flex items-center justify-between px-6 md:px-12 h-[72px]">
            <div onClick={() => navigate('/home', { replace: true })} className="flex items-center gap-3 group cursor-pointer">
              <img
                src={getAssetUrl("/assets/wawasan_logo.jpg")}
                alt="Restoran Wawasan Logo"
                className="w-10 h-10 object-contain shrink-0 mix-blend-multiply"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="font-display font-semibold text-xl text-deep-forest leading-none">
                  Wawasan
                </span>
                <span className="block font-body text-[10px] text-crisp-carrot font-bold uppercase tracking-[0.18em] leading-tight mt-0.5">
                  Pak Usop
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleTheme} 
                className="p-2 md:p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-deep-forest" />
                ) : (
                  <Sun className="w-5 h-5 text-sunshine" />
                )}
              </button>
              <Button variant="ghost" onClick={() => navigate('/home', { replace: true })} className="text-stone hover:text-crisp-carrot hover:bg-sunshine/10 rounded-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back')}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 pt-[calc(72px+var(--sat)+2rem)]">
          <div className="w-full max-w-md">
            <div className="bg-white dark:bg-card rounded-3xl shadow-2xl border border-border overflow-hidden relative">
              {/* Background Batik Pattern for Admin Login Card */}
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <Batik3DMotion
                  maxRotation={12}
                  imgClassName="opacity-[0.14] dark:opacity-[0.22]"
                  mode="background"
                />
              </div>
              
              <div className="h-2 bg-gradient-to-r from-sunshine to-crisp-carrot relative z-10" />
              
              <div className="p-8 md:p-10 relative z-10">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-sunshine/10 flex items-center justify-center border border-sunshine/20">
                    <Lock className="w-8 h-8 text-sunshine" />
                  </div>
                </div>

                <h2 className="text-2xl md:text-3xl font-display font-bold text-deep-forest text-center mb-2">
                  {t('admin_login')}
                </h2>
                <p className="text-stone text-center text-sm font-medium mb-8 uppercase tracking-widest text-[10px]">
                  Restricted Access • Staff Only
                </p>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-deep-forest mb-2">
                      {t('password')}
                    </label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-cream dark:bg-background border-border text-deep-forest placeholder:text-stone focus:border-sunshine focus:ring-1 focus:ring-sunshine h-12 rounded-xl"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-tomato-burst/10 border border-tomato-burst/20 text-tomato-burst text-sm font-semibold text-center">
                      {error}
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-sunshine text-white font-bold hover:bg-crisp-carrot transition-colors duration-300 disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl shadow-sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin h-4 w-4" />
                          {t('loading')}
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          {t('login')}
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                <p className="mt-8 text-center text-[10px] text-stone">
                  This area is protected. Unauthorized access is prohibited.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <AdminPanel
      adminToken={token}
      onLogout={() => {
        removeSecureItem(ADMIN_TOKEN_STORAGE_KEY);
        setIsAuthenticated(false);
        setToken('');
      }}
    />
  );
}
