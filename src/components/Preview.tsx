import { useEffect, useRef, useState, useCallback } from 'react';
import katex from 'katex';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { parseKaTeXError } from '@/utils/latex';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;');
}

/** Render a plain-text segment as Markdown: **bold**, *italic*, `code`, paragraphs, line breaks. */
function renderMarkdown(text: string): string {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs
    .filter((p) => p.trim())
    .map((para) => {
      let html = escapeHtml(para);
      // Inline code (before bold/italic to avoid conflicts)
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      // Bold
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Italic
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // Single newlines → <br/>
      html = html.replace(/\n/g, '<br/>');
      return `<p>${html}</p>`;
    })
    .join('');
}

interface PreviewProps {
  latex: string;
  onError?: (errors: string[]) => void;
  className?: string;
}

export default function Preview({ latex, onError, className = '' }: PreviewProps) {
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
