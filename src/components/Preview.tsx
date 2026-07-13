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

    let html = '';
    const hasDisplayMath = /\$\$/.test(latex) || /\\\\\[/.test(latex);

    if (!hasDisplayMath) {
      // Single formula — render directly
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
      // Multi-block — track source positions for bidirectional mapping
      const regex = /(\$\$[^$]*\$\$|\\\\\[[\s\S]*?\\\\\])/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(latex)) !== null) {
        // Render plain text before this block
        if (match.index > lastIndex) {
          const text = latex.slice(lastIndex, match.index);
          html += escapeHtml(text);
        }

        let renderContent = match[0];
        if (renderContent.startsWith('$$') && renderContent.endsWith('$$')) {
          renderContent = renderContent.slice(2, -2);
        } else if (renderContent.startsWith('\\[') && renderContent.endsWith('\\]')) {
          renderContent = renderContent.slice(2, -2);
        }

        try {
          const rendered = katex.renderToString(renderContent.trim(), {
            throwOnError: true,
            displayMode: true,
            output: 'svg' as any,
          });
          // Wrap with position info for bidirectional click
          html += `<span class="preview-block" data-pos="${match.index}">${rendered}</span>`;
        } catch (err) {
          const msg = parseKaTeXError(err as Error);
          errors.push(msg);
          html += `<span class="katex-error" title="${msg}">${escapeHtml(renderContent)}</span>`;
        }

        lastIndex = match.index + match[0].length;
      }

      // Remaining text after last block
      if (lastIndex < latex.length) {
        html += escapeHtml(latex.slice(lastIndex));
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
    const timer = setTimeout(renderLatex, 150);
    return () => clearTimeout(timer);
  }, [renderLatex]);

  // Click handler for bidirectional jump
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Find the clicked preview-block
    const target = (e.target as HTMLElement).closest('.preview-block');
    if (target) {
      const pos = target.getAttribute('data-pos');
      if (pos !== null) {
        window.dispatchEvent(new CustomEvent('jump-to-pos', { detail: parseInt(pos, 10) }));
        return;
      }
    }
    // Fallback: just focus editor
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
