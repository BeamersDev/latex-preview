import { EditorView, keymap } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { snippet, nextSnippetField, clearSnippet } from '@codemirror/autocomplete';

export { nextSnippetField, clearSnippet };

const snippetEndField = StateField.define<number | null>({
  create: () => null,
  update(val, tr) {
    for (const e of tr.effects) {
      if (e.is(setSnippetEnd)) return e.value;
    }
    if (val !== null) {
      const newPos = tr.changes.mapPos(val, -1);
      return newPos >= 0 ? newPos : null;
    }
    return val;
  },
});

const setSnippetEnd = StateEffect.define<number | null>();

const snippetTabHandler = keymap.of([
  { key: 'Tab', run: (view) => {
    if (nextSnippetField(view)) return true;
    const end = view.state.field(snippetEndField);
    if (end !== null) {
      view.dispatch({ selection: { anchor: end, head: end }, effects: setSnippetEnd.of(null), scrollIntoView: true });
      return true;
    }
    return false;
  }},
  { key: 'Shift-Tab', run: () => false },
  { key: 'Escape', run: clearSnippet },
]);

export const snippetExtension = [snippetEndField, snippetTabHandler];

export function insertSnippet(view: EditorView, template: string, from?: number, to?: number) {
  const snip = snippet(template);
  const { state, dispatch } = view;
  const f = from ?? state.selection.main.from;
  const t = to ?? state.selection.main.to;
  const outputText = template.replace(/\$\{?\d+(?::([^}]*))?\}?/g, (_m, defaultText) => defaultText ?? '');
  const endPos = f + outputText.length;
  snip({ state, dispatch }, null, f, t);
  view.dispatch({ effects: setSnippetEnd.of(endPos) });
  view.focus();
}
