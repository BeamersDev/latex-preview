import { useState, useEffect, useRef, useCallback } from 'react';
import { searchSymbols, getAllSymbols } from '@/utils/symbolDb';
import type { SymbolItem } from '@/types';

export default function SymbolSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SymbolItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const performSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults(getAllSymbols().slice(0, 20));
    } else {
      setResults(searchSymbols(q));
    }
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-symbol-search', handler);
    return () => window.removeEventListener('open-symbol-search', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      performSearch('');
    }
  }, [open, performSearch]);

  const insertSymbol = useCallback((latex: string) => {
    window.dispatchEvent(new CustomEvent('insert-latex', { detail: latex }));
    setOpen(false);
    setQuery('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        insertSymbol(results[selectedIndex].latex);
        return;
      }
    },
    [results, selectedIndex, insertSymbol],
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div className="symbol-search-overlay" onClick={() => setOpen(false)}>
      <div className="symbol-search-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="symbol-search-header">
          <input
            ref={inputRef}
            type="text"
            className="symbol-search-input"
            placeholder="搜索符号... (输入名称或 LaTeX 命令)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              performSearch(e.target.value);
            }}
            onKeyDown={handleKeyDown}
          />
          <button className="symbol-search-close" onClick={() => setOpen(false)}>
            ✕
          </button>
        </div>
        <div className="symbol-search-results" ref={listRef}>
          {results.length === 0 ? (
            <div className="symbol-search-empty">未找到匹配的符号</div>
          ) : (
            results.map((sym, i) => (
              <button
                key={`${sym.latex}-${i}`}
                className={`symbol-search-item ${i === selectedIndex ? 'selected' : ''}`}
                onClick={() => insertSymbol(sym.latex)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="symbol-search-item-label">{sym.label}</span>
                <code className="symbol-search-item-latex">{sym.latex}</code>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
