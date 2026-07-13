import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ClipboardItem for jsdom
class MockClipboardItem {
  constructor(
    public items: Record<string, Blob>,
  ) {}
  get types() {
    return Object.keys(this.items);
  }
}

// @ts-ignore
globalThis.ClipboardItem = MockClipboardItem;

const mockClipboardWrite = vi.fn();
const mockClipboardWriteText = vi.fn();

beforeEach(() => {
  mockClipboardWrite.mockReset();
  mockClipboardWriteText.mockReset();
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      write: mockClipboardWrite.mockResolvedValue(undefined),
      writeText: mockClipboardWriteText.mockResolvedValue(undefined),
    },
    writable: true,
    configurable: true,
  });
});

import {
  extractSvgString,
  extractLatexFromPreview,
  copyToClipboard,
  copySvgToClipboard,
} from '../src/utils/export';

describe('extractSvgString', () => {
  function createSvgElement(): HTMLElement {
    const container = document.createElement('div');
    container.innerHTML = `
      <svg width="100" height="50">
        <rect x="10" y="10" width="80" height="30" fill="blue"/>
      </svg>
    `;
    return container;
  }

  it('extracts SVG string from element', () => {
    const el = createSvgElement();
    const result = extractSvgString(el);
    expect(result).not.toBeNull();
    expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(result).toContain('<rect');
  });

  it('returns null when no SVG element found', () => {
    const el = document.createElement('div');
    el.textContent = 'no svg here';
    const result = extractSvgString(el);
    expect(result).toBeNull();
  });

  it('includes width and height attributes', () => {
    const el = createSvgElement();
    const result = extractSvgString(el);
    expect(result).toContain('width="100"');
    expect(result).toContain('height="50"');
  });

  it('returns null when querySelector throws', () => {
    const el = document.createElement('div');
    const orig = el.querySelector.bind(el);
    el.querySelector = (() => { throw new Error('mock error'); }) as any;
    const result = extractSvgString(el);
    expect(result).toBeNull();
    el.querySelector = orig;
  });
});

describe('extractLatexFromPreview', () => {
  it('extracts data-latex attribute', () => {
    const el = document.createElement('div');
    el.setAttribute('data-latex', '\\frac{x}{y}');
    const result = extractLatexFromPreview(el);
    expect(result).toBe('\\frac{x}{y}');
  });

  it('returns empty string when attribute missing', () => {
    const el = document.createElement('div');
    const result = extractLatexFromPreview(el);
    expect(result).toBe('');
  });
});

describe('copyToClipboard', () => {
  it('copies text/plain content', async () => {
    const result = await copyToClipboard('hello world', 'text/plain');
    expect(result).toBe(true);
    expect(mockClipboardWriteText).toHaveBeenCalledWith('hello world');
  });

  it('returns false for unsupported format', async () => {
    const result = await copyToClipboard('image data', 'image/png' as any);
    expect(result).toBe(false);
  });

  it('returns false when clipboard write fails', async () => {
    mockClipboardWriteText.mockRejectedValueOnce(new Error('denied'));
    const result = await copyToClipboard('hello', 'text/plain');
    expect(result).toBe(false);
  });
});

describe('copySvgToClipboard', () => {
  const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';

  it('copies SVG to clipboard with image/svg+xml and text/plain', async () => {
    const result = await copySvgToClipboard(svgContent);
    expect(result).toBe(true);
    // Should call clipboard.write (not writeText)
    expect(mockClipboardWrite).toHaveBeenCalled();
  });

  it('falls back to text/plain when clipboard.write fails', async () => {
    mockClipboardWrite.mockRejectedValueOnce(new Error('denied'));
    const result = await copySvgToClipboard(svgContent);
    expect(result).toBe(true);
    expect(mockClipboardWriteText).toHaveBeenCalledWith(svgContent);
  });

  it('returns false when both methods fail', async () => {
    mockClipboardWrite.mockRejectedValueOnce(new Error('denied'));
    mockClipboardWriteText.mockRejectedValueOnce(new Error('also denied'));
    const result = await copySvgToClipboard(svgContent);
    expect(result).toBe(false);
  });
});
