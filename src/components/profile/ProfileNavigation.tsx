import type { KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';

type ProfileTab = 'orders' | 'profile' | 'locations' | 'preferences';

interface ProfileNavigationProps {
  idPrefix: string;
  value: ProfileTab;
  onChange: (value: ProfileTab) => void;
  t: (en: string, bm: string) => string;
}

export function ProfileNavigation({ idPrefix, value, onChange, t }: ProfileNavigationProps) {
  const reduceMotion = useReducedMotion();
  const tabs: { value: ProfileTab; label: string }[] = [
    { value: 'orders', label: t('Orders', 'Tempahan') },
    { value: 'profile', label: t('Profile', 'Profil') },
    { value: 'locations', label: t('Locations', 'Lokasi') },
    { value: 'preferences', label: t('Preferences', 'Pilihan') },
  ];

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;

    event.preventDefault();
    onChange(tabs[next].value);
    document.getElementById(`${idPrefix}-tab-${tabs[next].value}`)?.focus();
  };

  return (
    <div className="profile-tabs" role="tablist" aria-label={t('Profile sections', 'Bahagian profil')}>
      {tabs.map((tab, index) => (
        <Button
          key={tab.value}
          id={`${idPrefix}-tab-${tab.value}`}
          type="button"
          variant="ghost"
          className="relative active:scale-[0.98] motion-reduce:active:scale-100"
          role="tab"
          aria-selected={value === tab.value}
          aria-controls={`${idPrefix}-panel-${tab.value}`}
          tabIndex={value === tab.value ? 0 : -1}
          onClick={() => onChange(tab.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {tab.label}
          {value === tab.value && (
            <motion.span
              layoutId={`${idPrefix}-tab-accent`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[20%] bottom-[2px] h-[2px] rounded-full bg-[var(--color-sunshine-cta)]"
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 40 }}
            />
          )}
        </Button>
      ))}
    </div>
  );
}
