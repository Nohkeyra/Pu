#!/bin/bash

# Quick APK Build Script
# This script automates the local APK build process

set -euo pipefail

echo "🚀 Starting APK build process..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 22+"
    exit 1
fi

NODE_MAJOR=$(node -p 'Number(process.versions.node.split(".")[0])')
if [ "$NODE_MAJOR" -lt 22 ]; then
    echo "❌ Capacitor 8 requires Node.js 22+"
    exit 1
fi

# Check if Java 21+ is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install JDK 21+"
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | grep -oP '(?<=version ")[^"]*' | head -1)
JAVA_MAJOR=${JAVA_VERSION%%.*}
if [ "$JAVA_MAJOR" -lt 21 ]; then
    echo "❌ Capacitor 8 requires JDK 21+ (found $JAVA_VERSION)"
    exit 1
fi
echo "✅ Java version: $JAVA_VERSION"

echo ""
echo "📦 Installing dependencies..."
npm ci

echo ""
echo "🔨 Building web assets..."
npm run build

echo ""
echo "⚙️  Syncing Capacitor..."
npx cap sync android

echo ""
echo "🏗️  Building Debug APK..."
cd android
chmod +x gradlew
./gradlew assembleDebug

echo ""
echo "✅ Debug APK build complete!"
echo "📁 APK location: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "📱 To install on device:"
echo "   adb install android/app/build/outputs/apk/debug/app-debug.apk"
