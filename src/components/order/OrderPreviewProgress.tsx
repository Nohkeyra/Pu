import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronUp, MoreHorizontal } from 'lucide-react';
import type { MenuItem } from '@/constants/menu';
import { KraftLunchboxArtwork } from '@/components/brand/KraftLunchboxArtwork';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LivingPaperOrderScene } from './LivingPaperOrderScene';

interface OrderPreviewProgressProps {
  step: number;
  language: 'bm' | 'en';
  dishes: MenuItem[];
  veggies: MenuItem[];
  customMenu: string;
  guests: number;
  preparationType: 'meal_box' | 'buffet';
  isDemo: boolean;
  isKeyboardVisible: boolean;
  children: ReactNode;
}

/** The large scene, sticky progress and sheet all read the same order/preview state. */
export function OrderPreviewProgress({ children, isKeyboardVisible, ...props }: OrderPreviewProgressProps) {
  const { step, language, dishes, veggies, customMenu, preparationType, guests, isDemo } = props;
  const bm = language === 'bm';
  const anchor = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLElement>(null);
  const contentId = useId();
  const [docked, setDocked] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewClosed, setPreviewClosed] = useState(false);
  const selectedNames = Array.from(new Set([...(Array.isArray(dishes) ? dishes : []), ...(Array.isArray(veggies) ? veggies : [])]
    .filter(Boolean).map(item => bm ? (item.nameBm || item.nameEn) : (item.nameEn || item.nameBm)).filter(Boolean)));
  if (typeof customMenu === 'string' && customMenu.trim()) selectedNames.push(bm ? 'Menu khas' : 'Custom menu');
  const closed = preparationType === 'meal_box' && ((step === 5 && !isDemo) || (previewClosed && selectedNames.length > 0));
  const mini = docked || isKeyboardVisible;
  const sceneProps = { step, language, selectedNames, guests, preparationType, isDemo, previewClosed: closed, onPreviewClosedChange: setPreviewClosed };

  useEffect(() => { setPreviewClosed(false); }, [step, preparationType]);
  useEffect(() => { if (isKeyboardVisible) setActionsOpen(false); }, [isKeyboardVisible]);

  useEffect(() => {
    const target = anchor.current;
    if (!target) return;
    const header = target.closest('.customer-page')?.querySelector('.customer-page-header');
    let observer: IntersectionObserver | undefined;
    const update = () => {
      const rawTop = (header?.getBoundingClientRect().bottom || 0) + 6;
      const top = Number.isFinite(rawTop) ? Math.max(0, rawTop) : 0;
      setDocked(target.getBoundingClientRect().bottom <= top);
    };
    const observe = () => {
      observer?.disconnect();
      update();
      if (typeof IntersectionObserver !== 'undefined') {
        const rawTop = (header?.getBoundingClientRect().bottom || 0) + 6;
        const top = Number.isFinite(rawTop) ? Math.max(0, rawTop) : 0;
        observer = new IntersectionObserver(update, { rootMargin: `-${top}px 0px 0px 0px`, threshold: 0 });
        observer.observe(target);
      }
    };
    observe();
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(observe) : undefined;
    if (header) resize?.observe(header);
    // Scroll listener is only a fallback for embedded browsers without IO.
    if (typeof IntersectionObserver === 'undefined') window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', observe);
    return () => {
      observer?.disconnect(); resize?.disconnect();
      window.removeEventListener('scroll', update); window.removeEventListener('resize', observe);
    };
  }, []);

  useEffect(() => {
    const nav = progress.current;
    const form = nav?.closest<HTMLElement>('.customer-order-form');
    if (!nav || !form) return;
    const measure = () => form.style.setProperty('--order-preview-height', `${nav.getBoundingClientRect().height}px`);
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : undefined;
    observer?.observe(nav);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); form.style.removeProperty('--order-preview-height'); };
  }, [step, mini, actionsOpen, isKeyboardVisible]);


  return (
    <>
      <div ref={anchor} className="customer-order-preview-anchor">
        <LivingPaperOrderScene {...sceneProps} />
      </div>
      {step <= 4 && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <nav ref={progress} id="wawasan-order-wizard" className="customer-order-progress batik-header" aria-label={bm ? 'Kemajuan tempahan' : 'Order progress'} data-preview-docked={mini} data-actions-open={actionsOpen} data-keyboard-visible={isKeyboardVisible}>
            <div className="lc-preview-mini-row">
              <DialogTrigger asChild>
                <button type="button" className="lc-preview-trigger" aria-label={bm ? 'Buka pratonton tempahan' : 'Open order preview'}>
                  <span className="lc-preview-mini-art" aria-hidden="true"><KraftLunchboxArtwork key={`${step}-${guests}-${preparationType}-${selectedNames.join('|')}`} closed={closed} servingStyle={preparationType} /></span>
                  <span className="lc-preview-mini-copy">
                    <strong>{bm ? 'Langkah' : 'Step'} {step}/4 <span>· {preparationType === 'buffet' ? 'Buffet' : 'Pre-Pack'}</span></strong>
                    <span key={`${guests}-${selectedNames.length}`} className="lc-preview-live-count">{guests} pax · {selectedNames.length} {bm ? 'pilihan' : 'selections'}{isDemo ? ' · DEMO' : ''}</span>
                  </span>
                  <ChevronUp aria-hidden="true" />
                </button>
              </DialogTrigger>
              <button type="button" className="lc-preview-more" aria-label={bm ? 'Tindakan kemajuan tempahan' : 'Order progress actions'} aria-expanded={actionsOpen} aria-controls={contentId} onClick={() => setActionsOpen(value => !value)}><MoreHorizontal aria-hidden="true" /></button>
            </div>
            <div id={contentId} className="lc-preview-progress-content">{children}</div>
          </nav>
          <DialogContent className="lc-preview-sheet">
            <DialogHeader>
              <DialogTitle>{bm ? 'Pratonton tempahan' : 'Order preview'}</DialogTitle>
              <DialogDescription>{bm ? 'Pilihan dan pax mengikut draf semasa. Makanan dilukis sebagai contoh.' : 'Selections and pax follow your current draft. Food artwork is illustrative.'}</DialogDescription>
            </DialogHeader>
            <div className="lc-order-experience"><LivingPaperOrderScene {...sceneProps} showStartAction={false} /></div>
            {selectedNames.length > 0 && <ul className="lc-preview-selected">{selectedNames.map((name, i) => <li key={`${name}-${i}`}>{name}</li>)}</ul>}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
