import { useState } from 'react';
import { SYMBOL_CATEGORIES } from '@/utils/symbolDb';

interface SymbolPanelProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function SymbolPanel({ collapsed, onToggle }: SymbolPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>(SYMBOL_CATEGORIES[0]?.id ?? '');

  const handleSymbolClick = (latex: string) => {
    window.dispatchEvent(new CustomEvent('insert-latex', { detail: latex }));
  };

  if (collapsed) {
    return (
      <div className="symbol-panel symbol-panel--collapsed">
        <button className="symbol-toggle" onClick={onToggle} title="展开符号面板">
          ≡
        </button>
      </div>
    );
  }

  const currentCategory = SYMBOL_CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div className="symbol-panel">
      <div className="symbol-panel-header">
        <span className="symbol-panel-title">符号</span>
        <button className="symbol-toggle" onClick={onToggle} title="收起符号面板">
          ✕
        </button>
      </div>

      <div className="symbol-categories">
        {SYMBOL_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`symbol-category-btn ${cat.id === activeCategory ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
            title={cat.label}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="symbol-grid">
        {currentCategory?.symbols.map((sym, i) => (
          <button
            key={`${sym.latex}-${i}`}
            className="symbol-btn"
            onClick={() => handleSymbolClick(sym.latex)}
            title={`${sym.label} — ${sym.latex}`}
          >
            {sym.label}
          </button>
        ))}
      </div>
    </div>
  );
}
