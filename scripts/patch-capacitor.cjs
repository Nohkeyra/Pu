#!/usr/bin/env node

/**
 * Patch script to fix capacitor-updater enum switch case labels for Java 17 compatibility
 * Issue: Java 17 requires unqualified enum constant names in switch cases
 */

const fs = require('fs');
const path = require('path');

const UPDATER_FILE = path.join(
  __dirname,
  '..',
  'node_modules/@capgo/capacitor-updater/android/src/main/java/ee/forgr/capacitor_updater/DelayUpdateUtils.java'
);

function patchCapacitorUpdater() {
  if (!fs.existsSync(UPDATER_FILE)) {
    console.warn('⚠️  capacitor-updater not found, skipping patch');
    return;
  }

  try {
    let content = fs.readFileSync(UPDATER_FILE, 'utf8');
    const originalContent = content;

    // Replace fully qualified enum names with unqualified names
    content = content.replace(/case DelayUntilNext\.background:/g, 'case background:');
    content = content.replace(/case DelayUntilNext\.kill:/g, 'case kill:');
    content = content.replace(/case DelayUntilNext\.date:/g, 'case date:');
    content = content.replace(/case DelayUntilNext\.nativeVersion:/g, 'case nativeVersion:');

    if (content !== originalContent) {
      fs.writeFileSync(UPDATER_FILE, content, 'utf8');
      console.log('✅ capacitor-updater patched successfully');
    } else {
      console.log('ℹ️  capacitor-updater already patched or not applicable');
    }
  } catch (error) {
    console.error('❌ Failed to patch capacitor-updater:', error.message);
    process.exit(1);
  }
}

// Run the patch
patchCapacitorUpdater();
