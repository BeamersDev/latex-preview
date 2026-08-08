import { evaluate } from 'mathjs';

/**
 * LaTeX 数值求值器：
 * - 普通表达式求值（分式、幂、根号、三角函数、对数、绝对值、组合数等）
 * - 定积分 \int_{a}^{b} f(x) dx（Simpson 数值积分）
 * - 求和 \sum_{i=a}^{b} expr（循环）
 * - 连乘 \prod_{i=a}^{b} expr（循环）
 * - 极限 \lim_{x\to a} expr（数值趋近）
 */

export interface EvaluateResult {
  ok: boolean;
  value?: number;
  error?: string;
}

// --- LaTeX → mathjs 转换 ---

const FUNCTION_MAP: Record<string, string> = {
  // 三角函数
  '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan',
  '\\cot': 'cot', '\\sec': 'sec', '\\csc': 'csc',
  '\\arcsin': 'asin', '\\arccos': 'acos', '\\arctan': 'atan',
  '\\arccot': 'acot', '\\arcsec': 'asec', '\\arccsc': 'acsc',
  // 双曲函数
  '\\sinh': 'sinh', '\\cosh': 'cosh', '\\tanh': 'tanh',
  '\\coth': 'coth', '\\sech': 'sech', '\\csch': 'csch',
  // 对数 / 指数
  '\\ln': 'log', '\\log': 'log10', '\\lg': 'log10',
  '\\exp': 'exp',
  // 符号 / 常量
  '\\pi': 'pi', '\\cdot': '*', '\\times': '*', '\\div': '/',
  '\\pm': '+', '\\mp': '-', '\\ast': '*', '\\circ': '*',
  '\\partial': 'diff', '\\infty': 'Infinity',
  '\\sqrt': 'sqrt',
};

/** Convert a simple LaTeX expression (no \int \sum \prod \lim) to mathjs syntax. */
export function latexToMathjs(latex: string): string {
  let s = latex;
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\,|\\;|\\!|\\quad|\\qquad/g, '');
  s = s.replace(/\\dfrac|\\tfrac|\\frac/g, '\\frac');
  s = s.replace(/\\displaystyle/g, '');
  // \frac{a}{b} → (a)/(b) — handle nested by repeated replacement
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
  }
  // \sqrt[n]{x} → nthRoot(x,n) ; \sqrt{x} → sqrt(x)
  s = s.replace(/\\sqrt\[([^{}]*)\]\{([^{}]*)\}/g, 'nthRoot($2,$1)');
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)');
  // \binom{n}{k} → combinations(n,k)
  s = s.replace(/\\binom\{([^{}]*)\}\{([^{}]*)\}/g, 'combinations($1,$2)');
  // \log_{a}{x} or \log_{a}(x) or \log_{a} x → log(x)/log(a)
  s = s.replace(/\\log_\{([^{}]*)\}(\([^)]*\)|\{[^{}]*\}|[a-zA-Z0-9]+)/g, (_m, base, arg) => {
    const inner = arg.startsWith('(') || arg.startsWith('{') ? arg.slice(1, -1) : arg;
    return `log(${inner})/log(${base})`;
  });
  // superscript {…} → (…) e.g. 2^{10} → 2^(10)
  s = s.replace(/\^\{([^{}]*)\}/g, '^($1)');
  // |…| → abs(…)
  s = s.replace(/\\left\|([\s\S]*?)\\right\|/g, 'abs($1)');
  s = s.replace(/\|([^|]*)\|/g, 'abs($1)');
  s = s.replace(/\\mid/g, '|');
  // functions & constants
  for (const [k, v] of Object.entries(FUNCTION_MAP)) {
    if (k === '\\sqrt' || k === '\\cdot' || k === '\\times' || k === '\\div' || k === '\\pm' || k === '\\mp' || k === '\\ast' || k === '\\circ') continue;
    s = s.split(k).join(v);
  }
  // factorial: n! → factorial(n)
  s = s.replace(/([a-zA-Z0-9)\]]+)\!/g, 'factorial($1)');
  // remove remaining unknown macros (keep brace content)
  s = s.replace(/\\[a-zA-Z]+/g, '');
  return s;
}

/** Parse structured expressions (\int \sum \prod \lim). */
function extractStructured(latex: string): {
  type: 'int' | 'sum' | 'prod' | 'lim';
  lower: string;
  upper: string;
  varName?: string;
  body: string;
  dxVar?: string;
  limitPoint?: string;
} | null {
  // \int_{a}^{b} f(x) dx
  const intMatch = latex.match(
    /^\\int\s*_\{([^{}]*)\}\s*\^\{([^{}]*)\}\s*([\s\S]*?)\s*d([a-zA-Z])\s*$/,
  );
  if (intMatch) {
    return { type: 'int', lower: intMatch[1], upper: intMatch[2], body: intMatch[3], dxVar: intMatch[4] };
  }
  // \sum_{i=a}^{b} expr
  const sumMatch = latex.match(
    /^\\sum\s*_\{\s*([a-zA-Z])\s*=\s*([^{}]*)\}\s*\^\{([^{}]*)\}\s*([\s\S]*)$/,
  );
  if (sumMatch) {
    return { type: 'sum', varName: sumMatch[1], lower: sumMatch[2], upper: sumMatch[3], body: sumMatch[4] };
  }
  // \prod_{i=a}^{b} expr
  const prodMatch = latex.match(
    /^\\prod\s*_\{\s*([a-zA-Z])\s*=\s*([^{}]*)\}\s*\^\{([^{}]*)\}\s*([\s\S]*)$/,
  );
  if (prodMatch) {
    return { type: 'prod', varName: prodMatch[1], lower: prodMatch[2], upper: prodMatch[3], body: prodMatch[4] };
  }
  // \lim_{x\to a} expr
  const limMatch = latex.match(
    /^\\lim\s*_\{\s*([a-zA-Z])\s*\\to\s*([^{}]*)\}\s*([\s\S]*)$/,
  );
  if (limMatch) {
    return { type: 'lim', lower: '', upper: '', varName: limMatch[1], body: limMatch[3], limitPoint: limMatch[2] };
  }
  return null;
}

/** Simpson 1/3 rule numeric integration. */
function numericIntegral(f: (x: number) => number, a: number, b: number): number {
  const n = 2000;
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += (i % 2 === 1 ? 4 : 2) * f(x);
  }
  return (h / 3) * sum;
}

/** Evaluate one mathjs expression string with variable bindings. */
function evalExpr(expr: string, vars: Record<string, number> = {}): number {
  const cleaned = latexToMathjs(expr.trim());
  const scope = { ...vars, e: Math.E };
  return evaluate(cleaned, scope) as number;
}

/**
 * Main entry: evaluate a LaTeX expression numerically.
 */
export function evaluateLatex(input: string): EvaluateResult {
  try {
    const trimmed = input.trim();
    if (!trimmed) return { ok: false, error: '空表达式' };

    const structured = extractStructured(trimmed);

    // --- 定积分 ---
    if (structured?.type === 'int') {
      const a = evalExpr(structured.lower);
      const b = evalExpr(structured.upper);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return { ok: false, error: '积分上下限必须是数值' };
      }
      const v = structured.dxVar ?? 'x';
      const body = structured.body.trim() || '1';
      const f = (x: number) => evalExpr(body, { [v]: x });
      const value = numericIntegral(f, a, b);
      return { ok: true, value };
    }

    // --- 求和 ---
    if (structured?.type === 'sum') {
      const i0 = Math.round(evalExpr(structured.lower));
      const i1Raw = evalExpr(structured.upper);
      if (!Number.isFinite(i1Raw)) return { ok: false, error: '求和上限必须是有限数值（∞ 不支持，请写具体值）' };
      const i1 = Math.round(i1Raw);
      if (i1 - i0 > 100000) return { ok: false, error: '求和范围过大' };
      if (i1 < i0) return { ok: false, error: '求和下限大于上限' };
      const name = structured.varName ?? 'i';
      const body = structured.body.trim();
      let total = 0;
      for (let i = i0; i <= i1; i++) {
        total += evalExpr(body, { [name]: i });
      }
      return { ok: true, value: total };
    }

    // --- 连乘 ---
    if (structured?.type === 'prod') {
      const i0 = Math.round(evalExpr(structured.lower));
      const i1Raw = evalExpr(structured.upper);
      if (!Number.isFinite(i1Raw)) return { ok: false, error: '连乘上限必须是有限数值（∞ 不支持，请写具体值）' };
      const i1 = Math.round(i1Raw);
      if (i1 - i0 > 100000) return { ok: false, error: '连乘范围过大' };
      if (i1 < i0) return { ok: false, error: '连乘下限大于上限' };
      const name = structured.varName ?? 'i';
      const body = structured.body.trim();
      let total = 1;
      for (let i = i0; i <= i1; i++) {
        total *= evalExpr(body, { [name]: i });
      }
      return { ok: true, value: total };
    }

    // --- 极限 ---
    if (structured?.type === 'lim') {
      const name = structured.varName ?? 'x';
      const body = structured.body.trim();
      const target = evalExpr(structured.limitPoint!);
      if (!Number.isFinite(target)) return { ok: false, error: '极限点必须是数值' };
      // two-sided numerical limit with shrinking h
      let last = NaN;
      let h = 1;
      for (let iter = 0; iter < 12; iter++) {
        h /= 10;
        const fPlus = evalExpr(body, { [name]: target + h });
        const fMinus = evalExpr(body, { [name]: target - h });
        if (!Number.isFinite(fPlus) || !Number.isFinite(fMinus)) break;
        const avg = (fPlus + fMinus) / 2;
        if (!Number.isFinite(last)) { last = avg; continue; }
        if (Math.abs(avg - last) < 1e-8) { last = avg; break; }
        last = avg;
      }
      return { ok: true, value: last };
    }

    // --- 普通表达式 ---
    const value = evalExpr(trimmed);
    if (!Number.isFinite(value)) return { ok: false, error: '结果不是有限数值' };
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: (err as Error).message.slice(0, 120) };
  }
}

/** Format a numeric result, trimming floating-point noise. */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}
