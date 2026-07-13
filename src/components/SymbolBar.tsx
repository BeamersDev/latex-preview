import { useState, useEffect } from 'react';
import { SYMBOL_CATEGORIES } from '@/utils/symbolDb';

const VISIBLE_CATEGORIES = [
  'greek', 'operators', 'arrows',
  'set-theory', 'matrices', 'integrals-sums',
];

export default function SymbolBar() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    console.log('SymbolBar mounted');
  }, []);

  const handleToggle = (id: string) => {
    setOpenCategory(openCategory === id ? null : id);
  };

  const handleSymbolClick = (latex: string) => {
    window.dispatchEvent(new CustomEvent('insert-latex', { detail: latex }));
  };

  const categories = SYMBOL_CATEGORIES.filter((c) =>
    VISIBLE_CATEGORIES.includes(c.id),
  );

  const openCat = openCategory
    ? categories.find((c) => c.id === openCategory)
    : null;

  return (
    <div className="symbol-bar">
      <div className="symbol-bar-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`symbol-bar-btn ${openCategory === cat.id ? 'active' : ''}`}
            onClick={() => handleToggle(cat.id)}
            title={cat.label}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {openCat && (
        <div className="symbol-bar-panel">
          {openCat.symbols.map((sym, i) => (
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
      )}
    </div>
  );
}
