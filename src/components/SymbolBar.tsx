import { useState, useEffect, useRef } from 'react';
import { SYMBOL_CATEGORIES } from '@/utils/symbolDb';

const VISIBLE_CATEGORIES = [
  'greek', 'operators', 'arrows',
  'set-theory', 'matrices', 'integrals-sums',
];

export default function SymbolBar() {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    console.log('SymbolBar mounted', SYMBOL_CATEGORIES.length, 'categories total');
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!openCategory) return;
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenCategory(null);
        setMenuPos(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openCategory]);

  const handleToggle = (id: string) => {
    if (openCategory === id) {
      setOpenCategory(null);
      setMenuPos(null);
    } else {
      setOpenCategory(id);
      const btn = btnRefs.current.get(id);
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + 4, left: rect.left });
      }
    }
  };

  const handleSymbolClick = (latex: string) => {
    window.dispatchEvent(new CustomEvent('insert-latex', { detail: latex }));
    setOpenCategory(null);
    setMenuPos(null);
  };

  const categories = SYMBOL_CATEGORIES.filter((c) =>
    VISIBLE_CATEGORIES.includes(c.id),
  );

  const openCat = openCategory ? categories.find((c) => c.id === openCategory) : null;

  return (
    <div className="symbol-bar" ref={barRef}>
      <div className="symbol-bar-scroll">
        {categories.map((cat) => (
          <button
            key={cat.id}
            ref={(el) => {
              if (el) btnRefs.current.set(cat.id, el);
              else btnRefs.current.delete(cat.id);
            }}
            className={`symbol-bar-btn ${openCategory === cat.id ? 'active' : ''}`}
            onClick={() => handleToggle(cat.id)}
            title={cat.label}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Dropdown rendered outside scroll container via fixed positioning */}
      {openCategory && openCat && menuPos && (
        <div
          className="symbol-bar-dropdown"
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
        >
          <div className="symbol-bar-grid">
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
        </div>
      )}
    </div>
  );
}
