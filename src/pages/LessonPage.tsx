import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { allLessonSlugs, getLesson } from '../content';
import type { Lesson } from '../content/schema';
import { useStore } from '../app/store';
import { lessonTitle, nextAvailableLesson } from '../app/course';
import { LessonHeader } from '../lesson/LessonHeader';
import { StepText } from '../lesson/StepText';
import { LessonPane, type PaneTab } from '../lesson/LessonPane';
import { StepperBar } from '../lesson/StepperBar';
import { CourseDrawer } from '../lesson/CourseDrawer';
import { Button3D } from '../ui/Button3D';
import { Panel } from '../ui/Panel';
import { clientNav } from '../app/nav';
import NotFound from './NotFound';
import { isEditableTarget, stepFromSearch } from '../lesson/keys';

export default function LessonPage() {
  const { slug = '' } = useParams();
  const lesson = getLesson(slug);
  if (lesson) return <LessonView key={slug} lesson={lesson} />;
  if (allLessonSlugs.includes(slug)) return <ComingSoon slug={slug} />;
  return <NotFound />;
}

function LessonView({ lesson }: { lesson: Lesson }) {
  const navigate = useNavigate();
  const count = lesson.steps.length;
  const challengeIndex = lesson.steps.findIndex((s) => s.kind === 'challenge');

  const [index, setIndex] = useState(() => {
    const fromUrl = stepFromSearch(window.location.search, count);
    if (fromUrl !== null) return fromUrl;
    const stored = useStore.getState().progress[lesson.slug]?.step ?? 1;
    return Math.min(Math.max(stored, 1), count) - 1;
  });
  const [tab, setTab] = useState<PaneTab>(() => (index === challengeIndex ? 'code' : 'visual'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const titleFocus = useRef(false);
  const textRef = useRef<HTMLDivElement>(null);

  const setStep = useStore((s) => s.setStep);
  const markCompleted = useStore((s) => s.markCompleted);

  const indexRef = useRef(index);
  indexRef.current = index;
  const go = useCallback(
    (next: number, focusTitle = false) => {
      const prev = indexRef.current;
      if (next < 0 || next >= count || next === prev) return;
      if (next === challengeIndex) setTab('code');
      else if (prev === challengeIndex) setTab('visual');
      titleFocus.current = focusTitle;
      setIndex(next);
    },
    [count, challengeIndex],
  );

  // Persist, sync ?step=N and react to arriving on the recap.
  useEffect(() => {
    setStep(lesson.slug, index + 1);
    if (lesson.steps[index].kind === 'recap') markCompleted(lesson.slug);
    const url = new URL(window.location.href);
    url.searchParams.set('step', String(index + 1));
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [index, lesson, setStep, markCompleted]);

  // Each step starts at the top of its text (the page on phones, the text rail on desktop).
  // Focus moves to the title only for segment clicks.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.scrollY > 0) window.scrollTo({ top: 0 });
    if (textRef.current) textRef.current.scrollTop = 0;
    if (titleFocus.current) document.getElementById('step-title')?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    document.title = `${lesson.title} | Learn to Leet`;
    return () => {
      document.title = 'Learn to Leet';
    };
  }, [lesson.title]);

  // Left and Right change step, unless focus is in the editor or another text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (drawerOpen || isEditableTarget(e.target) || isEditableTarget(document.activeElement)) return;
      e.preventDefault();
      go(indexRef.current + (e.key === 'ArrowRight' ? 1 : -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, drawerOpen]);

  const nextLesson = nextAvailableLesson(lesson.slug);
  const onLast = () => navigate(nextLesson ? `/learn/${nextLesson.slug}` : '/');

  return (
    <div className="min-h-dvh pb-32 lg:flex lg:h-dvh lg:min-h-[640px] lg:flex-col lg:pb-0">
      <LessonHeader lesson={lesson} onOpenCourse={() => setDrawerOpen(true)} />
      <LessonPane
        lesson={lesson}
        index={index}
        tab={tab}
        onTab={setTab}
        text={<StepText lesson={lesson} index={index} />}
        textRef={textRef}
      />
      <StepperBar
        labels={lesson.steps.map((s) => s.title)}
        index={index}
        onGo={(i) => go(i, true)}
        lastLabel={nextLesson ? 'Next lesson' : 'All lessons'}
        onLast={onLast}
      />
      <CourseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} current={lesson.slug} />
    </div>
  );
}

function ComingSoon({ slug }: { slug: string }) {
  const navigate = useNavigate();
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-16">
      <Panel className="p-6">
        <p className="label text-xs">Coming soon</p>
        <h1 className="mt-3 font-display text-xl font-semibold">{lessonTitle(slug)}</h1>
        <p className="mt-3 text-text-dim">This lesson is still being written. The rest of the course is ready to go.</p>
        <div className="mt-6">
          <Button3D href="/" onClick={clientNav(navigate, '/')}>
            All lessons
          </Button3D>
        </div>
      </Panel>
    </main>
  );
}
