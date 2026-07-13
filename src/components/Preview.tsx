import { useEffect, useRef, useState, useCallback } from 'react';
import katex from 'katex';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { parseKaTeXError } from '@/utils/latex';

/** HTML-escape a string so it can be safely injected as innerHTML */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

    // Store LaTeX source for export
    container.setAttribute('data-latex', latex);

    let html = '';

    // Check if the content contains display math delimiters
    const hasDisplayMath = /\$\$/.test(latex) || /\\\[/.test(latex);

    if (!hasDisplayMath) {
      // Single formula — render directly (inline math mode is the default)
      try {
        html = katex.renderToString(latex.trim(), {
          throwOnError: true,
          displayMode: false,
          output: 'svg' as any,
        });
      } catch (err) {
        const msg = parseKaTeXError(err as Error);
        errors.push(msg);
        html = `<span class="katex-error" title="${msg}">${escapeHtml(latex)}</span>`;
      }
    } else {
      // Mixed content — split by display math blocks and render individually
      // Handle both $$...$$ and \[...\] display math
      const parts = latex.split(/(\$\$[^$]*\$\$|\\\[[\s\S]*?\\\])/g);

      for (const part of parts) {
        if (!part.trim()) continue;

        const isDisplay =
          (part.startsWith('$$') && part.endsWith('$$')) ||
          (part.startsWith('\\[') && part.endsWith('\\]'));

        if (isDisplay) {
          let renderContent = part;
          if (part.startsWith('$$') && part.endsWith('$$')) {
            renderContent = part.slice(2, -2);
          } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
            renderContent = part.slice(2, -2);
          }

          try {
            html += katex.renderToString(renderContent.trim(), {
              throwOnError: true,
              displayMode: true,
              output: 'svg' as any,
            });
          } catch (err) {
            const msg = parseKaTeXError(err as Error);
            errors.push(msg);
            // Fallback: red text
            html += `<span class="katex-error" title="${msg}">${escapeHtml(renderContent)}</span>`;
          }
        } else {
          // Plain text between display math blocks — HTML escape and keep as-is
          html += escapeHtml(part);
        }
      }
    }

    container.innerHTML = html;

    if (errors.length > 0) {
      setErrorMessages(errors);
      onError?.(errors);
    } else {
      setErrorMessages([]);
      onError?.([]);
    }
  }, [latex, onError]);

  useEffect(() => {
    const timer = setTimeout(renderLatex, 150); // debounce
    return () => clearTimeout(timer);
  }, [renderLatex]);

  // Handle zoom via wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.3, Math.min(3, settings.zoomLevel + delta));
        // Update zoom via settings context or local
        const previewEl = containerRef.current;
        if (previewEl) {
          previewEl.style.zoom = `${newZoom}`;
        }
      }
    },
    [settings.zoomLevel],
  );

  return (
    <div className={`preview-container ${className}`} onClick={() => window.dispatchEvent(new Event('focus-editor'))}>
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
