# Chip Component

Compact interactive token for quick input presets, tags, filters, and micro-actions.

## When to Use

Use `Chip` when displaying small selectable tags, category filters, or preset text insertions (e.g. quick notes) where full action buttons would overwhelm the layout.

## Example

```tsx
import { Chip } from '@/components/ui/chip';

export function NotePresetExample({ onInsert }: { onInsert: (text: string) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Chip variant="preset" size="xs" onClick={() => onInsert('Tanpa Pedas')}>
        +Tanpa Pedas
      </Chip>
      <Chip variant="preset" size="xs" onClick={() => onInsert('Bungkus Asing')}>
        +Bungkus Asing
      </Chip>
    </div>
  );
}
```
