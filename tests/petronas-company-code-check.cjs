// Run against the compiled lookup module: node tests/petronas-company-code-check.cjs /path/to/compiled/petronasCompanyCodes.js
const assert = require('node:assert/strict');
const path = require('node:path');
const { PETRONAS_COMPANIES, getCompanyCode, buildPetronasInvoiceSubject } = require(path.resolve(process.argv[2]));
assert.equal(PETRONAS_COMPANIES.length, 135);
assert.equal(new Set(PETRONAS_COMPANIES.map(x => x.code)).size, 135);
for (const company of PETRONAS_COMPANIES) {
  assert.match(company.code, /^\d{4}$/);
  assert.equal(getCompanyCode(company.name), company.code);
}
assert.equal(getCompanyCode('PETRONAS Carigali Sdn Bhd'), '0003');
assert.equal(getCompanyCode('KLCC (Holdings) Sdn Bhd, Group Procurement, Level 34'), '0030');
assert.equal(getCompanyCode('Gas District Cooling (Putrajaya) Sdn Bhd'), '');
assert.equal(getCompanyCode('Putrajaya Holdings Sdn Bhd'), '');
assert.equal(getCompanyCode('KLCC Projects Services Sdn Bhd'), '');
assert.equal(getCompanyCode('PETRONAS Carigali Sdn Bhd', '198201008499'), '');
assert.equal(buildPetronasInvoiceSubject('0003', 'RW12345'), '0003 RW12345');
assert.equal(buildPetronasInvoiceSubject('3', 'RW12345'), undefined);
assert.equal(buildPetronasInvoiceSubject('0003', 'RW 12345'), undefined);
console.log('PASS: 135 unique codes, exact lookup, address handling, ambiguous clients, registration conflicts, subject format.');
