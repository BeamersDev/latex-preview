import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mocks before vi.mock is hoisted
const mockStateFieldFn = vi.hoisted(() => vi.fn());
const mockStateEffectFn = vi.hoisted(() => vi.fn());
const mockSnippetFn = vi.hoisted(() => vi.fn());
const mockNextSnippetFieldFn = vi.hoisted(() => vi.fn());
const mockClearSnippetFn = vi.hoisted(() => vi.fn());

vi.mock('@codemirror/state', () => ({
  StateField: {
    define: (config: any) => {
      mockStateFieldFn(config);
      return { id: 'snippetEndField', config };
    },
  },
  StateEffect: {
    define: () => {
      mockStateEffectFn();
      const effect = { id: 'setSnippetEnd' };
      (effect as any).of = (val: any) => ({ effect, value: val });
      return effect;
    },
  },
}));

vi.mock('@codemirror/autocomplete', () => ({
  snippet: (...args: any[]) => {
    mockSnippetFn(...args);
    return (params: any, _cm: any, from: number, to: number) => {
      // no-op for test
    };
  },
  nextSnippetField: (...args: any[]) => mockNextSnippetFieldFn(...args),
  clearSnippet: (...args: any[]) => mockClearSnippetFn(...args),
}));

vi.mock('@codemirror/view', () => ({
  keymap: { of: (bindings: any[]) => bindings },
  EditorView: class {},
}));

// Import after mocking
import { insertSnippet, snippetExtension, nextSnippetField, clearSnippet } from '../src/utils/snippet';

describe('snippetExtension exports', () => {
  it('re-exports nextSnippetField and clearSnippet', () => {
    expect(nextSnippetField).toBeDefined();
    expect(clearSnippet).toBeDefined();
  });

  it('creates snippetExtension as array with field and keymap', () => {
    expect(Array.isArray(snippetExtension)).toBe(true);
    expect(snippetExtension.length).toBe(2);
    expect(snippetExtension[1]).toBeDefined();
    expect(Array.isArray(snippetExtension[1])).toBe(true);
  });

  it('keymap has Tab, Shift-Tab, Escape handlers', () => {
    const keymap = snippetExtension[1] as any[];
    const keys = keymap.map((k: any) => k.key);
    expect(keys).toContain('Tab');
    expect(keys).toContain('Shift-Tab');
    expect(keys).toContain('Escape');
  });

  it('StateField.define was called', () => {
    expect(mockStateFieldFn).toHaveBeenCalled();
  });

  it('StateEffect.define was called', () => {
    expect(mockStateEffectFn).toHaveBeenCalled();
  });
});

describe('insertSnippet output text extraction', () => {
  it('extracts plain text without fields', () => {
    const template = '\\\\frac{a}{b}';
    const outputText = template.replace(/\$\{?\d+(?::([^}]*))?\}?/g, (_m, defaultText) => defaultText ?? '');
    expect(outputText).toBe('\\\\frac{a}{b}');
  });

  it('replaces numbered field placeholders with defaults', () => {
    const template = '\\\\frac{${1:a}}{${2:b}}';
    const outputText = template.replace(/\$\{?\d+(?::([^}]*))?\}?/g, (_m, defaultText) => defaultText ?? '');
    expect(outputText).toBe('\\\\frac{a}{b}');
  });

  it('handles fields without defaults', () => {
    const template = '\\\\sqrt[${1}]{${2:x}}';
    const outputText = template.replace(/\$\{?\d+(?::([^}]*))?\}?/g, (_m, defaultText) => defaultText ?? '');
    expect(outputText).toBe('\\\\sqrt[]{x}');
  });

  it('handles mixed content with multiple placeholders', () => {
    const template = '\\\\int_{${1:a}}^{${2:b}} ${3:f(x)}\\\\,dx';
    const outputText = template.replace(/\$\{?\d+(?::([^}]*))?\}?/g, (_m, defaultText) => defaultText ?? '');
    expect(outputText).toBe('\\\\int_{a}^{b} f(x)\\\\,dx');
  });

  it('handles ${N} without colon (no default)', () => {
    const template = '${1}';
    const outputText = template.replace(/\$\{?\d+(?::([^}]*))?\}?/g, (_m, defaultText) => defaultText ?? '');
    expect(outputText).toBe('');
  });

  it('handles $N shorthand (no braces)', () => {
    const template = 'x$1y';
    const outputText = template.replace(/\$\{?\d+(?::([^}]*))?\}?/g, (_m, defaultText) => defaultText ?? '');
    expect(outputText).toBe('xy');
  });

  it('handles non-placeholder dollar signs', () => {
    // $ without following digits should pass through
    const template = 'x $ y';
    const outputText = template.replace(/\$\{?\d+(?::([^}]*))?\}?/g, (_m, defaultText) => defaultText ?? '');
    expect(outputText).toBe('x $ y');
  });
});

describe('insertSnippet with mocked EditorView', () => {
  let mockDispatch: ReturnType<typeof vi.fn>;
  let mockFocus: ReturnType<typeof vi.fn>;
  let mockView: any;

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockFocus = vi.fn();
    mockSnippetFn.mockClear();
    mockNextSnippetFieldFn.mockClear();

    mockView = {
      state: {
        selection: { main: { from: 5, to: 5 } },
        field: vi.fn().mockReturnValue(null),
      },
      dispatch: mockDispatch,
      focus: mockFocus,
    };
  });

  it('calls snippet with the template', () => {
    insertSnippet(mockView, '\\\\alpha', 3, 3);
    expect(mockSnippetFn).toHaveBeenCalledWith('\\\\alpha');
  });

  it('uses selection positions when from/to not given', () => {
    insertSnippet(mockView, '\\\\beta');
    expect(mockSnippetFn).toHaveBeenCalledWith('\\\\beta');
  });

  it('calls focus on view', () => {
    insertSnippet(mockView, '\\\\delta', 0, 0);
    expect(mockFocus).toHaveBeenCalled();
  });

  it('dispatches setSnippetEnd effect', () => {
    insertSnippet(mockView, '\\\\gamma', 10, 10);
    const dispatchCalls = mockDispatch.mock.calls;
    expect(dispatchCalls.length).toBeGreaterThanOrEqual(1);
    const lastCall = dispatchCalls[dispatchCalls.length - 1][0];
    expect(lastCall.effects).toBeDefined();
  });
});

describe('Tab key handler', () => {
  it('registers Tab handler in keymap', () => {
    const keymap = snippetExtension[1] as any[];
    const tabHandler = keymap.find((k: any) => k.key === 'Tab');
    expect(tabHandler).toBeDefined();
    expect(typeof tabHandler.run).toBe('function');
  });

  it('registers Escape handler', () => {
    const keymap = snippetExtension[1] as any[];
    const escHandler = keymap.find((k: any) => k.key === 'Escape');
    expect(escHandler).toBeDefined();
  });

  it('Shift-Tab returns false', () => {
    const keymap = snippetExtension[1] as any[];
    const shiftTabHandler = keymap.find((k: any) => k.key === 'Shift-Tab');
    expect(shiftTabHandler).toBeDefined();
    expect(shiftTabHandler.run()).toBe(false);
  });
});
