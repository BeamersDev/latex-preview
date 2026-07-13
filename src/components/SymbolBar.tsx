import { useState, useEffect, useRef } from 'react';
import { SYMBOL_CATEGORIES } from '@/utils/symbolDb';

const VISIBLE_CATEGORIES = [
  'greek', 'operators', 'arrows',
  'set-theory', 'matrices', 'integrals-sums',
];

export default function SymbolBar() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Debug: log when mounted
  useEffect(() => {
    console.log('SymbolBar mounted', SYMBOL_CATEGORIES.length, 'categories total');
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!openCategory) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openCategory]);

  const handleToggle = (id: string) => {
    setOpenCategory(openCategory === id ? null : id);
  };

  const handleSymbolClick = (latex: string) => {
    window.dispatchEvent(new CustomEvent('insert-latex', { detail: latex }));
    setOpenCategory(null);
  };

  const categories = SYMBOL_CATEGORIES.filter((c) =>
    VISIBLE_CATEGORIES.includes(c.id),
  );

  return (
    <div className="symbol-bar" ref={barRef}>
      <div className="symbol-bar-scroll">
      {categories.map((cat) => (
        <div key={cat.id} className="symbol-bar-category">
          <button
            className={`symbol-bar-btn ${openCategory === cat.id ? 'active' : ''}`}
            onClick={() => handleToggle(cat.id)}
            title={cat.label}
          >
            {cat.label}
          </button>
          {openCategory === cat.id && (
            <div className="symbol-bar-dropdown">
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
    </div>
  );
}
