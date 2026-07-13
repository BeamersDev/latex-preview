import { useState } from 'react';
import { SYMBOL_CATEGORIES } from '@/utils/symbolDb';

const VISIBLE_CATEGORIES = [
  'greek', 'operators', 'arrows',
  'set-theory', 'matrices', 'integrals-sums',
];

export default function SymbolBar() {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const handleToggle = (id: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSymbolClick = (latex: string) => {
    window.dispatchEvent(new CustomEvent('insert-latex', { detail: latex }));
  };

  const categories = SYMBOL_CATEGORIES.filter((c) =>
    VISIBLE_CATEGORIES.includes(c.id),
  );

  return (
    <div className="symbol-bar">
      <div className="symbol-bar-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`symbol-bar-btn ${openCategories.has(cat.id) ? 'active' : ''}`}
            onClick={() => handleToggle(cat.id)}
            title={cat.label}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {categories
        .filter((cat) => openCategories.has(cat.id))
        .map((cat) => (
          <div key={cat.id} className="symbol-bar-panel">
            {cat.symbols.map((sym, i) => (
              <button
                key={`${sym.latex}-${i}`}
                className="symbol-bar-item"
                onClick={() => handleSymbolClick(sym.latex)}
                title={`${sym.label} — ${sym.latex}`}
              >
                {sym.label}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
