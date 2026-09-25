// Categorical palette in fixed slot order (see dataviz palette reference).
// Never cycle/re-sort per chart - identity is tied to slot order, not rank.
export const CATEGORICAL_LIGHT = [
  '#2a78d6', // 1 blue
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 yellow
  '#e87ba4', // 5 magenta
  '#008300', // 6 green
  '#4a3aa7', // 7 violet
  '#e34948', // 8 red
];

export const CATEGORICAL_DARK = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
];

export const STATUS = {
  good: { light: '#0ca30c', dark: '#0ca30c' },
  warning: { light: '#fab219', dark: '#fab219' },
  serious: { light: '#ec835a', dark: '#ec835a' },
  critical: { light: '#d03b3b', dark: '#d03b3b' },
};

const STATUS_WORD_MAP: Record<string, keyof typeof STATUS> = {
  'on track': 'good',
  done: 'good',
  met: 'good',
  closed: 'good',
  yes: 'good',
  low: 'good',
  'fully allocated': 'good',
  'at risk': 'warning',
  medium: 'warning',
  pending: 'warning',
  'within sla': 'warning',
  'not done': 'serious',
  high: 'serious',
  delayed: 'critical',
  breached: 'critical',
  critical: 'critical',
  no: 'critical',
  open: 'warning',
};

export function isDarkMode(): boolean {
  return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function categoricalPalette(): string[] {
  return isDarkMode() ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
}

export function statusColorFor(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  const role = STATUS_WORD_MAP[key];
  if (!role) return null;
  return isDarkMode() ? STATUS[role].dark : STATUS[role].light;
}

export function statusRoleFor(value: string | null | undefined): keyof typeof STATUS | null {
  if (!value) return null;
  return STATUS_WORD_MAP[value.trim().toLowerCase()] ?? null;
}
