import { EditorView } from '@codemirror/view';
import { snippet } from '@codemirror/autocomplete';

/**
 * Insert a snippet template (with $1, $2 tab stops) at cursor.
 */
export function insertSnippet(view: EditorView, template: string) {
  const snip = snippet(template);
  snip(view);
}
