import type { EditorPosition } from '@/types';
import { useThemeContext } from '@/contexts/ThemeContext';
import { THEMES } from '@/themes';

interface StatusBarProps {
  position: EditorPosition;
  errorCount: number;
  katexLoaded: boolean;
}

export default function StatusBar({ position, errorCount, katexLoaded }: StatusBarProps) {
  const { themeName } = useThemeContext();
  const themeLabel = THEMES.find((t) => t.name === themeName)?.label ?? themeName;

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span className="statusbar-item">行 {position.line}, 列 {position.col}</span>
      </div>
      <div className="statusbar-center">
        <span className="statusbar-item">主题: {themeLabel}</span>
      </div>
      <div className="statusbar-right">
        {errorCount > 0 && (
          <span className="statusbar-item statusbar-error">
            ⚠ {errorCount} 个错误
          </span>
        )}
        <span className={`statusbar-item ${katexLoaded ? 'statusbar-ok' : ''}`}>
          {katexLoaded ? '✓ KaTeX' : '○ KaTeX'}
        </span>
      </div>
    </div>
  );
}
