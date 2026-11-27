import { CheckCircle2, HelpCircle } from 'lucide-react';
import {
  findPetronasCandidateMatches,
  resolveVerifiedPetronasCode,
} from '@/lib/petronasAutofill';

interface PetronasCompanyFieldNoticeProps {
  companyValue: string;
  companyCode?: string;
  language: string;
  onSelectCanonical: (canonicalName: string, code: string) => void;
}

export function PetronasCompanyFieldNotice({
  companyValue,
  companyCode,
  language,
  onSelectCanonical,
}: PetronasCompanyFieldNoticeProps) {
  const trimmed = String(companyValue || '').trim();
  if (!trimmed || trimmed === 'other') return null;

  const isBm = language === 'bm';
  const verified = resolveVerifiedPetronasCode(trimmed);

  if (verified.isPetronas && verified.entity) {
    const displayedCode =
      companyCode && companyCode === verified.companyCode ? companyCode : verified.companyCode;
    return (
      <div
        className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2"
        data-testid="petronas-code-verified"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="font-bold">
            {isBm ? 'Kod Syarikat PETRONAS:' : 'PETRONAS Company Code:'}{' '}
            <span className="font-mono">{displayedCode}</span>
          </div>
          <div className="text-[11px] opacity-85 truncate">{verified.entity.name}</div>
        </div>
      </div>
    );
  }

  const candidates = findPetronasCandidateMatches(trimmed, 4);
  if (candidates.length > 0) {
    return (
      <div
        className="mt-2 rounded-xl border border-amber-500/35 bg-amber-50/85 dark:bg-amber-950/30 px-3 py-2.5 text-xs text-amber-950 dark:text-amber-200 space-y-2"
        data-testid="petronas-code-candidates"
      >
        <div className="flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold">
              {isBm
                ? 'Padanan entiti PETRONAS ditemui — sila sahkan'
                : 'Possible PETRONAS entity match — confirmation required'}
            </div>
            <p className="text-[11px] opacity-90">
              {isBm
                ? 'Tiada kod ditetapkan secara automatik. Pilih entiti rasmi di bawah atau teruskan tanpa kod PETRONAS.'
                : 'No code is auto-assigned. Confirm a canonical legal entity below or continue as a non-PETRONAS entry.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {candidates.map((candidate) => (
            <button
              key={candidate.code}
              type="button"
              onClick={() => onSelectCanonical(candidate.name, candidate.code)}
              className="text-left rounded-lg border border-amber-500/40 bg-white dark:bg-stone-900 px-2.5 py-1.5 text-[11px] font-semibold text-stone-900 dark:text-stone-100 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 transition-colors"
            >
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300 mr-1.5">
                {candidate.code}
              </span>
              <span>{candidate.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
      {isBm
        ? 'Pelanggan bukan PETRONAS / tersuai (Kod Syarikat: -).'
        : 'Non-PETRONAS / custom client (Company Code: -).'}
    </p>
  );
}
