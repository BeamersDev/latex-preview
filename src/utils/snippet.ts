import { EditorView } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { snippet, nextSnippetField, clearSnippet } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';

export { nextSnippetField, clearSnippet };

/** Store the end position of the last snippet insertion. */
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

/** Custom Tab handler: snippet field → final field → end of snippet. */
const snippetTabHandler = keymap.of([
  {
    key: 'Tab',
    run: (view) => {
      // If snippet has next field, go there
      if (nextSnippetField(view)) return true;
      // No more fields: jump to end of snippet
      const end = view.state.field(snippetEndField);
      if (end !== null) {
        view.dispatch({
          selection: { anchor: end, head: end },
          effects: setSnippetEnd.of(null),
          scrollIntoView: true,
        });
        return true;
      }
      return false;
    },
  },
  {
    key: 'Shift-Tab',
    run: () => false,
  },
  {
    key: 'Escape',
    run: clearSnippet,
  },
]);

/** Full snippet extension: state field + keymap. */
export const snippetExtension = [snippetEndField, snippetTabHandler];

/**
 * Insert a snippet template at cursor or specified position.
 */
export function insertSnippet(view: EditorView, template: string, from?: number, to?: number) {
  const snip = snippet(template);
  const { state, dispatch } = view;
  const f = from ?? state.selection.main.from;
  const t = to ?? state.selection.main.to;
  // Calculate actual output length: remove field markers, keep default text
  const outputText = template.replace(/\$\{?\d+(?::([^}]*))?\}?/g, (_m, defaultText) => defaultText ?? '');
  const endPos = f + outputText.length;
  snip({ state, dispatch }, null, f, t);
  // Mark snippet end so Tab after last field jumps here
  view.dispatch({ effects: setSnippetEnd.of(endPos) });
  view.focus();
}
