import { EditorView } from '@codemirror/view';
import { snippet, nextSnippetField, clearSnippet } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';

export { nextSnippetField, clearSnippet };

/** Tab/Shift-Tab/Escape handling for snippet tab-stop navigation. */
export const snippetExtension = keymap.of([
  { key: 'Tab', run: nextSnippetField },
  { key: 'Shift-Tab', run: () => false }, // will be handled by prevSnippetField if active
  { key: 'Escape', run: clearSnippet },
]);

/**
 * Insert a snippet template (with $1, $2 tab stops) at cursor.
 */
export function insertSnippet(view: EditorView, template: string) {
  const snip = snippet(template);
  const { state, dispatch } = view;
  snip({ state, dispatch }, null, state.selection.main.from, state.selection.main.to);
}
