import { Link } from 'react-router';
import type { Lesson } from '../content/schema';
import { Chip, difficultyTone } from '../ui/Chip';
import { lessonPosition } from '../app/course';
import { MotionToggle } from './MotionToggle';

export function LessonHeader({ lesson, onOpenCourse }: { lesson: Lesson; onOpenCourse(): void }) {
  const { module, n, of } = lessonPosition(lesson.slug);
  return (
    <header className="border-b-2 border-line bg-bg-0/90">
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link to="/" className="glow-cyan font-display text-base leading-none font-bold whitespace-nowrap text-text max-lg:inline-flex max-lg:min-h-10 max-lg:items-center sm:text-lg">
          Learn to Leet
        </Link>
        <p className="order-last w-full min-w-0 truncate text-sm text-text-dim lg:order-none lg:w-auto">
          {module && <span>{module.title}</span>}
          {module && <span aria-hidden="true" className="px-2 text-line-bright">/</span>}
          <span>
            lesson {n} of {of}
          </span>
        </p>
        <div className="order-last flex flex-wrap gap-2 lg:order-none">
          <Chip tone={difficultyTone[lesson.difficulty]}>{lesson.difficulty}</Chip>
          <Chip tone="cyan">{lesson.minutes} min</Chip>
          <Chip tone="violet">{lesson.steps.length} steps</Chip>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <MotionToggle />
          <button
            type="button"
            onClick={onOpenCourse}
            aria-haspopup="dialog"
            className="h-8 border-2 border-line bg-bg-1 px-2 font-label text-xs tracking-[0.12em] text-cyan uppercase hover:border-cyan max-lg:h-10 sm:px-3"
          >
            Course
          </button>
        </div>
      </div>
    </header>
  );
}

export default LessonHeader;
