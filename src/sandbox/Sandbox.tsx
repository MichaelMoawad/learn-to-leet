import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import type { Language, LeetPose, Lesson } from '../content/schema';
import { useStore } from '../app/store';
import { Button3D } from '../ui/Button3D';
import { ProblemCard } from '../lesson/ProblemCard';
import { LeetBubble } from '../mascot/LeetBubble';
import { Markdown } from '../ui/Markdown';
import { Editor } from './Editor';
import { TestList } from './TestList';
import { pendingResults } from './compare';
import { getRunner, type RunnerStatus } from './runner';
import type { ErrorInfo, RunSummary, TestResult } from './protocol';

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'python', label: 'Python' },
  { id: 'typescript', label: 'JS / TS' },
];

const DRAFT_DEBOUNCE_MS = 500;

// "The first failing run in a session" shows Leet's oops bubble. A session is one page visit.
let oopsShownThisSession = false;

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function useRunnerStatus(language: Language): RunnerStatus {
  const runner = getRunner(language);
  return useSyncExternalStore(runner.subscribe, runner.getStatus, runner.getStatus);
}

/** Real load progress jumps in big stages, so ease towards 90% while loading to show movement. */
function useEasedProgress(status: RunnerStatus): number {
  const loading = status.state === 'loading';
  const [creep, setCreep] = useState(0);
  useEffect(() => {
    if (!loading) {
      setCreep(0);
      return;
    }
    const start = performance.now();
    const id = setInterval(() => setCreep(0.9 * (1 - Math.exp(-(performance.now() - start) / 3500))), 150);
    return () => clearInterval(id);
  }, [loading]);
  return loading ? Math.max(status.progress, creep) : status.progress;
}

function oopsLine(summary: RunSummary): string {
  if (summary.compileError) return 'That did not run yet. Check the line I flagged and try again.';
  if (summary.results.some((r) => r.status === 'timeout')) return 'That one ran forever. Look for a loop that never stops.';
  return 'Not quite. Open a red test to compare what you returned with what was expected.';
}

/** `problemButton` is off on the phone challenge step, where the text above the pane already shows the problem. */
export function Sandbox({ lesson, problemButton = true }: { lesson: Lesson; problemButton?: boolean }) {
  // Remount per lesson so every piece of local state starts clean.
  return <SandboxInner key={lesson.slug} lesson={lesson} problemButton={problemButton} />;
}

function SandboxInner({ lesson, problemButton }: { lesson: Lesson; problemButton: boolean }) {
  const { slug, challenge } = lesson;
  const language = useStore((s) => s.prefs.language);
  const setLanguage = useStore((s) => s.setLanguage);
  const setDraft = useStore((s) => s.setDraft);
  const clearDraft = useStore((s) => s.clearDraft);
  const markSolved = useStore((s) => s.markSolved);
  const solved = useStore((s) => Object.values(s.progress[slug]?.solved ?? {}).some(Boolean));

  const [code, setCode] = useState<Record<Language, string>>(() => {
    const drafts = useStore.getState().drafts[slug] ?? {};
    return {
      python: drafts.python ?? challenge.starter.python,
      typescript: drafts.typescript ?? challenge.starter.typescript,
    };
  });
  const [results, setResults] = useState<Record<Language, TestResult[]>>(() => ({
    python: pendingResults(challenge.tests),
    typescript: pendingResults(challenge.tests),
  }));
  const [compileError, setCompileError] = useState<Partial<Record<Language, ErrorInfo>>>({});
  const [running, setRunning] = useState(false);
  const [bubble, setBubble] = useState<{ pose: LeetPose; says: string } | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [view, setView] = useState<'code' | 'solution'>('code');
  const [confirm, setConfirm] = useState<null | 'solution' | 'reset'>(null);
  const [showProblem, setShowProblem] = useState(false);

  const pyStatus = useRunnerStatus('python');
  const progress = useEasedProgress(pyStatus);

  // ---------- warm-up (SPEC 4.3) ----------
  // Lazy: nothing loads when the sandbox mounts. The runtime for the selected language starts on
  // the first focus of the editor, or on Run (run() warms too), whichever comes first.
  const warmOnFocus = () => {
    const runner = getRunner(language);
    if (runner.getStatus().state === 'idle') void runner.warm().catch(() => {});
  };

  // ---------- drafts, debounced 500ms ----------
  const timers = useRef<Partial<Record<Language, ReturnType<typeof setTimeout>>>>({});
  const pending = useRef<Partial<Record<Language, string>>>({});
  const flush = useCallback(
    (lang: Language) => {
      clearTimeout(timers.current[lang]);
      const value = pending.current[lang];
      if (value !== undefined) setDraft(slug, lang, value);
      delete pending.current[lang];
    },
    [slug, setDraft],
  );
  useEffect(
    () => () => {
      flush('python');
      flush('typescript');
    },
    [flush],
  );

  const onChange = (value: string) => {
    const lang = language;
    setCode((c) => ({ ...c, [lang]: value }));
    pending.current[lang] = value;
    clearTimeout(timers.current[lang]);
    timers.current[lang] = setTimeout(() => flush(lang), DRAFT_DEBOUNCE_MS);
  };

  // ---------- actions ----------
  const run = async () => {
    if (running || view === 'solution') return;
    const lang = language;
    setRunning(true);
    setConfirm(null);
    setBubble((b) => (b?.pose === 'hint' ? b : null));
    setCompileError((e) => ({ ...e, [lang]: undefined }));
    try {
      const summary = await getRunner(lang).run(code[lang], challenge, (r) => setResults((all) => ({ ...all, [lang]: r })));
      setCompileError((e) => ({ ...e, [lang]: summary.compileError }));
      if (!summary.compileError && summary.passed === summary.total) {
        markSolved(slug, lang);
        setBubble({ pose: 'cheer', says: `All ${summary.total} tests pass. That is ${lesson.title} solved, nice work.` });
      } else if (!oopsShownThisSession) {
        oopsShownThisSession = true;
        setBubble({ pose: 'oops', says: oopsLine(summary) });
      }
    } catch {
      // A failed load shows through the runner status (Retry panel).
    } finally {
      setRunning(false);
    }
  };

  const showHint = () => {
    const next = Math.min(hintsShown + 1, challenge.hints.length);
    setHintsShown(next);
    setBubble({ pose: 'hint', says: challenge.hints[next - 1] });
  };

  const askSolution = () => (solved ? setView('solution') : setConfirm('solution'));

  const reset = () => {
    const lang = language;
    clearTimeout(timers.current[lang]);
    delete pending.current[lang];
    clearDraft(slug, lang);
    setCode((c) => ({ ...c, [lang]: challenge.starter[lang] }));
    setResults((r) => ({ ...r, [lang]: pendingResults(challenge.tests) }));
    setCompileError((e) => ({ ...e, [lang]: undefined }));
    setConfirm(null);
  };

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = language === 'python' ? 'typescript' : 'python';
    setLanguage(next);
    document.getElementById(`sandbox-tab-${next}`)?.focus();
  };

  const pyLoading = language === 'python' && pyStatus.state === 'loading';
  const pyFailed = language === 'python' && pyStatus.state === 'error';
  const err = compileError[language];
  const viewingSolution = view === 'solution';
  const allHintsShown = hintsShown >= challenge.hints.length;

  return (
    <div className="grid gap-4" data-testid="sandbox">
      {/* Top row: language tabs, Problem, Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Language" className="flex gap-1" onKeyDown={onTabKey}>
          {LANGUAGES.map((l) => {
            const selected = l.id === language;
            return (
              <button
                key={l.id}
                id={`sandbox-tab-${l.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls="sandbox-editor"
                tabIndex={selected ? 0 : -1}
                onClick={() => setLanguage(l.id)}
                className={`h-9 border-2 px-4 font-label text-xs tracking-[0.12em] uppercase ${
                  selected ? 'border-cyan bg-bg-2 text-cyan' : 'border-line bg-bg-1 text-text-dim hover:text-text'
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          {problemButton && (
            <Button3D variant="secondary" size="sm" type="button" aria-expanded={showProblem} aria-controls="sandbox-problem" onClick={() => setShowProblem((s) => !s)}>
              Problem
            </Button3D>
          )}
          <Button3D variant="ghost" size="sm" type="button" onClick={() => setConfirm('reset')} disabled={viewingSolution || running}>
            Reset
          </Button3D>
        </div>
      </div>

      {problemButton && showProblem && (
        <div id="sandbox-problem">
          <ProblemCard problem={lesson.problem} />
        </div>
      )}

      {confirm && (
        <div className="pixel-corners flex flex-wrap items-center gap-3 border-2 border-amber bg-bg-1 p-3" role="alertdialog" aria-label="Confirm">
          <p className="min-w-0 flex-1 text-sm">
            {confirm === 'solution'
              ? 'Peek at the reference solution? Your own code stays exactly as it is.'
              : `Replace your ${language === 'python' ? 'Python' : 'JS / TS'} code with the starter? This cannot be undone.`}
          </p>
          <div className="flex gap-2">
            <Button3D
              variant={confirm === 'reset' ? 'secondary' : 'primary'}
              size="sm"
              type="button"
              onClick={() => {
                if (confirm === 'reset') reset();
                else {
                  setView('solution');
                  setConfirm(null);
                }
              }}
            >
              {confirm === 'solution' ? 'Show solution' : 'Reset code'}
            </Button3D>
            <Button3D variant="ghost" size="sm" type="button" onClick={() => setConfirm(null)}>
              Cancel
            </Button3D>
          </div>
        </div>
      )}

      {/* Editor */}
      <div
        id="sandbox-editor"
        role="tabpanel"
        aria-labelledby={`sandbox-tab-${language}`}
        className="pixel-corners border-2 border-line bg-bg-1"
        onFocus={warmOnFocus}
      >
        {viewingSolution && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line bg-bg-2 px-3 py-2">
            <p className="label text-xs">Reference solution (read only)</p>
            <Button3D variant="secondary" size="sm" type="button" onClick={() => setView('code')}>
              Back to my code
            </Button3D>
          </div>
        )}
        <Editor
          key={`${language}-${view}`}
          language={language}
          value={viewingSolution ? challenge.solution[language] : code[language]}
          onChange={viewingSolution ? undefined : onChange}
          onRun={() => void run()}
          readOnly={viewingSolution}
          label={viewingSolution ? 'Reference solution' : `Your ${language === 'python' ? 'Python' : 'JS / TS'} code`}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button3D variant="primary" size="md" type="button" onClick={() => void run()} disabled={running || pyLoading || pyFailed || viewingSolution} data-testid="run-button" aria-busy={running || pyLoading}>
          {pyLoading ? (
            <span className="flex items-center gap-2">
              Loading Python
              <span className="flex gap-0.5" role="progressbar" aria-label="Loading Python" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                {Array.from({ length: 8 }, (_, i) => (
                  <span key={i} className={`block h-3 w-1.5 ${i < Math.round(progress * 8) ? 'bg-current' : 'bg-current opacity-25'}`} />
                ))}
              </span>
            </span>
          ) : running ? (
            'Running'
          ) : (
            'Run'
          )}
        </Button3D>
        <Button3D variant="secondary" size="md" type="button" onClick={showHint} disabled={allHintsShown}>
          {hintsShown === 0 ? 'Hint' : allHintsShown ? 'No more hints' : `Hint ${hintsShown + 1} of ${challenge.hints.length}`}
        </Button3D>
        {!viewingSolution && (
          <Button3D variant="ghost" size="md" type="button" onClick={askSolution}>
            Show solution
          </Button3D>
        )}
        <span className="hidden font-mono text-xs text-text-dim sm:inline">{isMac ? '⌘' : 'Ctrl'} + Enter runs</span>
      </div>

      {pyFailed && (
        <div className="pixel-corners flex flex-wrap items-center gap-3 border-2 border-red bg-bg-1 p-3" role="alert" data-testid="python-load-error">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-red">Python could not load. Check your connection, then try again.</p>
            <p className="mt-1 text-xs text-text-dim">JS / TS still works while Python is offline.</p>
            {pyStatus.error && <p className="mt-1 font-mono text-xs text-text-dim">{pyStatus.error}</p>}
          </div>
          <Button3D variant="secondary" size="sm" type="button" onClick={() => void getRunner('python').warm().catch(() => {})}>
            Retry
          </Button3D>
        </div>
      )}

      {bubble && (
        <div aria-live="polite">
          <LeetBubble pose={bubble.pose} says={bubble.says} />
          {bubble.pose === 'hint' && hintsShown > 1 && (
            <ol className="mt-2 grid gap-1 pl-4 text-xs text-text-dim">
              {challenge.hints.slice(0, hintsShown - 1).map((h, i) => (
                <li key={i}>
                  Hint {i + 1}: <Markdown paragraphs={h} inline />
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {err && (
        <div className="pixel-corners border-2 border-red bg-bg-1 p-3" role="alert" data-testid="compile-error">
          <p className="font-label text-xs tracking-[0.12em] text-red uppercase">{language === 'python' ? 'Python could not run this' : 'JS / TS could not run this'}</p>
          <pre className="mt-2 font-mono text-sm whitespace-pre-wrap text-red">
            {err.line ? `Line ${err.line}: ` : ''}
            {err.message}
          </pre>
        </div>
      )}

      <TestList results={results[language]} challenge={challenge} language={language} />
    </div>
  );
}

export default Sandbox;
