import { useState, useEffect } from 'react';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { THEMES } from '@/themes';

interface ToolbarProps {
  onLayoutToggle: () => void;
  layout: 'horizontal' | 'vertical';
  onExportPng: () => void;
  onExportSvg: () => void;
  onCopyPng: () => void;
  onCopySvg: () => void;
}

export default function Toolbar({
  onLayoutToggle,
  layout,
  onExportPng,
  onExportSvg,
  onCopyPng,
  onCopySvg,
}: ToolbarProps) {
  const { themeName, setTheme } = useThemeContext();
  const { settings, updateSettings } = useSettingsContext();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showDpiModal, setShowDpiModal] = useState(false);
  const [localDpi, setLocalDpi] = useState(settings.dpi);
  const [localFileName, setLocalFileName] = useState(settings.exportFileName);

  // Close theme menu on outside click
  useEffect(() => {
    if (!showThemeMenu) return;
    const handler = () => setShowThemeMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showThemeMenu]);

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="toolbar-brand">LaTeX Preview</span>
        </div>

        <div className="toolbar-right">
          <button className="toolbar-btn" onClick={onLayoutToggle} title="切换布局">
            {layout === 'horizontal' ? '⇔ 左右' : '⇕ 上下'}
          </button>

          <div className="toolbar-separator" />

          <div className="toolbar-btn-wrapper">
            <button className="toolbar-btn" title="导出 / 复制">
              📤 导出
            </button>
            <div className="export-menu">
              <button
                className="export-menu-item"
                onClick={() => { onCopyPng(); }}
              >
                📋 复制 PNG
              </button>
              <button
                className="export-menu-item"
                onClick={() => { onCopySvg(); }}
              >
                📋 复制 SVG
              </button>
              <div className="export-menu-divider" />
              <button
                className="export-menu-item"
                onClick={() => { onExportPng(); }}
              >
                💾 导出 PNG
              </button>
              <button
                className="export-menu-item"
                onClick={() => { onExportSvg(); }}
              >
                💾 导出 SVG
              </button>
              <div className="export-menu-divider" />
              <button
                className="export-menu-item"
                onClick={() => setShowDpiModal(true)}
              >
                ⚙ 导出设置 — {settings.dpi} DPI
              </button>
            </div>
          </div>

          <div className="toolbar-separator" />

          <div className="theme-selector">
            <button
              className="toolbar-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowThemeMenu(!showThemeMenu);
              }}
              title="切换主题"
            >
              🎭 {THEMES.find((t) => t.name === themeName)?.label ?? themeName}
            </button>
            {showThemeMenu && (
              <div className="theme-menu" onClick={(e) => e.stopPropagation()}>
                {THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    className={`theme-menu-item ${theme.name === themeName ? 'active' : ''}`}
                    onClick={() => {
                      setTheme(theme.name);
                      setShowThemeMenu(false);
                    }}
                  >
                    <span className={`theme-indicator theme-indicator--${theme.type}`} />
                    {theme.label}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {showDpiModal && (
        <div className="modal-overlay" onClick={() => setShowDpiModal(false)}>
          <div className="dpi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dpi-modal-title">导出设置</div>
            <div className="dpi-modal-row">
              <label>DPI</label>
              <input
                type="range"
                min={72}
                max={600}
                step={50}
                value={localDpi}
                onChange={(e) => setLocalDpi(Number(e.target.value))}
              />
              <input
                type="number"
                min={72}
                max={600}
                value={localDpi}
                onChange={(e) => setLocalDpi(Number(e.target.value))}
                className="dpi-number-input"
              />
            </div>
            <div className="dpi-modal-row">
              <label>默认文件名</label>
              <input
                type="text"
                value={localFileName}
                onChange={(e) => setLocalFileName(e.target.value)}
                className="dpi-filename-input"
              />
            </div>
            <div className="dpi-modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDpiModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={() => {
                updateSettings({ dpi: localDpi, exportFileName: localFileName });
                setShowDpiModal(false);
              }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
