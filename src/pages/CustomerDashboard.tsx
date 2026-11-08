import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { CalendarDays, MapPin, UserRound, ArrowRight, ShieldCheck } from 'lucide-react';
import { auth } from '@/firebaseConfig';
import CustomerPageLayout from '@/components/layout/CustomerPageLayout';
import './customer-dashboard.css';
import { CustomerPageHeader } from '@/components/layout/CustomerPageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WawasanLoader from '@/components/brand/WawasanLoader';
import { KraftLunchboxArtwork } from '@/components/brand/KraftLunchboxArtwork';
import { useLanguage } from '@/context/LanguageContext';
import './customer-calendar-profile.css';

/** Authenticated entry for APK and web members, distinct from public marketing. */
export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bm = language === 'bm';
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [ready, setReady] = useState(false);
  useEffect(() => onAuthStateChanged(auth, signedIn => {
    setUser(signedIn);
    setReady(true);
  }, () => setReady(true)), []);

  if (!ready) return <div className="min-h-[60vh] flex items-center justify-center"><WawasanLoader size={80} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  let adminActive = user.uid === 'admin';
  try { adminActive ||= Boolean(localStorage.getItem('wawasan_admin_token')); } catch { /* no storage */ }
  if (adminActive) return <Navigate to="/admin" replace />;
  const actions = [
    { icon: UserRound, title: bm ? 'Tempahan & profil' : 'My orders & profile', description: bm ? 'Semak status dan sejarah' : 'Track status and history', path: '/profile' },
    { icon: CalendarDays, title: bm ? 'Kalendar' : 'Calendar', description: bm ? 'Rancang tarikh majlis' : 'Plan your event date', path: '/calendar' },
    { icon: MapPin, title: bm ? 'Maklumat & tetapan' : 'Details & settings', description: bm ? 'Urus maklumat akaun' : 'Manage account preferences', path: '/settings' },
  ];
  return (
    <CustomerPageLayout className="customer-dashboard-page relative">
      <CustomerPageHeader title={bm ? 'Ruang pelanggan' : 'Customer dashboard'} subtitle={bm ? 'Tempahan katering anda' : 'Your catering workspace'} showBack={false} onBack={() => navigate('/app')} actions={[{ label: bm ? 'Tempahan baharu' : 'New order', onSelect: () => navigate('/order') }, { label: bm ? 'Profil' : 'Profile', onSelect: () => navigate('/profile') }]} />
      <div className="customer-content customer-dashboard-content mx-auto w-full max-w-5xl px-4 pb-8">
        <Card variant="panel" padding="md" className="customer-dashboard-welcome">
          <div className="customer-dashboard-welcome-copy">
            <p className="customer-dashboard-eyebrow">WAWASAN <span aria-hidden="true">·</span> PAK USOP</p>
            <h2>{bm ? 'Selamat kembali!' : 'Welcome back!'}</h2>
            <p className="customer-dashboard-identity">{user.displayName || user.email}</p>
            {!user.emailVerified && <p className="customer-dashboard-verify"><ShieldCheck aria-hidden="true" />{bm ? 'Sahkan e-mel sebelum menghantar tempahan.' : 'Verify your email before submitting an order.'}</p>}
            <Button type="button" size="lg" onClick={() => navigate('/order')} className="customer-dashboard-booking-button">
              {bm ? 'Mulakan tempahan' : 'Start booking'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="customer-dashboard-welcome-art" aria-hidden="true">
            <KraftLunchboxArtwork />
          </div>
        </Card>
        <section className="customer-dashboard-shortcuts" aria-label={bm ? 'Pintasan halaman' : 'Page shortcuts'}>
          <div className="customer-dashboard-shortcuts-heading">
            <h2>{bm ? 'Terus ke urusan anda' : 'Where would you like to go?'}</h2>
            <p>{bm ? 'Pilih tindakan untuk diteruskan.' : 'Choose your next action.'}</p>
          </div>
        <div className="customer-dashboard-actions grid grid-cols-1 gap-3 sm:grid-cols-2">
          {actions.map(({ icon: Icon, title, description, path }, index) => (
            <button type="button" key={path} onClick={() => navigate(path)} className="customer-dashboard-action">
              <span className="customer-dashboard-action-top">
                <span className="customer-dashboard-action-icon"><Icon aria-hidden="true" /></span>
                <span className="customer-dashboard-action-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              </span>
              <span className="customer-dashboard-action-title">{title}</span>
              <span className="customer-dashboard-action-description">{description}</span>
              <ArrowRight className="customer-dashboard-action-arrow" aria-hidden="true" />
            </button>
          ))}
        </div>
        </section>
      </div>
    </CustomerPageLayout>
  );
}
