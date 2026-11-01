import React from 'react';
import { ArrowUpRight, Coffee, MapPin, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

const HighlightsSection = React.memo(() => {
  const { language } = useLanguage();
  const bm = language === 'bm';
  const highlights = [
    {
      icon: Coffee,
      title: bm ? 'Sarapan & sajian harian' : 'Breakfast & everyday favourites',
      description: bm
        ? 'Lontong, soto, teh tarik dan banyak lagi.'
        : 'Lontong, soto, teh tarik and more.',
      href: '#menu',
    },
    {
      icon: UtensilsCrossed,
      title: bm ? 'Katering untuk majlis anda' : 'Catering for your gathering',
      description: bm
        ? 'Pilihan untuk pejabat, mesyuarat dan acara.'
        : 'Options for offices, meetings and events.',
      href: '/order',
    },
    {
      icon: MapPin,
      title: bm ? 'Singgah di Putrajaya' : 'Find us in Putrajaya',
      description: bm ? 'Aras B3, Menara PjH, Presint 2.' : 'Level B3, Menara PjH, Precinct 2.',
      href: '#visit',
    },
  ];
  return (
    <section className="landing-highlights" aria-label={bm ? 'Terokai Wawasan' : 'Explore Wawasan'}>
      <div className="content-container landing-highlights-grid">
        {highlights.map(({ icon: Icon, title, description, href }, index) => {
          const content = (
            <>
              <span className="landing-highlight-icon">
                <Icon size={23} aria-hidden="true" />
              </span>
              <span className="landing-highlight-copy">
                <small>0{index + 1}</small>
                <strong>{title}</strong>
                <span>{description}</span>
              </span>
              <ArrowUpRight className="landing-highlight-arrow" size={18} aria-hidden="true" />
            </>
          );
          return href.startsWith('#') ? (
            <a className="landing-highlight" href={href} key={href}>
              {content}
            </a>
          ) : (
            <Link className="landing-highlight" to={href} key={href}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
});
export default HighlightsSection;
