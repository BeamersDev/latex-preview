import { describe, it, expect } from 'vitest';
import { checkLatexErrors, getErrorLines, parseKaTeXError } from '../src/utils/latex';

describe('checkLatexErrors', () => {
  it('returns empty array for valid LaTeX', () => {
    expect(checkLatexErrors('\\frac{x}{y}')).toEqual([]);
  });

  it('detects mismatched braces', () => {
    const errors = checkLatexErrors('\\frac{x{y}');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors.some(e => e.includes('花括号') || e.includes('}'))).toBe(true);
  });

  it('detects extra closing brace', () => {
    const errors = checkLatexErrors('\\frac{x}{y}}');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('handles empty string', () => {
    expect(checkLatexErrors('')).toEqual([]);
  });

  it('handles complex valid LaTeX', () => {
    const latex = '\\sum_{i=1}^{n} \\frac{1}{i^2} = \\frac{\\pi^2}{6}';
    expect(checkLatexErrors(latex)).toEqual([]);
  });

  it('detects unmatched parentheses', () => {
    const errors = checkLatexErrors('\\sin(x');
    expect(errors.some(e => e.includes('括号'))).toBe(true);
  });

  it('handles multi-line LaTeX', () => {
    const latex = 'a = b \\\\\nc = d }';
    const errors = checkLatexErrors(latex);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('getErrorLines', () => {
  it('returns empty for valid LaTeX', () => {
    expect(getErrorLines('\\frac{a}{b}')).toEqual([]);
  });

  it('detects error line with mismatched braces', () => {
    const lines = getErrorLines('\\frac{a}{b}\n\\frac{c{d}');
    expect(lines).toContain(1);
  });

  it('handles empty string', () => {
    expect(getErrorLines('')).toEqual([]);
  });
});

describe('parseKaTeXError', () => {
  it('parses standard KaTeX error', () => {
    const error = new Error("KaTeX parse error: expected '}', got 'x' at position 5: {x");
    const result = parseKaTeXError(error);
    expect(result).toContain('5');
    expect(result).toContain('x');
  });

  it('returns message as-is for non-KaTeX errors', () => {
    const error = new Error('Something else');
    expect(parseKaTeXError(error)).toBe('Something else');
  });
});
