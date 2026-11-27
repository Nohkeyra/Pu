import {
  PETRONAS_COMPANIES,
  buildPetronasInvoiceSubject,
  getCompanyCode,
  resolvePetronasCompany,
  type PetronasCompany,
} from '../constants/petronasCompanyCodes.js';

export {
  PETRONAS_COMPANIES,
  buildPetronasInvoiceSubject,
  getCompanyCode,
  resolvePetronasCompany,
  type PetronasCompany,
};

const GENERIC_CORPORATE_TOKENS = new Set([
  'SDN',
  'BHD',
  'BERHAD',
  'SENDIRIAN',
  'HOLDING',
  'HOLDINGS',
  'CORPORATION',
  'CORP',
  'COMPANY',
  'CO',
  'LTD',
  'LIMITED',
  'GROUP',
  'MALAYSIA',
  'M',
  'AND',
  'OF',
  'IN',
  'THE',
  'SERVICES',
  'SERVICE',
  'MANAGEMENT',
  'PROPERTIES',
  'PROPERTY',
  'SOLUTIONS',
  'VENTURES',
  'RESOURCES',
  'TECHNICAL',
  'TRADING',
  'SYSTEM',
  'INTERNATIONAL',
  'FUND',
]);

function extractCompanyTitle(raw: string): string {
  return String(raw || '').split(/[,\n]/, 1)[0]?.trim() || '';
}

function tokenizeNormalized(value: string): string[] {
  return extractCompanyTitle(value)
    .normalize('NFKC')
    .toUpperCase()
    .replace(/\bSENDIRIAN BERHAD\b/g, 'SDN BHD')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      curr[j + 1] = Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen <= 2) return 0;
  const dist = levenshtein(a, b);
  const sim = 1 - dist / maxLen;
  return sim >= 0.7 ? sim : 0;
}

/**
 * Returns candidate canonical PETRONAS entities ONLY when an exact legal name
 * match does not exist. Designed so non-PETRONAS clients (e.g. Putrajaya Holdings)
 * return an empty list and never accidentally suggest unrelated codes (e.g. 0030),
 * while near/ambiguous inputs (e.g. "Gas District Cooling (Putrajaya) Sdn Bhd",
 * "KLCC Projects Services Sdn Bhd") surface canonical options for explicit confirmation.
 */
export function findPetronasCandidateMatches(company: string, limit = 5): PetronasCompany[] {
  const title = extractCompanyTitle(company);
  if (!title || resolvePetronasCompany(title)) return [];

  if (/^\d{4}$/.test(title)) {
    const byCode = PETRONAS_COMPANIES.filter((entity) => entity.code === title);
    if (byCode.length > 0) return byCode.slice(0, limit);
  }

  const rawTokens = tokenizeNormalized(title);
  const distinctiveTokens = rawTokens.filter((token) => !GENERIC_CORPORATE_TOKENS.has(token));
  if (distinctiveTokens.length === 0) return [];

  const scored: Array<{ entity: PetronasCompany; score: number }> = [];

  for (const entity of PETRONAS_COMPANIES) {
    const entityTokens = tokenizeNormalized(entity.name);
    const entityDistinctive = entityTokens.filter((token) => !GENERIC_CORPORATE_TOKENS.has(token));
    if (entityDistinctive.length === 0) continue;

    let distinctiveScore = 0;
    let distinctiveHits = 0;
    for (const qTok of distinctiveTokens) {
      let best = 0;
      for (const eTok of entityDistinctive) {
        best = Math.max(best, tokenSimilarity(qTok, eTok));
      }
      if (best > 0) {
        distinctiveHits++;
        distinctiveScore += best;
      }
    }

    if (distinctiveHits === 0) continue;
    const minRequiredHits = distinctiveTokens.length >= 2 && entityDistinctive.length >= 2 ? 2 : 1;
    // Allow single distinctive hit if all distinctive query tokens hit or query is KLCC/PETRONAS multi-word partial
    const coverage = distinctiveScore / Math.max(distinctiveTokens.length, entityDistinctive.length);
    if (distinctiveHits < minRequiredHits && coverage < 0.35) continue;

    let allTokenScore = 0;
    for (const qTok of rawTokens) {
      let best = 0;
      for (const eTok of entityTokens) {
        best = Math.max(best, tokenSimilarity(qTok, eTok));
      }
      allTokenScore += best;
    }

    const totalScore = distinctiveScore * 2 + allTokenScore / Math.max(rawTokens.length, 1);
    if (totalScore >= 1.5) {
      scored.push({ entity, score: totalScore });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.entity.code.localeCompare(b.entity.code));
  return scored.slice(0, limit).map((item) => item.entity);
}

/**
 * Replaces the company portion of an address-suffixed company string
 * (e.g. "KLCC Projects Services Sdn Bhd, Level 32..." -> "KLCC PROJEKS SERVICES SDN. BHD., Level 32...")
 * while keeping any trailing address intact.
 */
export function applyCanonicalCompanyName(currentValue: string, canonicalName: string): string {
  const trimmed = String(currentValue || '').trim();
  const commaIdx = trimmed.indexOf(',');
  if (commaIdx === -1) return canonicalName;
  const suffix = trimmed.slice(commaIdx).trim();
  return suffix ? `${canonicalName}${suffix.startsWith(',') ? suffix : `, ${suffix}`}` : canonicalName;
}

/**
 * Server/client authoritative validation: derives companyCode strictly from legal entity identity.
 */
export function resolveVerifiedPetronasCode(
  company: string,
  registrationNumber?: string
): { companyCode: string; entity?: PetronasCompany; isPetronas: boolean } {
  const entity = resolvePetronasCompany(company, registrationNumber);
  return {
    companyCode: entity?.code ?? '',
    entity,
    isPetronas: Boolean(entity),
  };
}

/**
 * Validates whether a stored order satisfies PETRONAS company identity + 4-digit code integrity.
 */
export function getVerifiedOrderCompanyCode(order: {
  to?: string;
  company?: string;
  companyCode?: string;
}): string {
  const name = order.to || order.company || '';
  const resolved = resolvePetronasCompany(name);
  if (!resolved) return '';
  // The exact legal entity is authoritative. Never trust an imported or stale code.
  // An unrecognized/ambiguous name is rejected above even when a code is stored.
  return resolved.code;
}
