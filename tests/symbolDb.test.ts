import { describe, it, expect } from 'vitest';
import { SYMBOL_CATEGORIES, getAllSymbols, searchSymbols, getCategoryById } from '../src/utils/symbolDb';

describe('SYMBOL_CATEGORIES', () => {
  it('has multiple categories', () => {
    expect(SYMBOL_CATEGORIES.length).toBeGreaterThanOrEqual(8);
  });

  it('each category has an id, label, and symbols', () => {
    for (const cat of SYMBOL_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.symbols.length).toBeGreaterThan(0);
    }
  });

  it('each symbol has latex and label', () => {
    for (const cat of SYMBOL_CATEGORIES) {
      for (const sym of cat.symbols) {
        expect(sym.latex).toBeTruthy();
        expect(sym.label).toBeTruthy();
      }
    }
  });
});

describe('getAllSymbols', () => {
  it('returns all symbols from all categories', () => {
    const all = getAllSymbols();
    const total = SYMBOL_CATEGORIES.reduce((sum, cat) => sum + cat.symbols.length, 0);
    expect(all.length).toBe(total);
  });
});

describe('searchSymbols', () => {
  it('returns matching symbols by label', () => {
    const results = searchSymbols('α');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(s => s.label === 'α')).toBe(true);
  });

  it('returns matching symbols by latex command', () => {
    const results = searchSymbols('alpha');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(s => s.latex.includes('alpha'))).toBe(true);
  });

  it('returns empty for no matches', () => {
    expect(searchSymbols('zzz_nonexistent_zzz').length).toBe(0);
  });

  it('returns all symbols for empty query', () => {
    const all = getAllSymbols();
    const results = searchSymbols('');
    expect(results.length).toBe(all.length);
  });

  it('is case insensitive', () => {
    const upper = searchSymbols('ALPHA');
    const lower = searchSymbols('alpha');
    expect(upper.length).toBe(lower.length);
  });
});

describe('getCategoryById', () => {
  it('returns category for valid id', () => {
    const cat = getCategoryById('greek');
    expect(cat).toBeDefined();
    expect(cat?.id).toBe('greek');
  });

  it('returns undefined for invalid id', () => {
    expect(getCategoryById('nonexistent')).toBeUndefined();
  });
});
