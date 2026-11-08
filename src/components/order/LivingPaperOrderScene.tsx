import { ArrowDown, PackageCheck, PackageOpen } from 'lucide-react';
import { KraftLunchboxArtwork } from '@/components/brand/KraftLunchboxArtwork';

interface LivingPaperOrderSceneProps {
  step: number;
  language: 'bm' | 'en';
  selectedNames: string[];
  guests: number;
  preparationType: 'meal_box' | 'buffet';
  previewClosed: boolean;
  onPreviewClosedChange: (closed: boolean) => void;
  isDemo: boolean;
  showStartAction?: boolean;
}

/**
 * Living Paper V3 scene adapted from the owner's standalone interactive reference.
 * The visual reads the existing order wizard state; it never modifies or submits an order.
 * Box closing is a preview control; only the confirmed stage receives a sent stamp.
 */
export function LivingPaperOrderScene({ step, language, selectedNames, guests, preparationType, previewClosed, onPreviewClosedChange, isDemo, showStartAction = true }: LivingPaperOrderSceneProps) {
  const count = selectedNames.length;
  const confirmed = step === 5 && !isDemo;
  const stage = confirmed ? 'packed' : step <= 1 ? 'home' : step === 2 ? 'menu' : 'box';
  const mode = previewClosed ? 'packed' : (stage === 'packed' ? 'box' : stage);
  const bm = language === 'bm';
  const isBox = preparationType === 'meal_box';

  const copy = confirmed
    ? { tag: 'WAWASAN · LIVING PAPER', title: bm ? 'Tempahan dihantar.' : 'Request sent.', text: bm ? 'Tempahan masih menunggu semakan. Sajian ini ialah ilustrasi contoh.' : 'Your request is awaiting review. Food artwork is illustrative.' }
    : step <= 1
      ? { tag: '01 / DISCOVER', title: bm ? 'Majlis anda, sentuhan kami.' : 'Your occasion, our touch.', text: bm ? 'Mulakan dengan butiran majlis anda.' : 'Start with your event details.' }
      : step === 2
        ? { tag: '02 / CHOOSE', title: bm ? 'Pilih hidangan.' : 'Choose your food.', text: bm ? 'Nama hidangan terpilih muncul pada label. Ilustrasi makanan hanyalah contoh.' : 'Selected dishes appear as paper labels; the food artwork is illustrative.' }
        : { tag: '03 / PACK', title: bm ? 'Disediakan dengan teliti.' : 'Made with care.', text: bm ? 'Semak butiran tempahan. Sajian ini ialah pratonton sahaja.' : 'Review your request. This is an interactive preview only.' };

  return (
    <section className="lc-paper-wrap" aria-label={bm ? 'Living Paper, pratonton tempahan interaktif' : 'Living Paper interactive order preview'}>
      <div className="lc-paper-scene" data-mode={mode} data-stage={stage}>
        <div className="lc-paper-copy">
          <span className="lc-paper-tag">{copy.tag}</span>
          <h2>{copy.title}</h2>
          <p>{copy.text}</p>
        </div>
        <div className="lc-paper-art" aria-hidden="true">
          <KraftLunchboxArtwork closed={previewClosed} servingStyle={preparationType} />
        </div>
        <div className="lc-paper-sprinkle" aria-hidden="true">✳</div>
        <span className="lc-paper-side" aria-hidden="true">FRESHLY CRAFTED · WAWASAN</span>
        {!confirmed && isBox && count > 0 && (
          <button
            className="lc-paper-action"
            type="button"
            aria-pressed={previewClosed}
            onClick={() => onPreviewClosedChange(!previewClosed)}
          >
            {previewClosed ? <PackageOpen size={18} aria-hidden="true" /> : <PackageCheck size={18} aria-hidden="true" />}
            <span>{bm ? (previewClosed ? 'Buka pratonton' : 'Tutup pratonton') : (previewClosed ? 'Open preview' : 'Close preview')}</span>
          </button>
        )}
        {showStartAction && !confirmed && count === 0 && (
          <a className="lc-paper-action" href="#wawasan-order-wizard">
            <ArrowDown size={18} aria-hidden="true" />{bm ? 'Mulakan tempahan' : 'Start booking'}
          </a>
        )}
        <div className="lc-paper-footer" aria-live="polite" aria-atomic="true">
          <span className="lc-paper-pips" aria-hidden="true"><i className="on"/><i className={step >= 2 ? 'on' : ''}/><i className={step >= 3 ? 'on' : ''}/></span>
          <span>{guests} pax · {count} {bm ? 'pilihan hidangan' : 'food selections'} · {isBox ? 'Pre-Pack' : 'Buffet'}{isDemo ? ' · DEMO' : ''}</span>
        </div>
        {count > 0 && !confirmed && (
          <div className="lc-paper-slips" aria-hidden="true" key={`${step}-${selectedNames.join('|')}`}>
            {selectedNames.slice(0, 3).map((name, index) => <span key={`${name}-${index}`} className="lc-paper-slip">{name}</span>)}
            {count > 3 && <span className="lc-paper-slip">+{count - 3}</span>}
          </div>
        )}
        {confirmed && <div className="lc-paper-stamp" aria-label={bm ? 'Permintaan dihantar' : 'Request sent'}>{bm ? 'DIHANTAR' : 'SENT'}</div>}
      </div>
      <div className="lc-paper-journey" aria-hidden="true">
        <span className={step <= 1 ? 'active' : ''}>01 · DISCOVER</span><i />
        <span className={step === 2 ? 'active' : ''}>02 · CHOOSE</span><i />
        <span className={step >= 3 ? 'active' : ''}>03 · PACK</span>
      </div>
    </section>
  );
}

