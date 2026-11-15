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

const BIOMETRIC_GRADLE_FILE = path.join(
  __dirname,
  '..',
  'node_modules/capacitor-native-biometric/android/build.gradle'
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

function patchNativeBiometricGradle() {
  if (!fs.existsSync(BIOMETRIC_GRADLE_FILE)) {
    console.warn('⚠️  capacitor-native-biometric build.gradle not found, skipping patch');
    return;
  }

  try {
    let content = fs.readFileSync(BIOMETRIC_GRADLE_FILE, 'utf8');
    const originalContent = content;

    // jcenter() is deprecated and removed in Gradle 9.0.
    content = content.replace(
      /(buildscript\s*\{[\s\S]*?repositories\s*\{[\s\S]*?)\bjcenter\(\)/,
      '$1mavenCentral()'
    );
    content = content.replace(/^[ \t]*jcenter\(\)\r?\n/gm, '');

    // Keep AGP DSL compatible with AGP 8/9.
    content = content.replace(
      /getDefaultProguardFile\('proguard-android\.txt'\)/g,
      "getDefaultProguardFile('proguard-android-optimize.txt')"
    );
    content = content.replace(/\blintOptions\s*\{/g, 'lint {');

    if (content !== originalContent) {
      fs.writeFileSync(BIOMETRIC_GRADLE_FILE, content, 'utf8');
      console.log('✅ capacitor-native-biometric Gradle config patched successfully');
    } else {
      console.log('ℹ️  capacitor-native-biometric Gradle config already patched or not applicable');
    }
  } catch (error) {
    console.error('❌ Failed to patch capacitor-native-biometric Gradle config:', error.message);
    process.exit(1);
  }
}

// Run the patches
patchCapacitorUpdater();
patchNativeBiometricGradle();
