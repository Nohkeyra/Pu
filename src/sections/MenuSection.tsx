import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Coffee, Flame, Search, Sparkles, UtensilsCrossed, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { MENU_ITEMS, type FeaturedMenuItem } from '@/constants/menu';
import ResponsiveImage from '@/components/ui/ResponsiveImage';
import { triggerLightImpact } from '@/lib/haptics';

const MenuCard = React.memo(
  ({ item, bm, onOrder }: { item: FeaturedMenuItem; bm: boolean; onOrder: () => void }) => (
    <article className="landing-menu-card">
      <div className="landing-menu-photo">
        <ResponsiveImage
          src={item.image || ''}
          alt={bm ? item.nameBm : item.nameEn}
          aspectRatio="4/3"
          width={600}
          height={450}
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
          containerClassName="w-full h-full"
        />
        {item.tags?.includes('signature') && (
          <span className="landing-menu-badge">
            <Sparkles size={12} aria-hidden="true" />
            {bm ? 'Pilihan Wawasan' : 'Wawasan favourite'}
          </span>
        )}
      </div>
      <div className="landing-menu-body">
        <h3>{bm ? item.nameBm : item.nameEn}</h3>
        <p>{bm ? item.descBm : item.descEn}</p>
      </div>
      <div className="landing-menu-footer">
        <span>
          <small>{bm ? 'Harga bermula' : 'Starting from'}</small>
          <strong>RM {item.price.toFixed(2)}</strong>
        </span>
        <button
          type="button"
          onClick={onOrder}
          aria-label={`${bm ? 'Tempah' : 'Order'} ${bm ? item.nameBm : item.nameEn}`}
        >
          <span>{bm ? 'Tempah' : 'Order'}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </article>
  )
);

export default function MenuSection() {
  const { t, language } = useLanguage();
  const bm = language === 'bm';
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const categories = [
    { id: 'all', label: bm ? 'Semua sajian' : 'All dishes', icon: UtensilsCrossed },
    { id: 'mains', label: bm ? 'Hidangan utama' : 'Mains', icon: Flame },
    { id: 'breakfast', label: bm ? 'Sarapan & soto' : 'Breakfast & soups', icon: Sparkles },
    { id: 'drinks', label: bm ? 'Minuman' : 'Drinks', icon: Coffee },
  ];
  const items = useMemo(
    () =>
      MENU_ITEMS.filter((item) => {
        const categoryMatches =
          activeCategory === 'all' ||
          (activeCategory === 'mains' &&
            (item.category === 'lunch' || ['asam-pedas', 'nasi-campur'].includes(item.id))) ||
          (activeCategory === 'breakfast' &&
            item.category === 'breakfast' &&
            item.id !== 'nasi-campur') ||
          (activeCategory === 'drinks' && item.category === 'drinks');
        const query = searchQuery.trim().toLowerCase();
        return (
          categoryMatches &&
          (!query ||
            [item.nameEn, item.nameBm, item.descEn, item.descBm].some((value) =>
              value.toLowerCase().includes(query)
            ))
        );
      }),
    [activeCategory, searchQuery]
  );
  const order = () => {
    void triggerLightImpact();
    navigate('/order');
  };

  return (
    <section id="menu" className="landing-menu-section">
      <div className="content-container">
        <div className="landing-section-heading">
          <div>
            <p className="landing-eyebrow">{bm ? 'DIPILIH UNTUK ANDA' : 'PICKED FOR YOU'}</p>
            <h2 className="landing-section-title">{t('menu_title')}</h2>
          </div>
          <p>{t('menu_subtitle')}</p>
        </div>
        <div className="landing-menu-toolbar">
          <div
            className="landing-menu-categories"
            role="group"
            aria-label={bm ? 'Kategori menu' : 'Menu categories'}
          >
            {categories.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={activeCategory === id}
                onClick={() => {
                  void triggerLightImpact();
                  setActiveCategory(id);
                }}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <div className="landing-menu-search">
            <label htmlFor="landing-menu-search" className="sr-only">
              {bm ? 'Cari sajian' : 'Search dishes'}
            </label>
            <Search size={17} aria-hidden="true" />
            <input
              id="landing-menu-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={bm ? 'Cari sajian kegemaran…' : 'Find your favourite…'}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={bm ? 'Kosongkan carian' : 'Clear search'}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <p className="landing-menu-count" role="status">
          {bm ? `${items.length} pilihan sajian` : `${items.length} dishes to explore`}
        </p>
        {items.length ? (
          <div className="landing-menu-grid">
            {items.map((item) => (
              <MenuCard key={item.id} item={item} bm={bm} onOrder={order} />
            ))}
          </div>
        ) : (
          <div className="landing-menu-empty">
            <Search size={26} aria-hidden="true" />
            <h3>{bm ? 'Sajian tidak ditemui' : 'No dishes found'}</h3>
            <p>
              {bm
                ? 'Cuba nama lain atau lihat semula semua sajian.'
                : 'Try a different name or explore all dishes again.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
            >
              {bm ? 'Lihat semua sajian' : 'Show all dishes'}
            </button>
          </div>
        )}
        <div className="landing-order-callout">
          <div>
            <p className="landing-eyebrow">{bm ? 'UNTUK MAJLIS ANDA' : 'FOR YOUR GATHERING'}</p>
            <h3>
              {bm
                ? 'Anda rancang majlis. Kami sediakan sajian.'
                : 'You plan the occasion. We bring the flavour.'}
            </h3>
            <p>
              {bm
                ? 'Pilih menu dan hantar permintaan katering. Anda juga boleh menempah sebagai pelawat.'
                : 'Choose a menu and submit your catering request. Guest orders are welcome too.'}
            </p>
          </div>
          <Link to="/order" className="landing-button landing-button-primary">
            {bm ? 'Mulakan tempahan' : 'Start your order'}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
