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
    expect(checkLatexSyntax('{}')).toBeNull();
  });

  it('handles display math $$...$$ blocks', () => {
    const result = checkLatexSyntax('$$\\\\frac{a}{b}$$');
    expect(result).toBeNull();
    expect(mockRenderToString).toHaveBeenCalledWith(
      '\\\\frac{a}{b}',
      expect.objectContaining({ displayMode: true }),
    );
  });

  it('handles display math \\[...\\] blocks', () => {
    // String: \[ \int_a^b x \, dx \]
    const result = checkLatexSyntax('\\[\\int_a^b x\\,dx\\]');
    expect(result).toBeNull();
    // Content extracted from inside \[...\] is: \int_a^b x\,dx
    expect(mockRenderToString).toHaveBeenCalledWith(
      '\\int_a^b x\\,dx',
      expect.objectContaining({ displayMode: true }),
    );
  });

  it('handles mixed inline and display math', () => {
    // Text before display math block
    const result = checkLatexSyntax('inline $x$ here $$\\\\text{display}$$');
    expect(result).toBeNull();
  });

  it('handles multiple display math blocks', () => {
    const result = checkLatexSyntax('$$a$$ text $$b$$');
    expect(result).toBeNull();
  });

  it('detects syntax error inside display math', () => {
    mockRenderToString.mockImplementation(() => {
      throw new Error('KaTeX parse error: Invalid expression');
    });
    const result = checkLatexSyntax('$$\\\\badcommand$$');
    expect(result).not.toBeNull();
    expect(result).toContain('语法错误');
  });

  it('returns null when checker itself throws (outer catch)', () => {
    // Make the regex or slice throw inside the function
    // We can't easily make native regex throw, but we can test the catch path
    // by forcing an error in katex that propagates differently
    // Actually, let's test the case where an unexpected throw in katex
    // triggers the outer try-catch
    mockRenderToString.mockImplementation(() => {
      throw 'non-error throw'; // not an Error, so .message would fail
    });
    // This would normally be caught by the inner catch,
    // but if something throws in the checker itself, outer catch catches it
    const result = checkLatexSyntax('$$x$$');
    // The outer catch returns null for any unexpected error
    expect(result).toBeNull();
  });

  it('handles text after last display math block', () => {
    const result = checkLatexSyntax('$$a$$ tail text');
    expect(result).toBeNull();
  });

  it('handles only text (no math delimiters)', () => {
    const result = checkLatexSyntax('just plain text here');
    expect(result).toBeNull();
  });

  it('handles display math at start without preceding text', () => {
    const result = checkLatexSyntax('$$display$$');
    expect(result).toBeNull();
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
