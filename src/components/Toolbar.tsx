import { useState, useEffect } from 'react';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { THEMES } from '@/themes';

interface ToolbarProps {
  onLayoutToggle: () => void;
  layout: 'horizontal' | 'vertical';
  onExportPng: () => void;
  onExportSvg: () => void;
}

export default function Toolbar({ onLayoutToggle, layout, onExportPng, onExportSvg }: ToolbarProps) {
  const { themeName, setTheme } = useThemeContext();
  const { settings, updateSettings, resetSettings } = useSettingsContext();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [localSettings, setLocalSettings] = useState({ ...settings });

  // Close theme menu on outside click
  useEffect(() => {
    if (!showThemeMenu) return;
    const handler = () => setShowThemeMenu(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showThemeMenu]);

  const handleSaveSettings = () => {
    updateSettings(localSettings);
    setShowSettingsModal(false);
  };

  const handleResetSettings = () => {
    resetSettings();
    setLocalSettings({ ...settings });
    setShowSettingsModal(false);
  };

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <span className="toolbar-brand">LaTeX Preview</span>
        </div>
        <div className="toolbar-center">
          <button className="toolbar-btn" onClick={onLayoutToggle} title="切换布局">
            {layout === 'horizontal' ? '⇔ 左右' : '⇕ 上下'}
          </button>

          <div className="toolbar-separator" />

          <button className="toolbar-btn" onClick={onExportPng} title="导出为 PNG">
            📷 PNG
          </button>
          <button className="toolbar-btn" onClick={onExportSvg} title="导出为 SVG">
            🎨 SVG
          </button>

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
        <div className="toolbar-right">
          <button
            className="toolbar-btn"
            onClick={() => {
              setLocalSettings({ ...settings });
              setShowSettingsModal(true);
            }}
            title="设置"
          >
            ⚙ 设置
          </button>
          {!settings.autoSave && (
            <span className="toolbar-warning">自动保存已关闭</span>
          )}
        </div>
      </div>

      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>设置</h2>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="settings-group">
                <label className="settings-label">
                  编辑器字号
                  <input
                    type="number"
                    min={10}
                    max={32}
                    value={localSettings.fontSize}
                    onChange={(e) => setLocalSettings({ ...localSettings, fontSize: Number(e.target.value) })}
                  />
                  px
                </label>
              </div>

              <div className="settings-group">
                <label className="settings-label">
                  导出 DPI
                  <input
                    type="number"
                    min={72}
                    max={600}
                    step={50}
                    value={localSettings.dpi}
                    onChange={(e) => setLocalSettings({ ...localSettings, dpi: Number(e.target.value) })}
                  />
                </label>
              </div>

              <div className="settings-group">
                <label className="settings-label settings-label--checkbox">
                  <input
                    type="checkbox"
                    checked={localSettings.autoSave}
                    onChange={(e) => setLocalSettings({ ...localSettings, autoSave: e.target.checked })}
                  />
                  自动保存编辑器内容
                </label>
              </div>

              <div className="settings-group">
                <label className="settings-label settings-label--checkbox">
                  <input
                    type="checkbox"
                    checked={localSettings.followSystemTheme}
                    onChange={(e) => setLocalSettings({ ...localSettings, followSystemTheme: e.target.checked })}
                  />
                  跟随系统主题
                </label>
              </div>

              <div className="settings-group">
                <label className="settings-label">
                  布局
                  <select
                    value={localSettings.layout}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, layout: e.target.value as 'horizontal' | 'vertical' })
                    }
                  >
                    <option value="horizontal">左右分栏</option>
                    <option value="vertical">上下分栏</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleResetSettings}>重置为默认</button>
              <button className="btn btn-primary" onClick={handleSaveSettings}>保存</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
