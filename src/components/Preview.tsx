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

    // Split by double newlines → each line is an independent formula
    const lines = latex.split(/\n\s*\n/).filter((l) => l.trim());

    let html = '';
    let cursor = 0; // track position in source for bidirectional mapping
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Find this line's start position in the source
      const lineStart = latex.indexOf(trimmed, cursor);
      if (lineStart >= 0) cursor = lineStart;

      try {
        // Try display mode first (centered formula)
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
