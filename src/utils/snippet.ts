import { StateField, StateEffect } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

/** Tab-stop state: list of positions to jump through */
export interface TabStop {
  from: number;
  to: number;
  head: number;
}

export const setTabStops = StateEffect.define<TabStop[]>();
export const advanceTabStop = StateEffect.define<1>();

export const tabStopState = StateField.define<TabStop[]>({
  create: () => [],
  update(stops, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTabStops)) return effect.value;
      if (effect.is(advanceTabStop)) {
        if (stops.length === 0) return stops;
        // Remove first stop (current one was just used)
        return stops.slice(1);
      }
    }
    // Remap positions through document changes
    return stops
      .map((s) => ({
        from: tr.changes.mapPos(s.from),
        to: tr.changes.mapPos(s.to),
        head: tr.changes.mapPos(s.head),
      }))
      .filter((s) => s.from >= 0);
  },
});

/** Insert a snippet with numbered tab stops ($1, $2, ...). */
export function insertSnippet(view: EditorView, template: string) {
  // Parse template: ${N} or $N → tab stops
  const stops: TabStop[] = [];
  // Track start of selection for insertion
  const { from } = view.state.selection.main;

  // Replace $1, $2 or ${1}, ${2} with empty, record positions
  let result = template;
  const regex = /\$\{?(\d+)\}?/g;
  let match;
  let offset = 0;
  const prevStops: { num: number; from: number; to: number }[] = [];

  while ((match = regex.exec(template)) !== null) {
    const num = parseInt(match[1], 10);
    const matchLen = match[0].length;
    const pos = match.index;
    prevStops.push({ num, from: pos, to: pos + matchLen });
  }

  // Build replacement: remove $N markers from the template
  result = template.replace(regex, '');

  // Compute actual positions after replacement
  // Each replacement shortens by matchLen
  let totalOffset = 0;
  let sortedStops = [...prevStops].sort((a, b) => a.num - b.num);

  for (const ps of sortedStops) {
    const actualFrom = from + ps.from - totalOffset;
    const actualTo = actualFrom; // empty after replacement
    stops.push({
      from: actualFrom,
      to: actualTo,
      head: actualFrom,
    });
    totalOffset += ps.to - ps.from;
  }

  // Dispatch: insert the cleaned text, set first tab stop as selection
  view.dispatch({
    changes: { from, to: view.state.selection.main.to, insert: result },
    selection:
      stops.length > 0
        ? { anchor: stops[0].from, head: stops[0].head }
        : { anchor: from + result.length },
    effects: setTabStops.of(stops.length > 1 ? stops.slice(1) : []),
    scrollIntoView: true,
  });

  view.focus();
}

/** Tab key handler: jump to next tab stop */
export function tabStopKeymap() {
  return keymap.of([
    {
      key: 'Tab',
      run: (view) => {
        const stops = view.state.field(tabStopState);
        if (stops.length === 0) return false;
        const next = stops[0];
        view.dispatch({
          selection: { anchor: next.from, head: next.head },
          effects: advanceTabStop.of(1),
          scrollIntoView: true,
        });
        return true;
      },
    },
    {
      key: 'Shift-Tab',
      run: (view) => {
        const stops = view.state.field(tabStopState);
        if (stops.length === 0) return false;
        // Go to previous: pop from front and move to end
        const next = stops[0];
        view.dispatch({
          selection: { anchor: next.from, head: next.head },
          effects: setTabStops.of([...stops.slice(1), stops[0]]),
          scrollIntoView: true,
        });
        return true;
      },
    },
  ]);
}
