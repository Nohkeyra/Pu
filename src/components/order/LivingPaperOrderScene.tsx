import { useEffect, useState } from 'react';
import { ArrowDown, PackageCheck, PackageOpen } from 'lucide-react';
import type { MenuItem } from '@/constants/menu';

interface LivingPaperOrderSceneProps {
  step: number;
  language: 'bm' | 'en';
  dishes: MenuItem[];
  veggies: MenuItem[];
  customMenu: string;
  isDemo: boolean;
}

/**
 * Living Paper V3 scene adapted from the owner's standalone interactive reference.
 * The visual reads the existing order wizard state; it never modifies or submits an order.
 * A sealed box represents the real submission confirmation only, not a draft or review.
 */
export function LivingPaperOrderScene({ step, language, dishes, veggies, customMenu, isDemo }: LivingPaperOrderSceneProps) {
  const [previewClosed, setPreviewClosed] = useState(false);
  const selected = [...(Array.isArray(dishes) ? dishes : []), ...(Array.isArray(veggies) ? veggies : [])].filter(Boolean);
  const selectedNames = Array.from(new Set(selected.map(item => language === 'bm' ? (item.nameBm || item.nameEn) : (item.nameEn || item.nameBm)).filter(Boolean)));
  if (typeof customMenu === 'string' && customMenu.trim()) selectedNames.push(language === 'bm' ? 'Menu khas' : 'Custom menu');
  const count = selectedNames.length;
  const confirmed = step === 5 && !isDemo;
  const stage = confirmed ? 'packed' : step <= 1 ? 'home' : step === 2 ? 'menu' : 'box';
  const mode = confirmed || (previewClosed && count > 0) ? 'packed' : stage;
  const bm = language === 'bm';

  // On navigating to a new stage, restore the open preview. The confirmation
  // stage intentionally stays sealed and cannot be toggled by a UI preview.
  useEffect(() => { setPreviewClosed(false); }, [step]);

  const copy = confirmed
    ? { tag: 'WAWASAN · LIVING PAPER', title: bm ? 'Tempahan dihantar.' : 'Request sent.', text: bm ? 'Kotak ditutup sebagai ilustrasi. Tempahan masih menunggu semakan.' : 'A sealed illustration. Your request is awaiting review.' }
    : step <= 1
      ? { tag: '01 / DISCOVER', title: bm ? 'Majlis anda, sentuhan kami.' : 'Your occasion, our touch.', text: bm ? 'Mulakan dengan butiran majlis anda.' : 'Start with your event details.' }
      : step === 2
        ? { tag: '02 / CHOOSE', title: bm ? 'Pilih hidangan.' : 'Choose your food.', text: bm ? 'Nama hidangan terpilih muncul pada label. Ilustrasi makanan hanyalah contoh.' : 'Selected dishes appear as paper labels; the food artwork is illustrative.' }
        : { tag: '03 / PACK', title: bm ? 'Disediakan dengan teliti.' : 'Made with care.', text: bm ? 'Semak butiran tempahan. Kotak sebenar belum dibungkus.' : 'Review your request. This is an interactive preview only.' };

  return (
    <section className="lc-paper-wrap" aria-label={bm ? 'Living Paper, pratonton kotak tempahan interaktif' : 'Living Paper interactive order box preview'}>
      <div className="lc-paper-scene" data-mode={mode} data-stage={stage}>
        <div className="lc-paper-copy">
          <span className="lc-paper-tag">{copy.tag}</span>
          <h2>{copy.title}</h2>
          <p>{copy.text}</p>
        </div>
        <div className="lc-paper-art" aria-hidden="true">
          <LivingPaperArtwork />
        </div>
        <div className="lc-paper-sprinkle" aria-hidden="true">✳</div>
        <span className="lc-paper-side" aria-hidden="true">FRESHLY CRAFTED · WAWASAN</span>
        {!confirmed && count > 0 && (
          <button
            className="lc-paper-action"
            type="button"
            aria-pressed={previewClosed}
            onClick={() => setPreviewClosed(open => !open)}
          >
            {previewClosed ? <PackageOpen size={18} aria-hidden="true" /> : <PackageCheck size={18} aria-hidden="true" />}
            <span>{bm ? (previewClosed ? 'Buka pratonton' : 'Tutup pratonton') : (previewClosed ? 'Open preview' : 'Close preview')}</span>
          </button>
        )}
        {!confirmed && count === 0 && (
          <a className="lc-paper-action" href="#wawasan-order-wizard">
            <ArrowDown size={18} aria-hidden="true" />{bm ? 'Mulakan tempahan' : 'Start booking'}
          </a>
        )}
        <div className="lc-paper-footer" aria-live="polite" aria-atomic="true">
          <span className="lc-paper-pips" aria-hidden="true"><i className="on"/><i className={step >= 2 ? 'on' : ''}/><i className={step >= 3 ? 'on' : ''}/></span>
          <span>{count} {bm ? 'pilihan hidangan' : 'food selections'}{isDemo ? ' · DEMO' : ''}</span>
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

function LivingPaperArtwork() {
  return (
<svg viewBox="0 0 340 360" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs><filter id="paper"><feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#3a230e" floodOpacity=".24"/></filter><filter id="foodshadow"><feDropShadow dx="1" dy="5" stdDeviation="3" floodColor="#42230c" floodOpacity=".3"/></filter><linearGradient id="kraft" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f8d49e"/><stop offset="1" stopColor="#c88948"/></linearGradient></defs><g transform="rotate(-7 180 190)"><g className="box-lid" filter="url(#paper)"><path d="M73 153 92 66 244 53 284 142 185 174Z" fill="#bb7b3d"/><path d="M91 66 244 53 271 83 110 98Z" fill="#f3c992"/><path d="M110 98 271 83 284 142 185 174 73 153Z" fill="#e4a86a"/><path d="M110 98 185 174" stroke="#a96936" strokeWidth="2" opacity=".6"/></g><g filter="url(#paper)"><path d="M49 174 173 216 299 164 284 273 175 323 63 279Z" fill="#b57940"/><path d="M49 174 173 216 175 323 63 279Z" fill="url(#kraft)"/><path d="M173 216 299 164 284 273 175 323Z" fill="#a96e3a"/><path d="M49 174 165 121 299 164 173 216Z" fill="#f2c58b"/></g><g className="food" filter="url(#foodshadow)"><path d="M80 164 Q123 106 189 139 Q234 121 269 167 Q239 208 172 209 Q112 203 80 164Z" fill="#367c3b"/><path d="M90 168 Q130 132 176 145 Q225 136 255 170 Q211 202 168 200 Q116 195 90 168Z" fill="#5e9e45"/><path d="M107 166 Q137 135 176 149 Q215 145 230 171 Q202 197 165 194 Q124 193 107 166Z" fill="#fff4db"/><path d="M119 159 Q142 146 163 154M142 184 Q169 190 196 179M168 159 Q183 154 203 161" fill="none" stroke="#e5d8b9" strokeWidth="4" strokeLinecap="round"/><path d="M185 164 Q203 135 230 150 Q246 165 231 183 Q212 195 188 180Z" fill="#ad341f"/><path d="M191 164 Q208 148 223 157" fill="none" stroke="#e15c36" strokeWidth="7" strokeLinecap="round"/><ellipse cx="136" cy="177" rx="22" ry="15" fill="#fffdf0"/><ellipse cx="136" cy="177" rx="10" ry="10" fill="#eeb52c"/><path d="M88 161 Q66 143 83 124 Q99 110 120 132 Q132 153 111 166Z" fill="#bc762f"/><path d="M88 148 Q94 131 106 136" fill="none" stroke="#efb65c" strokeWidth="7" strokeLinecap="round"/><path d="M238 168 Q259 146 270 166 Q280 186 251 195Z" fill="#8db45d"/></g><path d="M49 174 30 142 150 183 173 216Z" fill="#f4cc96" filter="url(#paper)"/><path d="M173 216 198 181 317 134 299 164Z" fill="#e6ad70" filter="url(#paper)"/><g className="seal"><path d="M84 225 168 251 166 279 84 254Z" fill="#fff5df"/><text x="100" y="250" fontFamily="Arial,sans-serif" fontSize="14" fontWeight="900" fill="#268a38" transform="rotate(15 100 250)">WAWASAN ✓</text></g></g><g filter="url(#foodshadow)"><path d="M252 55 Q283 16 300 34 Q319 60 282 89 Q267 72 252 55Z" fill="#268a38"/><path d="M269 67 300 34" stroke="#9bcf74" strokeWidth="3"/><path d="M40 115 Q22 75 52 63 Q79 58 81 100Z" fill="#4c9e49"/><path d="M40 115 53 67" stroke="#b0d77c" strokeWidth="3"/></g><g className="closed-top" transform="rotate(-7 180 190)" filter="url(#paper)">
    <path d="M49 174 165 121 299 164 173 216Z" fill="#F0C58C"/>
    <path d="M49 174 173 216 299 164" fill="none" stroke="#C99258" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M164 121 173 216" stroke="#D8A26B" strokeWidth="2" opacity=".9"/>
    <path d="M125 140 240 179 225 191 113 153Z" fill="#D9A66F" opacity=".82"/>
    <path d="M139 150 193 168 183 192 127 175Z" fill="#FFF6E4" stroke="#B87F44" strokeWidth="1"/>
    <text x="148" y="173" fill="#268A38" transform="rotate(17 148 173)" fontSize="14" fontWeight="900" fontFamily="Arial, sans-serif">W ✓</text>
    </g></svg>
  );
}
