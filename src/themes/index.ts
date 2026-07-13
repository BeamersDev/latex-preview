import type { Theme } from '@/types';

export const THEMES: Theme[] = [
  { name: 'dracula', label: 'Dracula', type: 'dark' },
  { name: 'adwaita', label: 'Adwaita', type: 'light' },
  { name: 'breeze', label: 'Breeze', type: 'light' },
  { name: 'github-dark', label: 'GitHub Dark', type: 'dark' },
  { name: 'github-light', label: 'GitHub Light', type: 'light' },
  { name: 'monokai', label: 'Monokai', type: 'dark' },
  { name: 'nord', label: 'Nord', type: 'dark' },
  { name: 'solarized-light', label: 'Solarized Light', type: 'light' },
];

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function getDefaultTheme(): string {
  const systemType = getSystemTheme();
  const match = THEMES.find((t) => t.type === systemType);
  return match?.name ?? 'adwaita';
}
