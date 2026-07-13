import { EditorView } from '@codemirror/view';
import { snippet, nextSnippetField, clearSnippet } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';

export { nextSnippetField, clearSnippet };

/** Tab/Shift-Tab/Escape handling for snippet tab-stop navigation. */
export const snippetExtension = keymap.of([
  { key: 'Tab', run: nextSnippetField },
  { key: 'Shift-Tab', run: () => false },
  { key: 'Escape', run: clearSnippet },
]);

/**
 * Insert a snippet template at cursor or specified position.
 */
export function insertSnippet(view: EditorView, template: string, from?: number, to?: number) {
  const snip = snippet(template);
  const { state, dispatch } = view;
  snip(
    { state, dispatch },
    null,
    from ?? state.selection.main.from,
    to ?? state.selection.main.to,
  );
  view.focus();
}
