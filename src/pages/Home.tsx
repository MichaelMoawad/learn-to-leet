import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { availableLessons, getLesson, modules } from '../content';
import type { Lesson } from '../content/schema';
import { useStore, type LessonProgress } from '../app/store';
import { lessonTitle } from '../app/course';
import { clientNav } from '../app/nav';
import { Button3D } from '../ui/Button3D';
import { Chip, difficultyTone } from '../ui/Chip';
import { Leet } from '../mascot/Leet';
import { MotionToggle } from '../lesson/MotionToggle';

export default function Home() {
  const navigate = useNavigate();
  const progress = useStore((s) => s.progress);
  const lessons = availableLessons();
  const startWith = lessons.find((l) => !progress[l.slug]?.completed) ?? lessons[0];
  const started = lessons.some((l) => progress[l.slug]);
  const startHref = startWith ? `/learn/${startWith.slug}` : '/';

  useEffect(() => {
    document.title = 'Learn to Leet';
  }, []);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-end gap-4 px-4 py-4 sm:px-8">
        <MotionToggle />
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-8">
        <section className="flex flex-col-reverse items-start gap-8 py-10 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="label text-xs">Interview problems, one step at a time</p>
            <h1 className="glow-cyan mt-3 font-display text-hero-mobile leading-none font-bold text-text sm:text-3xl">
              Learn to Leet
            </h1>
            <p className="mt-5 max-w-xl text-lg text-text-dim">
              Watch each classic problem play out in pictures, then write the solution in a sandbox that runs Python and
              JS / TS right in your browser.
            </p>
            {startWith && (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button3D href={startHref} size="lg" onClick={clientNav(navigate, startHref)}>
                  {started ? 'Continue learning' : 'Start learning'}
                </Button3D>
                <span className="text-sm text-text-dim">
                  {started ? 'Pick up with ' : 'First up: '}
                  <span className="text-text">{startWith.title}</span>
                </span>
              </div>
            )}
          </div>
          <Leet pose="idle" scale={6} />
        </section>

        {modules.map((m, mi) => (
          <section key={m.slug} aria-labelledby={`module-${m.slug}`} className="border-t-2 border-line py-10">
            <p className="label text-xs">Module {mi + 1}</p>
            <h2 id={`module-${m.slug}`} className="mt-2 font-display text-xl leading-tight font-semibold">
              {m.title}
            </h2>
            <p className="mt-2 max-w-2xl text-text-dim">{m.blurb}</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {m.lessons.map((slug) => {
                const lesson = getLesson(slug);
                return (
                  <li key={slug} className="flex">
                    {lesson ? <LessonCard lesson={lesson} progress={progress[slug]} /> : <ComingSoonCard slug={slug} />}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </main>

      <footer className="mx-auto max-w-6xl border-t-2 border-line px-4 py-8 text-sm text-text-dim sm:px-8">
        <p>
          Format inspired by{' '}
          <a href="https://designed-to-scale.vercel.app" className="text-cyan underline underline-offset-4" target="_blank" rel="noreferrer">
            Designed to Scale
          </a>{' '}
          by @DilumSanjaya. Problems are written in our own words and reference LeetCode by number.
        </p>
      </footer>
    </div>
  );
}

function LessonCard({ lesson, progress }: { lesson: Lesson; progress?: LessonProgress }) {
  const solvedIn = [progress?.solved.python && 'Python', progress?.solved.typescript && 'JS / TS'].filter(Boolean);
  return (
    <Link
      to={`/learn/${lesson.slug}`}
      className="group pixel-corners flex w-full flex-col border-2 border-line bg-bg-1 p-4 hover:border-cyan-deep hover:bg-bg-2"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-label text-xs tracking-[0.12em] text-text-dim uppercase">LC {lesson.source.leetcode}</span>
        {solvedIn.length > 0 ? (
          <Chip tone="green">Solved</Chip>
        ) : progress?.completed ? (
          <Chip tone="cyan">Done</Chip>
        ) : progress && progress.step > 1 ? (
          <Chip tone="amber">Step {progress.step}</Chip>
        ) : null}
      </div>
      <h3 className="mt-2 font-display text-lg leading-tight font-semibold text-text group-hover:text-cyan">{lesson.title}</h3>
      <p className="mt-1 text-sm text-text-dim">{lesson.pattern}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip tone={difficultyTone[lesson.difficulty]}>{lesson.difficulty}</Chip>
        <Chip>{lesson.minutes} min</Chip>
        <Chip>{lesson.steps.length} steps</Chip>
      </div>
      {solvedIn.length > 0 && <p className="mt-3 text-xs text-green">Solved in {solvedIn.join(' and ')}</p>}
    </Link>
  );
}

function ComingSoonCard({ slug }: { slug: string }) {
  return (
    <div className="pixel-corners flex w-full flex-col border-2 border-dashed border-line bg-bg-0/60 p-4" aria-disabled="true">
      <span className="font-label text-xs tracking-[0.12em] text-text-dim uppercase">Coming soon</span>
      <h3 className="mt-2 font-display text-lg leading-tight font-semibold text-text-dim">{lessonTitle(slug)}</h3>
    </div>
  );
}
