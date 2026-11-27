import { describe, it, expect } from 'vitest';
import {
  PETRONAS_COMPANIES,
  resolvePetronasCompany,
  getCompanyCode,
  buildPetronasInvoiceSubject,
  findPetronasCandidateMatches,
  applyCanonicalCompanyName,
  resolveVerifiedPetronasCode,
  getVerifiedOrderCompanyCode,
} from './petronasAutofill';

describe('petronasAutofill', () => {
  it('loads canonical PETRONAS entities with 4-digit codes', () => {
    expect(PETRONAS_COMPANIES.length).toBeGreaterThanOrEqual(135);
    for (const item of PETRONAS_COMPANIES) {
      expect(item.code).toMatch(/^\d{4}$/);
      expect(item.company.trim().length).toBeGreaterThan(0);
    }
  });

  it('resolves exact legal entity names strictly (case & whitespace normalized)', () => {
    const exact1 = resolvePetronasCompany('PETROLIAM NASIONAL BERHAD (PETRONAS)');
    expect(exact1.matchType).toBe('exact');
    expect(exact1.companyCode).toBe('0001');
    expect(exact1.canonicalCompany).toBe('PETROLIAM NASIONAL BERHAD (PETRONAS)');

    const exact2 = resolvePetronasCompany('  petronas   dagangan berhad  ');
    expect(exact2.matchType).toBe('exact');
    expect(exact2.companyCode).toBe('0002');

    expect(getCompanyCode('PETRONAS CARIGALI SDN. BHD.')).toBe('0003');
  });

  it('never auto-assigns ambiguous or partial names and returns explicit candidates', () => {
    const gdc = resolvePetronasCompany('Gas District Cooling (Putrajaya)');
    expect(gdc.matchType).toBe('none');
    expect(gdc.companyCode).toBe('');
    expect(gdc.canonicalCompany).toBeNull();

    const gdcCandidates = findPetronasCandidateMatches('Gas District Cooling (Putrajaya)');
    expect(gdcCandidates.length).toBeGreaterThan(0);
    expect(gdcCandidates.some((c) => c.company.includes('GAS DISTRICT COOLING'))).toBe(true);

    const klcc = resolvePetronasCompany('KLCC Projects Services');
    expect(klcc.companyCode).toBe('');
    const klccCandidates = findPetronasCandidateMatches('KLCC Projects Services');
    expect(klccCandidates.some((c) => c.code === '0518')).toBe(true);
  });

  it('matches typed 4-digit code as explicit candidate without auto-assigning', () => {
    expect(resolvePetronasCompany('0001').companyCode).toBe('');
    const candidates = findPetronasCandidateMatches('0001');
    expect(candidates.some((c) => c.code === '0001')).toBe(true);
  });

  it('returns no match and empty candidates for non-PETRONAS companies', () => {
    const nonPetronas = resolvePetronasCompany('Putrajaya Holdings Sdn Bhd');
    expect(nonPetronas.matchType).toBe('none');
    expect(nonPetronas.companyCode).toBe('');
    expect(findPetronasCandidateMatches('Putrajaya Holdings Sdn Bhd')).toEqual([]);
  });

  it('applies canonical company name & clears stale order codes on mismatches', () => {
    const applied = applyCanonicalCompanyName('KLCC PROJEKS SERVICES SDN. BHD.');
    expect(applied.companyName).toBe('KLCC PROJEKS SERVICES SDN. BHD.');
    expect(applied.companyCode).toBe('0518');

    expect(resolveVerifiedPetronasCode('PETROLIAM NASIONAL BERHAD (PETRONAS)').companyCode).toBe('0001');
    expect(resolveVerifiedPetronasCode('Putrajaya Holdings Sdn Bhd').companyCode).toBe('');

    expect(
      getVerifiedOrderCompanyCode({
        to: 'PETROLIAM NASIONAL BERHAD (PETRONAS)',
        companyCode: '9999',
      })
    ).toBe('0001');

    expect(
      getVerifiedOrderCompanyCode({
        to: 'Putrajaya Holdings Sdn Bhd',
        companyCode: '0001',
      })
    ).toBe('');
  });

  it('builds exact PETRONAS Email Collector subject', () => {
    expect(buildPetronasInvoiceSubject('0001', 'RW00001')).toBe('0001 RW00001');
  });
});
