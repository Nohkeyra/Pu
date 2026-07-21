# Build Configuration

## Local Development Build

### Prerequisites
- Node.js 20+
- JDK 17+
- Android SDK API 35
- Android Build Tools 35

### Quick Build

```bash
./scripts/build-apk.sh
```

Or manually:

```bash
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## CI/CD Builds (GitHub Actions)

### Automatic Builds
- **Debug APK**: Builds on every push to `main` or `develop`
- **Release APK**: Builds on git tag `v*.*.*`
- **Lint Check**: Runs on every push and PR

### Artifacts
- Available in Actions → workflow run → Artifacts
- Debug APK: 30 days retention
- Release APK/AAB: 90 days retention

### Releases
- Download from Releases page
- Created automatically on version tags
- Includes signed APK and AAB

## Build Outputs

### Debug Build
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release Build
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
android/app/build/outputs/bundle/release/app-release.aab
```

## Environment Variables

GitHub Secrets needed for signing:
- `RELEASE_KEYSTORE_BASE64` - Base64 encoded keystore
- `RELEASE_KEYSTORE_PASSWORD` - Keystore password
- `RELEASE_KEY_ALIAS` - Key alias name
- `RELEASE_KEY_PASSWORD` - Key password

## Troubleshooting

See `CI_CD_SETUP.md` for detailed troubleshooting guide.
