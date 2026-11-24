import { useMemo, useRef, type KeyboardEvent } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { tags as t } from '@lezer/highlight';
import type { Language } from '../content/schema';

const theme = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--bg-1)', color: 'var(--text)', fontSize: '14px' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
    '.cm-content': { padding: '12px 0', caretColor: 'var(--cyan)' },
    '.cm-gutters': { backgroundColor: 'var(--bg-1)', color: 'var(--text-dim)', border: 'none', borderRight: '2px solid var(--line)' },
    '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--bg-2) 70%, transparent)' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--bg-2)', color: 'var(--text)' },
    '.cm-cursor, .cm-dropCursor': { borderLeft: '2px solid var(--cyan)' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'color-mix(in srgb, var(--magenta) 30%, transparent) !important',
    },
    '.cm-matchingBracket': { backgroundColor: 'var(--bg-2)', outline: '1px solid var(--cyan-deep)' },
    '.cm-tooltip': { backgroundColor: 'var(--bg-2)', border: '2px solid var(--line)', color: 'var(--text)' },
    '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: 'var(--line)', color: 'var(--text)' },
  },
  { dark: true },
);

const highlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.moduleKeyword], color: 'var(--magenta)' },
    { tag: [t.string, t.special(t.string)], color: 'var(--green)' },
    { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--amber)' },
    { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--text-dim)', fontStyle: 'italic' },
    { tag: [t.function(t.variableName), t.function(t.definition(t.variableName)), t.function(t.propertyName)], color: 'var(--cyan)' },
    { tag: [t.typeName, t.className, t.definition(t.typeName)], color: 'var(--violet)' },
    { tag: [t.self, t.special(t.variableName)], color: 'var(--violet)' },
    { tag: [t.operator, t.punctuation, t.bracket], color: 'var(--text-dim)' },
  ]),
);

export function Editor({
  value,
  language,
  onChange,
  onRun,
  readOnly = false,
  label,
  describedBy,
}: {
  value: string;
  language: Language;
  onChange?: (code: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
  label: string;
  /** Id of the element that explains the editor keys (Escape then Tab leaves, Mod+Enter runs). */
  describedBy?: string;
}) {
  // Keep the latest callback in a ref so the extensions never have to be rebuilt.
  const runRef = useRef(onRun);
  runRef.current = onRun;

  // Mod+Enter is caught in the capture phase, before CodeMirror sees it: on Android Chrome
  // CodeMirror re-dispatches Enter without its modifiers, so a Mod-Enter keymap never fires.
  const viewRef = useRef<EditorView | null>(null);
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    // Tab indents inside the editor, so keyboard users leave it with Escape then Tab. CodeMirror
    // only arms that when nothing else claims the Escape (closing autocomplete, which opens while
    // typing, claims it), so arm it here, before CodeMirror sees the key, and let the key go on.
    if (event.key === 'Escape') {
      viewRef.current?.setTabFocusMode(2000);
      return;
    }
    if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    runRef.current?.();
  };

  const extensions = useMemo(
    () => [
      language === 'python' ? python() : javascript({ typescript: true }),
      theme,
      highlight,
      EditorView.lineWrapping,
      EditorView.contentAttributes.of(describedBy ? { 'aria-label': label, 'aria-describedby': describedBy } : { 'aria-label': label }),
    ],
    [language, label, describedBy],
  );

  return (
    <div data-testid="code-editor" data-readonly={readOnly || undefined} onKeyDownCapture={onKeyDownCapture}>
    <CodeMirror
      value={value}
      onChange={onChange}
      onCreateEditor={(view) => {
        viewRef.current = view;
      }}
      extensions={extensions}
      readOnly={readOnly}
      editable={!readOnly}
      theme="none"
      minHeight="240px"
      maxHeight="520px"
      basicSetup={{ foldGutter: false, highlightActiveLine: !readOnly, highlightActiveLineGutter: !readOnly, autocompletion: true }}
    />
    </div>
  );
}

export default Editor;
