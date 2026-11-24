import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { hasLesson, modules } from '../content';
import { useStore } from '../app/store';
import { lessonTitle } from '../app/course';

/** Course outline in a modal side sheet (native <dialog>: focus trap and Escape for free). */
export function CourseDrawer({ open, onClose, current }: { open: boolean; onClose(): void; current?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const progress = useStore((s) => s.progress);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Course outline"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // backdrop click
      }}
      className="m-0 ml-auto h-dvh max-h-dvh w-[min(380px,100vw)] max-w-none border-0 border-l-2 border-line bg-bg-1 p-0 text-text backdrop:bg-ink/70"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b-2 border-line px-4 py-3">
          <p className="label text-xs">Course</p>
          <button
            type="button"
            onClick={onClose}
            className="h-8 border-2 border-line px-3 font-label max-lg:h-10 text-xs uppercase tracking-[0.12em] text-text-dim hover:border-cyan hover:text-cyan"
          >
            Close
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Lessons">
          {modules.map((m) => (
            <section key={m.slug} className="mb-5">
              <h2 className="font-display text-base font-semibold text-text">{m.title}</h2>
              <ul className="mt-2 space-y-1">
                {m.lessons.map((slug) => {
                  const p = progress[slug];
                  const solved = !!(p?.solved.python || p?.solved.typescript);
                  const isCurrent = slug === current;
                  if (!hasLesson(slug)) {
                    return (
                      <li key={slug} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-text-dim">
                        <span>{lessonTitle(slug)}</span>
                        <span className="font-label text-[10px] uppercase tracking-[0.12em]">Soon</span>
                      </li>
                    );
                  }
                  return (
                    <li key={slug}>
                      <Link
                        to={`/learn/${slug}`}
                        onClick={onClose}
                        aria-current={isCurrent ? 'page' : undefined}
                        className={`flex items-center justify-between gap-2 border-2 px-2 py-1.5 text-sm max-lg:min-h-10 ${
                          isCurrent ? 'border-cyan bg-bg-2 text-text' : 'border-transparent text-text hover:border-line'
                        }`}
                      >
                        <span>{lessonTitle(slug)}</span>
                        <span className="font-label text-[10px] uppercase tracking-[0.12em]">
                          {solved ? (
                            <span className="text-green">Solved</span>
                          ) : p?.completed ? (
                            <span className="text-cyan">Done</span>
                          ) : p && p.step > 1 ? (
                            <span className="text-amber">Step {p.step}</span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </div>
    </dialog>
  );
}

export default CourseDrawer;
