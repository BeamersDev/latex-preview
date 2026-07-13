import { useState, useCallback, useEffect, useRef } from 'react';
import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import SymbolBar from '@/components/SymbolBar';
import SymbolSearch from '@/components/SymbolSearch';
import Toolbar from '@/components/Toolbar';
import StatusBar from '@/components/StatusBar';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { useSession } from '@/hooks/useSession';
import {
  exportAsPng,
  exportAsSvg,
  downloadBlob,
  copyPngToClipboard,
  copySvgToClipboard,
  extractSvgString,
} from '@/utils/export';
import type { EditorPosition } from '@/types';

const DEFAULT_LATEX = '\\frac{x^2}{y}';

export default function App() {
  const [latex, setLatex] = useState(DEFAULT_LATEX);
  const [cursorPos, setCursorPos] = useState<EditorPosition>({ line: 1, col: 1 });
  const [errorCount, setErrorCount] = useState(0);
  const [katexReady, setKatexReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { settings, updateSettings } = useSettingsContext();
  const { loadSession, saveSession } = useSession();
  const [splitPos, setSplitPos] = useState(() => {
    const saved = localStorage.getItem('latex-preview-split');
    return saved ? parseFloat(saved) : 0.5;
  });
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Session recovery — only on initial mount when autoSave is enabled
  const sessionRestored = useRef(false);
  useEffect(() => {
    if (!settings.autoSave || sessionRestored.current) {
      setKatexReady(true);
      return;
    }
    const saved = loadSession();
    if (saved) {
      setLatex(saved);
    }
    sessionRestored.current = true;
    setKatexReady(true);
  }, [loadSession, settings.autoSave]);

  // Auto save debounced
  useEffect(() => {
    if (!settings.autoSave) return;
    const timer = setTimeout(() => {
      saveSession(latex);
    }, 500);
    return () => clearTimeout(timer);
  }, [latex, saveSession, settings.autoSave]);

  // When auto-save is toggled ON, save current content immediately
  useEffect(() => {
    if (settings.autoSave) {
      saveSession(latex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.autoSave]);

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
      downloadBlob(blob, settings.exportFileName + '.png');
    }
  }, [settings.dpi, settings.exportFileName]);

  const handleExportSvg = useCallback(async () => {
    const previewEl = previewRef.current;
    if (!previewEl) return;
    const dataUrl = await exportAsSvg(previewEl);
    if (dataUrl) {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlob(blob, settings.exportFileName + '.svg');
    }
  }, [settings.exportFileName]);

  const handleCopyPng = useCallback(async () => {
    const previewEl = previewRef.current;
    if (!previewEl) return;
    await copyPngToClipboard(previewEl);
  }, []);

  const handleCopySvg = useCallback(async () => {
    const previewEl = previewRef.current;
    if (!previewEl) return;
    const svg = extractSvgString(previewEl);
    if (svg) {
      await copySvgToClipboard(svg);
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

  // Ctrl+S handler: save with file type selector based on filename extension
  const [showExportPicker, setShowExportPicker] = useState(false);
  useEffect(() => {
    const handler = () => {
      // Just call PNG export with a generic name — Tauri dialog shows both filters
      handleExportPng();
    };
    window.addEventListener('export-file', handler);
    return () => window.removeEventListener('export-file', handler);
  }, [handleExportPng]);

  // Divider drag logic
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const isHorizontal = settings.layout !== 'vertical';
      let pos: number;
      if (isHorizontal) {
        pos = (e.clientX - rect.left) / rect.width;
      } else {
        pos = (e.clientY - rect.top) / rect.height;
      }
      pos = Math.max(0.2, Math.min(0.8, pos));
      setSplitPos(pos);
      localStorage.setItem('latex-preview-split', String(pos));
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [settings.layout]);

  const layoutClass = settings.layout === 'vertical' ? 'layout-vertical' : 'layout-horizontal';

  return (
    <div className={`app ${layoutClass}`}>
      <Toolbar
        onLayoutToggle={handleLayoutToggle}
        layout={settings.layout}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onCopyPng={handleCopyPng}
        onCopySvg={handleCopySvg}
      />

      <SymbolBar />

      <div className="main-content">
        <div className="editor-preview-container" ref={containerRef}>
          <div className="editor-pane" style={{ flex: `${splitPos}` }}>
            <div className="pane-header">
              编辑器
              <label className="pane-toggle" title="自动保存">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => updateSettings({ autoSave: e.target.checked })}
                />
                <span>保存</span>
              </label>
            </div>
            <Editor
              value={latex}
              onChange={setLatex}
              onCursorChange={setCursorPos}
            />
          </div>

          <div className="divider" onMouseDown={handleDividerMouseDown} />

          <div className="preview-pane" style={{ flex: `${1 - splitPos}` }}>
            <div className="pane-header">
              预览
              <label className="pane-toggle" title="Markdown 模式：$$公式$$ 和 $公式$ 渲染，其余为文本">
                <input
                  type="checkbox"
                  checked={settings.markdownMode}
                  onChange={(e) => updateSettings({ markdownMode: e.target.checked })}
                />
                <span>Markdown</span>
              </label>
            </div>
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
