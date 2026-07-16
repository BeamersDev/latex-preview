import katex from 'katex';

/**
 * Get the LaTeX block ($...$ or $$...$$) at the given position.
 * Returns { start, end, content } or null if cursor is not inside any LaTeX block.
 */
export function getCurrentLatexBlockAt(
  text: string,
  pos: number,
): { start: number; end: number; content: string; isDisplay: boolean } | null {
  // Check if pos is inside $$...$$ (display math)
  const displayStart = text.lastIndexOf('$$', pos);
  if (displayStart >= 0) {
    const displayEnd = text.indexOf('$$', displayStart + 2);
    if (displayEnd < 0 || displayEnd >= pos) {
      return { start: displayStart, end: displayEnd, content: text.slice(displayStart + 2, displayEnd), isDisplay: true };
    }
  }
  // Check if pos is inside $...$ (inline math)
  const inlineStart = text.lastIndexOf('$', pos);
  if (inlineStart >= 0) {
    const inlineEnd = text.indexOf('$', inlineStart + 1);
    if (inlineEnd < 0 || inlineEnd >= pos) {
      return { start: inlineStart, end: inlineEnd, content: text.slice(inlineStart + 1, inlineEnd), isDisplay: false };
    }
  }
  return null;
}

/**
 * Check a single LaTeX block's content for syntax errors.
 * Returns null if valid, or an error message string if invalid.
 */
export function checkLatexBlock(content: string, isDisplay: boolean): string | null {
  try {
    // Check for unbalanced braces first (fast path)
    let depth = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') {
        depth--;
        if (depth < 0) return '非匹配的右花括号 }';
      }
    }
    if (depth > 0) return '缺少闭合花括号 }，当前有 ' + depth + ' 个未闭合';

    if (content.trim()) {
      try {
        katex.renderToString(content.trim(), {
          throwOnError: true,
          displayMode: isDisplay,
          output: 'svg',
        } as any);
      } catch (err) {
        const msg = (err as Error).message.slice(0, 100);
        return `语法错误: ${msg}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Check if position is inside any LaTeX delimiter ($...$ or $$...$$). */
export function isInsideLatexBlock(text: string, pos: number): boolean {
  return getCurrentLatexBlockAt(text, pos) !== null;
}

/**
 * Extract a readable error message from a KaTeX error.
 */
export function parseKaTeXError(err: Error): string {
  const msg = err.message;
  // Remove KaTeX internal prefix noise
  const cleaned = msg
    .replace(/^KaTeX\s*/i, '')
    .replace(/\\n/g, ' ')
    .trim();
  return cleaned.length > 80 ? cleaned.slice(0, 80) + '...' : cleaned;
}

/**
 * Check if the given LaTeX text contains any syntax errors.
 * Returns null if valid, or an error message string if invalid.
 */
export function checkLatexSyntax(text: string): string | null {
  try {
    // Check for unbalanced braces first (fast path)
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') depth++;
      if (text[i] === '}') {
        depth--;
        if (depth < 0) return '非匹配的右花括号 }';
      }
    }
    if (depth > 0) return '缺少闭合花括号 }，当前有 ' + depth + ' 个未闭合';

    // Split into formula blocks and check each with KaTeX
    const blocks: string[] = [];

    // Extract $$...$$ and \[...\] display math
    const displayRegex = /\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]/g;
    let lastEnd = 0;
    let m;
    while ((m = displayRegex.exec(text)) !== null) {
      if (m.index > lastEnd) {
        // Inline math or plain text between display blocks
        const inline = text.slice(lastEnd, m.index);
        // Check inline math: text between $...$ (not $$)
        const inlineParts = inline.split(/(?<!\$)\$(?!\$)[^$]*(?<!\$)\$(?!\$)/);
        for (const part of inlineParts) {
          if (part.trim()) blocks.push(part);
        }
      }
      blocks.push(m[0]);
      lastEnd = m.index + m[0].length;
    }
    if (lastEnd < text.length) {
      blocks.push(text.slice(lastEnd));
    }

    // Check each block with KaTeX
    for (const block of blocks) {
      const isDisplay = block.startsWith('$$') || block.startsWith('\\[');
      let content = block;
      if (block.startsWith('$$') && block.endsWith('$$')) content = block.slice(2, -2);
      else if (block.startsWith('\\[') && block.endsWith('\\]')) content = block.slice(2, -2);

      if (content.trim()) {
        try {
          katex.renderToString(content.trim(), {
            throwOnError: true,
            displayMode: isDisplay,
            output: 'svg',
          } as any);
        } catch (err) {
          const msg = (err as Error).message.slice(0, 100);
          return `语法错误: ${msg}`;
        }
      }
    }

    return null;
  } catch {
    return null; // If our checker itself fails, allow insertion
  }
}
