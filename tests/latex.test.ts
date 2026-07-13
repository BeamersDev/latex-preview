import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseKaTeXError } from '../src/utils/latex';

// Mock katex for syntax check tests
const mockRenderToString = vi.fn();
vi.mock('katex', () => ({
  default: {
    renderToString: (...args: any[]) => mockRenderToString(...args),
  },
}));

// Import after mocking
import { checkLatexSyntax } from '../src/utils/latex';

describe('checkLatexSyntax', () => {
  beforeEach(() => {
    mockRenderToString.mockReset();
    // Default: renderToString succeeds
    mockRenderToString.mockReturnValue('<span>rendered</span>');
  });

  it('returns null for valid LaTeX', () => {
    expect(checkLatexSyntax('\\frac{x}{y}')).toBeNull();
    expect(mockRenderToString).toHaveBeenCalled();
  });

  it('detects mismatched braces', () => {
    // Brace depth ends at 1
    const result = checkLatexSyntax('\\frac{x{y}');
    expect(result).not.toBeNull();
    expect(result).toContain('花括号');
  });

  it('detects extra closing brace', () => {
    const result = checkLatexSyntax('\\frac{x}{y}}');
    expect(result).not.toBeNull();
    expect(result).toContain('花括号');
  });

  it('handles empty string', () => {
    expect(checkLatexSyntax('')).toBeNull();
  });

  it('handles multi-line LaTeX', () => {
    const result = checkLatexSyntax('a = b \\\\\nc = d }');
    expect(result).not.toBeNull();
    expect(result).toContain('花括号');
  });

  it('detects syntax errors via KaTeX', () => {
    // Make katex throw for this call
    mockRenderToString.mockImplementation(() => {
      throw new Error('KaTeX parse error: Invalid expression');
    });
    const result = checkLatexSyntax('\\\\frac{x}'); // valid braces, but katex will reject
    expect(result).not.toBeNull();
    expect(result).toContain('语法错误');
  });

  it('returns null for balanced braces with empty content', () => {
    mockRenderToString.mockClear();
    // After the brace check, the content is split. Is there non-empty content that calls katex?
    // For an empty string, no blocks pass through to katex.
    // For strings like just whitespace between braces pattern...
    expect(checkLatexSyntax('{}')).toBeNull();
  });
});

describe('parseKaTeXError', () => {
  it('parses standard KaTeX error', () => {
    const error = new Error("KaTeX parse error: expected '}', got 'x' at position 5: {x");
    const result = parseKaTeXError(error);
    expect(result).toContain('5');
    expect(result).toContain('x');
  });

  it('trims long error messages', () => {
    const longMsg = 'a'.repeat(100);
    const error = new Error(longMsg);
    const result = parseKaTeXError(error);
    expect(result.length).toBeLessThanOrEqual(83); // 80 + '...'
  });

  it('returns message as-is for non-KaTeX errors', () => {
    const error = new Error('Something else');
    expect(parseKaTeXError(error)).toBe('Something else');
  });
});
