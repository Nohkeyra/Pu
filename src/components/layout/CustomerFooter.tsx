import { useLanguage } from '@/context/LanguageContext';
import { getAssetUrl } from '@/lib/utils';
import '../../pages/customer-footer.css';

/** Shared, theme-aware footer for customer workflows. BottomNavigation stays separate. */
export default function CustomerFooter() {
  const { language } = useLanguage();
  const bm = language === 'bm';

  return (
    <footer className="customer-brand-footer" aria-label={bm ? 'Maklumat restoran' : 'Restaurant information'}>
      <div
        className="customer-brand-footer__batik"
        style={{ backgroundImage: `url(${getAssetUrl('/assets/heritage/batik_vector_pattern.jpg')})` }}
        aria-hidden="true"
      />
      <div className="customer-brand-footer__content">
        <p className="customer-brand-footer__name">Restoran Wawasan Pak Usop</p>
        <p className="customer-brand-footer__tagline">
          {bm ? 'Cita rasa warisan' : 'Heritage flavours'}
        </p>
        <div className="customer-brand-footer__rule" aria-hidden="true" />
        <p className="customer-brand-footer__copyright">
          © {new Date().getFullYear()} Restoran Wawasan.{' '}
          {bm ? 'Hak cipta terpelihara.' : 'All rights reserved.'}
        </p>
      </div>
    </footer>
  );
}
