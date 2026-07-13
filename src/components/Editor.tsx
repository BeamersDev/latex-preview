import { useEffect, useRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightSpecialChars,
  drawSelection,
  rectangularSelection,
} from '@codemirror/view';
import {
  closeBrackets,
  closeBracketsKeymap,
  CompletionContext,
  autocompletion,
} from '@codemirror/autocomplete';
import {
  defaultKeymap,
  history,
  historyKeymap,
} from '@codemirror/commands';
import { AUTOCOMPLETE_COMMANDS } from '@/utils/symbolDb';
import { insertSnippet, snippetExtension } from '@/utils/snippet';
import { checkLatexSyntax } from '@/utils/latex';
import type { EditorPosition } from '@/types';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (pos: EditorPosition) => void;
  className?: string;
}

// LaTeX syntax highlighting via CSS variables
const latexHighlightStyle = (fontSize: number) => EditorView.theme({
  '.cm-line': { fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace", fontSize: 'inherit' },
  '.ͼm': { color: 'var(--editor-keyword)' },
  '.ͼb': { color: 'var(--editor-number)' },
  '.ͼo': { color: 'var(--editor-operator)' },
  '.ͼs': { color: 'var(--editor-string)' },
  '.ͼc': { color: 'var(--editor-comment)' },
});

function latexCompletionSource(context: CompletionContext) {
  const word = context.matchBefore(/\\[a-zA-Z]*/);
  if (!word || !word.text) return null;

  const prefix = word.text.slice(1).toLowerCase();

  let filtered;
  if (!prefix) {
    filtered = AUTOCOMPLETE_COMMANDS;
  } else {
    filtered = AUTOCOMPLETE_COMMANDS.filter((cmd) =>
      cmd.label.slice(1).toLowerCase().startsWith(prefix),
    );
  }

  if (filtered.length === 0) return null;

  return {
    from: word.from,
    to: word.to,
    options: filtered.map((cmd) => ({
      label: cmd.label,
      detail: cmd.detail,
      apply: cmd.insert,
    })),
  };
}

export default function Editor({
  value,
  onChange,
  onCursorChange,
  className = '',
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const handleChange = useCallback(
    (v: string) => onChange(v),
    [onChange],
  );

  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        handleChange(update.state.doc.toString());
      }
      if (update.selectionSet) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        onCursorChange?.({ line: line.number, col: pos - line.from + 1 });
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightSpecialChars(),
        drawSelection(),
        rectangularSelection(),
        closeBrackets(),
        history(),
        latexHighlightStyle(16),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        updateListener,
        EditorView.lineWrapping,
        EditorView.domEventHandlers({
          keydown: (event) => {
            if (event.ctrlKey && event.key === 'm') {
              event.preventDefault();
              window.dispatchEvent(new CustomEvent('open-symbol-search'));
            }
            if (event.ctrlKey && event.key === 's') {
              event.preventDefault();
              window.dispatchEvent(new CustomEvent('export-file'));
            }
          },
        }),
        // Add autocomplete
        autocompletion({ override: [latexCompletionSource] }),
        snippetExtension,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentText = view.state.doc.toString();
    if (currentText !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentText.length,
          insert: value,
        },
      });
    }
  }, [value]);

  // Handle symbol insert events
  useEffect(() => {
    const handler = (e: Event) => {
      const latex = (e as CustomEvent<string>).detail;
      if (!latex) return;
      const view = viewRef.current;
      if (!view) return;
      const { state } = view;
      const pos = state.selection.main.head;
      
      // If inserting a \command, don't insert inside an existing \command
      let insertFrom = state.selection.main.from;
      let insertTo = state.selection.main.to;
      // Skip command detection for \begin... templates (matrix, cases, etc.)
      const isBeginTemplate = latex.startsWith('\\begin');
      if (latex.startsWith('\\') && !isBeginTemplate && insertFrom === insertTo) {
        // Check if cursor is inside a \command with arguments
        const doc = state.doc.toString();
        const before = doc.slice(Math.max(0, pos - 80), pos);
        const lastBS = before.lastIndexOf('\\');
        if (lastBS !== -1 && /^[a-zA-Z]/.test(before.slice(lastBS + 1))) {
          // Skip to end of command word
          let skip = pos;
          const afterAll = doc.slice(pos, Math.min(doc.length, pos + 80));
          const wordMatch = afterAll.match(/^[a-zA-Z]*/);
          if (wordMatch) skip += wordMatch[0].length;
          // Then skip any [...] and {...} groups attached to the command
          let rest = doc.slice(skip, Math.min(doc.length, skip + 80));
          while (/^(\[[^\]]*\]|\{[^}]*\})\s*/.test(rest)) {
            const m = rest.match(/^(\[[^\]]*\]|\{[^}]*\})\s*/);
            if (!m) break;
            skip += m[0].length;
            rest = rest.slice(m[0].length);
          }
          insertFrom = skip;
          insertTo = skip;
        }
      }
      // Syntax check: simulate insertion and validate
      const docBefore = state.doc.toString();
      const expected = docBefore.slice(0, insertFrom) + latex + docBefore.slice(insertTo);
      const syntaxErr = checkLatexSyntax(expected);
      if (syntaxErr) {
        window.dispatchEvent(new CustomEvent('syntax-warning', { detail: syntaxErr }));
        console.warn('Syntax check failed:', syntaxErr);
        return;
      }
      
      view.dispatch({
        changes: { from: insertFrom, to: insertTo, insert: latex },
        selection: { anchor: insertFrom + latex.length },
        scrollIntoView: true,
      });
      view.focus();
    };
    window.addEventListener('insert-latex', handler as EventListener);

    // Snippet insertion (with tab stops)
    const snippetHandler = (e: Event) => {
      const template = (e as CustomEvent<string>).detail;
      if (!template) return;
      const view = viewRef.current;
      if (!view) return;
      // Same \command skip logic
      const { state } = view;
      const pos = state.selection.main.head;
      let from = state.selection.main.from;
      let to = state.selection.main.to;
      if (from === to) {
        const doc = state.doc.toString();
        const before = doc.slice(Math.max(0, pos - 80), pos);
        const lastBS = before.lastIndexOf('\\');
        if (lastBS !== -1 && /^[a-zA-Z]/.test(before.slice(lastBS + 1))) {
          let skip = pos;
          const afterAll = doc.slice(pos, Math.min(doc.length, pos + 80));
          const wordMatch = afterAll.match(/^[a-zA-Z]*/);
          if (wordMatch) skip += wordMatch[0].length;
          let rest = doc.slice(skip, Math.min(doc.length, skip + 80));
          while (/^(\[[^\]]*\]|\{[^}]*\})\s*/.test(rest)) {
            const m = rest.match(/^(\[[^\]]*\]|\{[^}]*\})\s*/);
            if (!m) break;
            skip += m[0].length;
            rest = rest.slice(m[0].length);
          }
          from = skip;
          to = skip;
        }
      }
      // Syntax check for snippet insertion
      const docBefore2 = state.doc.toString();
      const expected2 = docBefore2.slice(0, from) + template.replace(/\$\{?\d+(?::([^}]*))?\}?/g, (_m, def) => def ?? '') + docBefore2.slice(to);
      const syntaxErr2 = checkLatexSyntax(expected2);
      if (syntaxErr2) {
        window.dispatchEvent(new CustomEvent('syntax-warning', { detail: syntaxErr2 }));
        return;
      }
      insertSnippet(view, template, from, to);
    };
    window.addEventListener('insert-snippet', snippetHandler as EventListener);

    return () => {
      window.removeEventListener('insert-latex', handler as EventListener);
      window.removeEventListener('insert-snippet', snippetHandler as EventListener);
    };
  }, []);

  // Focus editor when preview pane is clicked
  useEffect(() => {
    const handler = () => {
      const view = viewRef.current;
      if (view) view.focus();
    };
    window.addEventListener('focus-editor', handler);

    // Jump to specific position in the editor
    const jumpHandler = (e: Event) => {
      const pos = (e as CustomEvent<number>).detail;
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        selection: { anchor: pos, head: pos },
        scrollIntoView: true,
      });
      view.focus();
    };
    window.addEventListener('jump-to-pos', jumpHandler as EventListener);

    return () => {
      window.removeEventListener('focus-editor', handler);
      window.removeEventListener('jump-to-pos', jumpHandler as EventListener);
    };
  }, []);

  return (
    <div
      ref={editorRef}
      className={`editor-container ${className}`}
      style={{ fontSize: '16px' }}
    />
  );
}
