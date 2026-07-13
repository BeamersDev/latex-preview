/**
 * LaTeX 工具函数
 */

/**
 * 从 LaTeX 字符串中检测语法错误
 * 返回错误信息数组
 */
export function checkLatexErrors(latex: string): string[] {
  const errors: string[] = [];
  const lines = latex.split('\n');

  // 检查不匹配的括号
  let braceDepth = 0;
  let parenDepth = 0;
  let brackDepth = 0;

  for (let i = 0; i < latex.length; i++) {
    const ch = latex[i];
    if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth--;
    else if (ch === '(') parenDepth++;
    else if (ch === ')') parenDepth--;
    else if (ch === '[') brackDepth++;
    else if (ch === ']') brackDepth--;

    if (braceDepth < 0) {
      errors.push(`第 ${getLineNumber(latex, i)} 行: 多余的闭合花括号 }`);
      braceDepth = 0;
    }
    if (parenDepth < 0) {
      errors.push(`第 ${getLineNumber(latex, i)} 行: 多余的闭合圆括号 )`);
      parenDepth = 0;
    }
    if (brackDepth < 0) {
      errors.push(`第 ${getLineNumber(latex, i)} 行: 多余的闭合方括号 ]`);
      brackDepth = 0;
    }
  }

  if (braceDepth > 0) {
    errors.push(`缺少 ${braceDepth} 个闭合花括号 }`);
  }
  if (parenDepth > 0) {
    errors.push(`缺少 ${parenDepth} 个闭合圆括号 )`);
  }
  if (brackDepth > 0) {
    errors.push(`缺少 ${brackDepth} 个闭合方括号 ]`);
  }

  // 检查空命令
  const cmdMatches = latex.match(/\\([a-zA-Z]+)\s*$/gm);
  if (cmdMatches) {
    for (const cmd of cmdMatches) {
      const name = cmd.slice(1).trim();
      if (name.length > 0 && !isKnownCommand(name)) {
        errors.push(`未知命令: \\${name}`);
      }
    }
  }

  return errors;
}

function getLineNumber(text: string, index: number): number {
  return text.substring(0, index).split('\n').length;
}

function isKnownCommand(name: string): boolean {
  const knownCommands = new Set([
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon',
    'zeta', 'eta', 'theta', 'vartheta', 'iota', 'kappa',
    'lambda', 'mu', 'nu', 'xi', 'pi', 'varpi', 'rho', 'varrho',
    'sigma', 'varsigma', 'tau', 'upsilon', 'phi', 'varphi',
    'chi', 'psi', 'omega',
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma',
    'Phi', 'Psi', 'Omega',
    'frac', 'sqrt', 'sum', 'int', 'iint', 'iiint', 'oint',
    'prod', 'lim', 'log', 'ln', 'sin', 'cos', 'tan', 'cot',
    'sec', 'csc', 'arcsin', 'arccos', 'arctan',
    'to', 'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow',
    'Leftrightarrow', 'mapsto', 'longrightarrow', 'hookrightarrow',
    'rightharpoonup', 'rightleftharpoons', 'uparrow', 'downarrow',
    'updownarrow', 'nearrow', 'searrow',
    'pm', 'mp', 'times', 'div', 'cdot', 'circ', 'ast', 'star',
    'leq', 'geq', 'll', 'gg', 'approx', 'equiv', 'sim', 'simeq',
    'cong', 'neq', 'propto', 'perp', 'parallel',
    'subset', 'supset', 'subseteq', 'supseteq', 'cup', 'cap',
    'in', 'notin', 'emptyset', 'varnothing',
    'mathbb', 'mathcal', 'mathbf', 'textrm', 'text',
    'begin', 'end', 'overline', 'underline',
    'hat', 'tilde', 'bar', 'dot', 'ddot', 'vec', 'widehat',
    'overbrace', 'underbrace',
    'forall', 'exists', 'nexists', 'nabla', 'partial',
    'infty', 'triangle', 'angle', 'measuredangle',
    'cdot', 'cdots', 'vdots', 'ddots',
    'left', 'right', 'bigl', 'bigr', 'biggl', 'biggr',
    'displaystyle', 'textstyle', 'scriptstyle',
    'quad', 'qquad', ';', ':', '!', ' ',
    'tag', 'label', 'ref', 'eqref',
    'matrix', 'pmatrix', 'bmatrix', 'vmatrix', 'cases', 'aligned',
  ]);
  return knownCommands.has(name);
}

/**
 * 生成编辑器行内错误标记
 */
export function getErrorLines(latex: string): number[] {
  const errorLines: number[] = [];
  const lines = latex.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 检查不匹配的括号
    let braces = 0;
    let parens = 0;
    for (const ch of line) {
      if (ch === '{') braces++;
      else if (ch === '}') braces--;
      else if (ch === '(') parens++;
      else if (ch === ')') parens--;
    }
    if (braces !== 0 || parens !== 0) {
      errorLines.push(i);
    }
  }

  return errorLines;
}

/**
 * 将 KaTeX 错误转化为用户友好信息
 */
export function parseKaTeXError(error: Error): string {
  const msg = error.message;
  // KaTeX 错误格式: "KaTeX parse error: ... at position X: ..."
  if (msg.includes('KaTeX parse error')) {
    const match = msg.match(/at position (\d+):?\s*(.*)/);
    if (match) {
      return `解析位置 ${match[1]}: ${match[2]}`;
    }
    return msg.replace('KaTeX parse error: ', '');
  }
  return msg;
}
