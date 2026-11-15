import type { KeyboardEvent } from 'react';

/** Keyboard behavior for the existing button-based radio cards. */
export function handleRadioGroupKeyDown(event: KeyboardEvent<HTMLElement>) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  const group = event.currentTarget;
  const radios = Array.from(group.querySelectorAll<HTMLButtonElement>('button[role="radio"]:not(:disabled)'))
    .filter(radio => radio.closest('[role="radiogroup"]') === group);
  const index = radios.findIndex(radio => radio === event.target || radio.contains(event.target as Node));
  if (index < 0 || !radios.length) return;
  const previous = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? radios.length - 1
    : (index + (previous ? -1 : 1) + radios.length) % radios.length;
  event.preventDefault();
  radios[next].focus();
  radios[next].click();
}
