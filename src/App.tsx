import { useState, useCallback, useEffect, useRef } from 'react';
import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import SymbolPanel from '@/components/SymbolPanel';
import SymbolSearch from '@/components/SymbolSearch';
import Toolbar from '@/components/Toolbar';
import StatusBar from '@/components/StatusBar';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useSession } from '@/hooks/useSession';
import { exportAsPng, exportAsSvg, downloadBlob, copySvgToClipboard } from '@/utils/export';
import type { EditorPosition } from '@/types';

const DEFAULT_LATEX = '\\frac{x^2}{y}';

export default function App() {
  const [latex, setLatex] = useState(DEFAULT_LATEX);
  const [symbolCollapsed, setSymbolCollapsed] = useState(false);
  const [cursorPos, setCursorPos] = useState<EditorPosition>({ line: 1, col: 1 });
  const [errorCount, setErrorCount] = useState(0);
  const [katexReady, setKatexReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { settings, updateSettings } = useSettingsContext();
  const { loadSession, saveSession } = useSession();

  // Session recovery
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setLatex(saved);
    }
    setKatexReady(true);
  }, [loadSession]);

  // Auto save debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      saveSession(latex);
    }, 500);
    return () => clearTimeout(timer);
  }, [latex, saveSession]);

  const handleLayoutToggle = useCallback(() => {
    updateSettings({
      layout: settings.layout === 'horizontal' ? 'vertical' : 'horizontal',
    });
  }, [settings.layout, updateSettings]);

  const handleExportPng = useCallback(async () => {
    const previewEl = previewRef.current;
    if (!previewEl) return;
    const blob = await exportAsPng(previewEl, settings.dpi);
    if (blob) {
      downloadBlob(blob, 'latex-formula.png');
    }
  }, [settings.dpi]);

  const handleExportSvg = useCallback(async () => {
    const previewEl = previewRef.current;
    if (!previewEl) return;
    const svg = exportAsSvg(previewEl);
    if (svg) {
      const success = await copySvgToClipboard(svg);
      if (!success) {
        downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'latex-formula.svg');
      }
    }
  }, []);

  const handleError = useCallback((errors: string[]) => {
    setErrorCount(errors.length);
  }, []);

  // Listen for Ctrl+S export events
  useEffect(() => {
    const pngHandler = () => handleExportPng();
    window.addEventListener('export-png', pngHandler);
    return () => window.removeEventListener('export-png', pngHandler);
  }, [handleExportPng]);

  const layoutClass = settings.layout === 'vertical' ? 'layout-vertical' : 'layout-horizontal';

  return (
    <div className={`app ${layoutClass}`}>
      <Toolbar
        onLayoutToggle={handleLayoutToggle}
        layout={settings.layout}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
      />

      <div className="main-content">
        <SymbolPanel
          collapsed={symbolCollapsed}
          onToggle={() => setSymbolCollapsed(!symbolCollapsed)}
        />

        <div className="editor-preview-container">
          <div className="editor-pane">
            <div className="pane-header">编辑器</div>
            <Editor
              value={latex}
              onChange={setLatex}
              onCursorChange={setCursorPos}
            />
          </div>

          <div className="divider" />

          <div className="preview-pane">
            <div className="pane-header">预览</div>
            <div ref={previewRef}>
              <Preview
                latex={latex}
                onError={handleError}
              />
            </div>
          </div>
        </div>
      </div>

      <StatusBar
        position={cursorPos}
        errorCount={errorCount}
        katexLoaded={katexReady}
      />

      <SymbolSearch />
    </div>
  );
}
