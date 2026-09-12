import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import AdminPanel from '@/components/AdminPanel';
import AuthModal from '@/components/AuthModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getApiUrl } from '@/lib/api';
import WawasanLoader from '@/components/WawasanLoader';
import { Button } from '@/components/ui/button';
import { saveAdminToken, clearAdminSession } from '@/services/authService';

export default function AdminPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idToken = await currentUser.getIdToken(true);
          
          // Verify with server to ensure it has admin claim
          const res = await fetch(getApiUrl('/api/admin/verify'), {
            headers: { Authorization: `Bearer ${idToken}` }
          });
          
          if (res.ok) {
            await saveAdminToken(idToken);
            setToken(idToken);
          } else {
            setToken('');
            await clearAdminSession();
            setError('You do not have administrative privileges. Only authorized users may access this panel.');
          }
        } catch {
          setToken('');
          setError('Failed to verify admin status.');
        }
      } else {
        setToken('');
        await clearAdminSession();
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <WawasanLoader size={80} />
        <p className="text-xs font-semibold tracking-widest text-amber-800 dark:text-amber-400 uppercase animate-pulse">Memuatkan...</p>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-cream dark:bg-background pattern-dots flex flex-col items-center justify-center relative p-4">
        <div className="panel-surface p-8 max-w-md w-full text-center space-y-6 z-10">
          <h2 className="text-2xl font-artistic text-deep-forest dark:text-white">Admin Access Restricted</h2>
          {error ? (
            <p className="text-red-600 dark:text-red-400 font-medium text-sm">{error}</p>
          ) : (
            <p className="text-stone dark:text-stone-300 text-sm">You must be logged in as an administrator.</p>
          )}
          
          <div className="space-y-3 pt-4">
            {!user ? (
              <Button onClick={() => setAuthOpen(true)} className="w-full bg-[var(--color-sunshine-cta)] text-white hover:opacity-90">
                Log In
              </Button>
            ) : (
              <Button onClick={() => signOut(auth)} variant="outline" className="w-full">
                Sign Out
              </Button>
            )}
            <Button onClick={() => navigate('/login')} variant="ghost" className="w-full">
              Back to Main Menu
            </Button>
          </div>
        </div>
        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => setAuthOpen(false)}
          isAdminAuth={true}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AdminPanel
        adminToken={token}
        onLogout={async () => {
          await clearAdminSession();
          await signOut(auth);
          navigate('/login');
        }}
      />
    </ErrorBoundary>
  );
}
