# CI/CD Setup - Quick Start Guide

This repository has been set up with complete GitHub Actions CI/CD pipelines for automated APK builds.

## ✅ What's Been Set Up

### Workflows Created
1. ✅ **build-apk.yml** - Automatic debug & release APK builds
2. ✅ **lint.yml** - ESLint & TypeScript type checking
3. ✅ **release.yml** - Signed release APK for production

### Documentation Added
- ✅ `CI_CD_SETUP.md` - Complete setup & configuration guide
- ✅ `BUILD.md` - Build reference guide
- ✅ `scripts/build-apk.sh` - Local build automation script

---

## 🚀 Quick Start (Next Steps)

### 1. Merge This Branch
```bash
# Create a Pull Request and merge to main
git push origin ci/setup-github-actions
```

### 2. Test the Build Workflow (Optional)
Push to develop branch to trigger the build workflow:
```bash
git checkout develop
git pull origin develop
git merge ci/setup-github-actions
git push origin develop
```

Go to **Actions** tab to watch the build.

### 3. Set Up Release Signing (Recommended)

Generate keystore:
```bash
keytool -genkey -v -keystore release.keystore \
  -alias release-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Add to GitHub Secrets:
1. Go to Settings → Secrets and variables → Actions
2. Create these 4 secrets:
   - `RELEASE_KEYSTORE_BASE64` (base64 encoded keystore)
   - `RELEASE_KEYSTORE_PASSWORD`
   - `RELEASE_KEY_ALIAS` (e.g., "release-key")
   - `RELEASE_KEY_PASSWORD`

### 4. Create Your First Release
```bash
git tag v1.0.0
git push origin v1.0.0
```

This automatically builds and signs the APK!

---

## 📱 Build Triggers

| Event | Action |
|-------|--------|
| Push to `main` or `develop` | Builds debug & release APKs |
| Pull Request to `main` or `develop` | Runs linting & builds APK |
| Git tag `v*.*.*` | Builds & signs release APK |
| Manual workflow dispatch | Allows manual triggering |

---

## 🎯 File Structure

```
.github/workflows/
├── build-apk.yml      # Main build workflow
├── lint.yml           # Code quality checks
└── release.yml        # Release builds

scripts/
└── build-apk.sh       # Local build script

Documentation/
├── CI_CD_SETUP.md     # Complete setup guide
└── BUILD.md           # Build reference
```

---

## 📦 Artifact Outputs

### Debug APK
- **Location**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Retention**: 30 days
- **Use**: Testing on devices/emulators

### Release APK (Unsigned)
- **Location**: `android/app/build/outputs/apk/release/app-release-unsigned.apk`
- **Retention**: 30 days
- **Use**: Manual signing or distribution

### Release Bundle (AAB)
- **Location**: `android/app/build/outputs/bundle/release/app-release.aab`
- **Retention**: 30 days
- **Use**: Google Play Store submission

### Release APK (Signed)
- **Available**: After setting up signing secrets
- **Retention**: 90 days
- **Use**: Direct distribution

---

## 🔗 Useful Links

- **Actions Dashboard**: https://github.com/Nohkeyra/Restoran-Wawasan-Bio/actions
- **Releases**: https://github.com/Nohkeyra/Restoran-Wawasan-Bio/releases
- **Workflows**: https://github.com/Nohkeyra/Restoran-Wawasan-Bio/tree/main/.github/workflows

---

## 📖 Documentation References

- `CI_CD_SETUP.md` - Detailed setup, signing, and troubleshooting
- `BUILD.md` - Build configuration and outputs
- `.github/workflows/` - Workflow configuration files

---

## ✨ Features

- ✅ Automatic APK builds on every push
- ✅ Automatic code quality checks (ESLint + TypeScript)
- ✅ Release builds with optional auto-signing
- ✅ GitHub Releases with downloadable APKs
- ✅ PR comments with artifact links
- ✅ Local build script for manual builds
- ✅ Firebase config automatically included
- ✅ Full Capacitor integration

---

## 🎉 You're All Set!

Your project is now ready for:
- **Continuous Integration** - Automatic testing and linting
- **Continuous Deployment** - Automated APK builds
- **Release Management** - Signed APKs via git tags

For detailed information, see `CI_CD_SETUP.md`

---

**Branch**: `ci/setup-github-actions`  
**Status**: Ready to merge ✅
