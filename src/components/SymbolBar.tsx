import { useState, useRef } from 'react';
import { SYMBOL_CATEGORIES } from '@/utils/symbolDb';

const VISIBLE_CATEGORIES = [
  'greek', 'operators', 'arrows',
  'set-theory', 'matrices', 'integrals-sums',
];

export default function SymbolBar() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpen = (id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setOpenCategory(id);
  };

  const handleClose = () => {
    timerRef.current = setTimeout(() => setOpenCategory(null), 200);
  };

  const handleSymbolClick = (latex: string) => {
    window.dispatchEvent(new CustomEvent('insert-latex', { detail: latex }));
    setOpenCategory(null);
  };

  const categories = SYMBOL_CATEGORIES.filter((c) =>
    VISIBLE_CATEGORIES.includes(c.id),
  );

  return (
    <div className="symbol-bar">
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="symbol-bar-category"
          onMouseEnter={() => handleOpen(cat.id)}
          onMouseLeave={handleClose}
        >
          <button
            className={`symbol-bar-btn ${openCategory === cat.id ? 'active' : ''}`}
            title={cat.label}
          >
            {cat.label}
          </button>
          {openCategory === cat.id && (
            <div
              className="symbol-bar-dropdown"
              onMouseEnter={() => handleOpen(cat.id)}
              onMouseLeave={handleClose}
            >
              <div className="symbol-bar-grid">
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
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
