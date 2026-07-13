import katex from 'katex';

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
