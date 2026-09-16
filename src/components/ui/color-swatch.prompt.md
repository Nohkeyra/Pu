# ColorSwatch Component

Circular color swatch button with active ring indicator for palette customizers.

## When to Use

Use `ColorSwatch` inside settings, theme customizers, or branding panels to let users select predefined color palettes.

## Example

```tsx
import { ColorSwatch } from '@/components/ui/color-swatch';

export function ColorPickerExample({ activeHex, onChange }: { activeHex: string; onChange: (hex: string) => void }) {
  const presets = ['#A3310E', '#C2932D', '#0C453C'];

  return (
    <div className="flex items-center gap-2">
      {presets.map((hex) => (
        <ColorSwatch
          key={hex}
          value={hex}
          selected={activeHex.toLowerCase() === hex.toLowerCase()}
          onSelect={onChange}
        />
      ))}
    </div>
  );
}
```
