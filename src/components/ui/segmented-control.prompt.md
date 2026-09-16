# SegmentedControl Component

Pill-shaped toggle container for switching mutually exclusive options, view modes, and sub-tabs.

## When to Use

Use `SegmentedControl` when switching between 2 to 4 closely coupled modes, tabs, or mutually exclusive state selections (such as language selection, theme switcher, or diagnostic tabs).

## Example

```tsx
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control';

export function LanguageSwitcher({ lang, setLang }: { lang: 'en' | 'bm'; setLang: (l: 'en' | 'bm') => void }) {
  return (
    <SegmentedControl value={lang} onValueChange={(val) => setLang(val as 'en' | 'bm')}>
      <SegmentedControlItem value="en">English</SegmentedControlItem>
      <SegmentedControlItem value="bm">Melayu</SegmentedControlItem>
    </SegmentedControl>
  );
}
```
