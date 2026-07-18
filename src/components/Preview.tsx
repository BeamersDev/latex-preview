import { useEffect, useRef, useState, useCallback } from 'react';
import katex from 'katex';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { parseKaTeXError } from '@/utils/latex';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Render a plain-text segment with full Markdown support. */
function renderMarkdown(text: string): string {
  // Extract fenced code blocks first (```lang...```)
  const codeBlocks: string[] = [];
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const idx = codeBlocks.length;
    // Replace newlines with HTML entity so paragraph splitting doesn't break <pre>
    codeBlocks.push(
      `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim()).replace(/\r?\n/g, '&#10;')}</code></pre>`,
    );
    return `__CODE_BLOCK_${idx}__`;
  });

  // Extract inline code (`code`)
  const inlineCodes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_match, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `__INLINE_CODE_${idx}__`;
  });

  // Headers: ### / ## / #
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquotes
  text = text.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  text = text.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rule
  text = text.replace(/^---+$/gm, '<hr/>');

  // Unordered list items (- or *)
  text = text.replace(/^(?:-|\*) (.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  text = text.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  // Bold + italic (now safe — code already extracted)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links [text](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );

  // Restore fenced code blocks and inline code BEFORE paragraph splitting
  text = text.replace(/__CODE_BLOCK_(\d+)__/g, (_m, idx) => codeBlocks[parseInt(idx)]);
  text = text.replace(/__INLINE_CODE_(\d+)__/g, (_m, idx) => inlineCodes[parseInt(idx)]);

  // Paragraphs (blank lines separate them)
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs
    .filter((p) => p.trim())
    .map((para) => {
      // Already a block-level element? Don't wrap in <p>
      if (/^<(h[1-6]|blockquote|ul|pre|hr)/.test(para.trim())) {
        return para;
      }
      return `<p>${para.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
}

interface PreviewProps {
  latex: string;
  onError?: (errors: string[]) => void;
  className?: string;
  markdownScale?: number;
}

export default function Preview({ latex, onError, className = '', markdownScale }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const { settings } = useSettingsContext();

  const renderLatex = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const errors: string[] = [];

    container.setAttribute('data-latex', latex);

    if (settings.markdownMode) {
      // --- Markdown mode: $$...$$ / $...$ treated as LaTeX, rest as Markdown ---
      const parts = latex.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
      let html = '';
      let cursor = 0;

      for (const part of parts) {
        if (!part) continue;

        if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
          // Display math block
          const math = part.slice(2, -2).trim();
          const partStart = latex.indexOf(part, cursor);
          if (partStart >= 0) cursor = partStart + part.length;

          try {
            const rendered = katex.renderToString(math, {
              throwOnError: true,
              displayMode: true,
              output: 'svg' as any,
            });
            html += `<span class="preview-block" data-pos="${partStart}">${rendered}</span>`;
          } catch (err) {
            const msg = parseKaTeXError(err as Error);
            errors.push(msg);
            html += `<span class="katex-error" title="${msg}">⚠ ${escapeHtml(math)}</span>`;
          }
        } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          // Inline math
          const math = part.slice(1, -1).trim();
          const partStart = latex.indexOf(part, cursor);
          if (partStart >= 0) cursor = partStart + part.length;

          try {
            const rendered = katex.renderToString(math, {
              throwOnError: true,
              displayMode: false,
              output: 'svg' as any,
            });
            html += `<span class="preview-inline" data-pos="${partStart}">${rendered}</span>`;
          } catch (err) {
            const msg = parseKaTeXError(err as Error);
            errors.push(msg);
            html += `<span class="katex-error" title="${msg}">⚠ ${escapeHtml(math)}</span>`;
          }
        } else {
          // Markdown text
          const mdHtml = renderMarkdown(part);
          html += mdHtml;
          const partPos = latex.indexOf(part, cursor);
          if (partPos >= 0) cursor = partPos + part.length;
        }
      }

      container.innerHTML = html;
    } else {
      // --- Legacy mode: double newline = formula separator ---
      const lines = latex.split(/\n\s*\n/).filter((l) => l.trim());

      let html = '';
      let cursor = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const lineStart = latex.indexOf(trimmed, cursor);
        if (lineStart >= 0) cursor = lineStart;

        try {
          const rendered = katex.renderToString(trimmed, {
            throwOnError: true,
            displayMode: true,
            output: 'svg' as any,
          });
          html += `<span class="preview-block" data-pos="${lineStart}">${rendered}</span>`;
        } catch (err) {
          const msg = parseKaTeXError(err as Error);
          errors.push(msg);
          html += `<span class="katex-error" title="${msg}">⚠ ${escapeHtml(trimmed)}</span>`;
        }
        html += '<br/>';
        cursor += trimmed.length;
      }

      container.innerHTML = html;
    }

    if (errors.length > 0) {
      setErrorMessages(errors);
      onError?.(errors);
    } else {
      setErrorMessages([]);
      onError?.([]);
    }
  }, [latex, onError, settings.markdownMode]);

  useEffect(() => {
    const timer = setTimeout(renderLatex, 150);
    return () => clearTimeout(timer);
  }, [renderLatex]);

  // Click handler for bidirectional jump
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('.preview-block, .preview-inline');
    if (target) {
      const pos = target.getAttribute('data-pos');
      if (pos !== null) {
        window.dispatchEvent(new CustomEvent('jump-to-pos', { detail: parseInt(pos, 10) }));
        return;
      }
    }
    window.dispatchEvent(new Event('focus-editor'));
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.3, Math.min(3, settings.zoomLevel + delta));
        const previewEl = containerRef.current;
        if (previewEl) {
          previewEl.style.zoom = `${newZoom}`;
        }
      }
    },
    [settings.zoomLevel],
  );

  return (
    <div className={`preview-container ${className}`} onClick={handleClick}>
      <div
        className="preview-content"
        ref={containerRef}
        onWheel={handleWheel}
        style={
          settings.markdownMode
            ? ({ '--markdown-scale': markdownScale ?? settings.markdownScale } as React.CSSProperties)
            : undefined
        }
      />
      {errorMessages.length > 0 && (
        <div className="preview-errors">
          {errorMessages.map((msg, i) => (
            <div key={i} className="preview-error-item">
              ⚠ {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
