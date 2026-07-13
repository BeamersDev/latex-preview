import { describe, it, expect } from 'vitest';
import { THEMES, getSystemTheme, getDefaultTheme } from '../src/themes/index';

describe('THEMES', () => {
  it('has at least 5 themes', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(5);
  });

  it('has both light and dark themes', () => {
    const lights = THEMES.filter(t => t.type === 'light');
    const darks = THEMES.filter(t => t.type === 'dark');
    expect(lights.length).toBeGreaterThan(0);
    expect(darks.length).toBeGreaterThan(0);
  });

  it('each theme has name and label', () => {
    for (const theme of THEMES) {
      expect(theme.name).toBeTruthy();
      expect(theme.label).toBeTruthy();
    }
  });

  it('has the 6 required themes', () => {
    const names = THEMES.map(t => t.name);
    expect(names).toContain('dracula');
    expect(names).toContain('adwaita');
    expect(names).toContain('breeze');
    expect(names).toContain('github-dark');
    expect(names).toContain('github-light');
    expect(names).toContain('monokai');
  });
});

describe('getSystemTheme', () => {
  it('returns light or dark', () => {
    const theme = getSystemTheme();
    expect(['light', 'dark']).toContain(theme);
  });
});

describe('getDefaultTheme', () => {
  it('returns a valid theme name', () => {
    const name = getDefaultTheme();
    expect(THEMES.some(t => t.name === name)).toBe(true);
  });
});
