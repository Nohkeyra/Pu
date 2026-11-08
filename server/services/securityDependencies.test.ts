import { expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const runtimeRequire = createRequire(import.meta.url);

it('round-trips Excel data-bar formatting through the patched UUID dependency', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Orders');
  sheet.addRow(['Order', 'Amount']);
  sheet.addRow(['Audit fixture', 150]);
  sheet.addConditionalFormatting({ ref: 'B2:B2', rules: [{ type: 'dataBar', priority: 1,
    minLength: 0, maxLength: 100, gradient: false, cfvo: [{ type: 'min' }, { type: 'max' }] }] });
  const buffer = await workbook.xlsx.writeBuffer();
  expect(buffer.byteLength).toBeGreaterThan(1000);
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(buffer);
  expect(restored.getWorksheet('Orders')?.getCell('B2').value).toBe(150);
});

it('preserves the CJS v4 API used by Google HTTP clients and native project tooling', () => {
  for (const consumer of ['exceljs', 'gaxios', 'xcode']) {
    const consumerRequire = createRequire(runtimeRequire.resolve(consumer));
    const uuid = consumerRequire('uuid');
    expect(uuid.validate(uuid.v4()), consumer).toBe(true);
  }
  const project = runtimeRequire('xcode').project('/tmp/unused-audit-fixture.pbxproj');
  project.hash = { project: { objects: {} } };
  expect(project.generateUuid()).toMatch(/^[A-F0-9]{24}$/);
});

it('preserves scoped glob cleanup for the Google SDK rimraf caller', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'wawasan-glob-check-'));
  try {
    await mkdir(path.join(directory, 'nested'));
    await writeFile(path.join(directory, 'nested', 'remove.tmp'), 'fixture');
    await writeFile(path.join(directory, 'nested', 'keep.txt'), 'fixture');
    const googleRequire = createRequire(runtimeRequire.resolve('googleapis-common'));
    const { rimraf } = googleRequire('rimraf');
    await rimraf(path.join(directory, '**', '*.tmp'), { glob: true });
    expect(await readdir(path.join(directory, 'nested'))).toEqual(['keep.txt']);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
