#!/bin/bash
# Generate Android Launcher Icons from the custom 1024x1024 JPEG icon
# Path: scripts/generate-icons.sh

set -e

SRC_ICON="./public/assets/wawasan_logo.jpg"

if [ ! -f "$SRC_ICON" ]; then
    echo "❌ Source icon not found at $SRC_ICON"
    exit 1
fi

echo "🎨 Generating launcher icons from $SRC_ICON..."

# Define target directories and sizes
# format: "dir_suffix:legacy_size:adaptive_foreground_size"
SIZES=(
    "mdpi:48:108"
    "hdpi:72:162"
    "xhdpi:96:216"
    "xxhdpi:144:324"
    "xxxhdpi:192:432"
)

for entry in "${SIZES[@]}"; do
    IFS=":" read -r suffix size fore_size <<< "$entry"
    dir="android/app/src/main/res/mipmap-$suffix"
    
    echo "  -> Processing $dir..."
    mkdir -p "$dir"
    
    # 1. Legacy Square Icon (ic_launcher.png)
    convert "$SRC_ICON" -resize "${size}x${size}" "$dir/ic_launcher.png"
    
    # 2. Legacy Round Icon (ic_launcher_round.png)
    # We can create a circular clip using convert
    convert "$SRC_ICON" -resize "${size}x${size}" \
        \( +clone -threshold -1 -draw "circle $((size/2)),$((size/2)) $((size/2)),0" \) \
        -alpha off -compose CopyOpacity -composite "$dir/ic_launcher_round.png"
        
    # 3. Adaptive Foreground Icon (ic_launcher_foreground.png)
    # For adaptive icons, the foreground must fit within the center 66% (safe zone).
    # We scale the 1024x1024 image down to 72% of the fore_size, and pad it with transparency to fore_size.
    inner_size=$((fore_size * 72 / 100))
    convert "$SRC_ICON" -resize "${inner_size}x${inner_size}" \
        -background none -gravity center -extent "${fore_size}x${fore_size}" \
        "$dir/ic_launcher_foreground.png"
done

echo "⚙️ Updating adaptive background to black (#000000) for seamless look..."
BG_VAL_FILE="android/app/src/main/res/values/ic_launcher_background.xml"
if [ -f "$BG_VAL_FILE" ]; then
    cat << 'EOF' > "$BG_VAL_FILE"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#000000</color>
</resources>
EOF
fi

# Also update the drawable version if it exists
BG_DRAWABLE_FILE="android/app/src/main/res/drawable/ic_launcher_background.xml"
if [ -f "$BG_DRAWABLE_FILE" ]; then
    cat << 'EOF' > "$BG_DRAWABLE_FILE"
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#000000"
        android:pathData="M0,0h108v108h-108z"/>
</vector>
EOF
fi

echo "✅ All Android launcher icons generated successfully!"
