import { describe, it, expect, vi, beforeEach } from 'vitest';

// We can't easily test the real export functions without DOM,
// but we can test the utility logic

describe('export utils structure', () => {
  it('export module has expected exports', async () => {
    const mod = await import('../src/utils/export');
    expect(mod.exportAsPng).toBeDefined();
    expect(mod.exportAsSvg).toBeDefined();
    expect(mod.copyToClipboard).toBeDefined();
    expect(mod.copySvgToClipboard).toBeDefined();
    expect(mod.downloadBlob).toBeDefined();
    expect(mod.extractLatexFromPreview).toBeDefined();
  });
});

describe('extractLatexFromPreview', () => {
  it('returns data-latex attribute from element', async () => {
    const { extractLatexFromPreview } = await import('../src/utils/export');
    const div = document.createElement('div');
    div.setAttribute('data-latex', '\\frac{x}{y}');
    expect(extractLatexFromPreview(div)).toBe('\\frac{x}{y}');
  });

  it('returns empty string when no data-latex attribute', async () => {
    const { extractLatexFromPreview } = await import('../src/utils/export');
    const div = document.createElement('div');
    expect(extractLatexFromPreview(div)).toBe('');
  });
});
