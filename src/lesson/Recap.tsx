import { Link } from 'react-router';
import type { Lesson, RecapStep } from '../content/schema';
import { Markdown } from '../ui/Markdown';
import { YoullLearn } from './YoullLearn';
import { nextAvailableLesson } from '../app/course';

export function Recap({ lesson, step }: { lesson: Lesson; step: RecapStep }) {
  const next = nextAvailableLesson(lesson.slug);
  return (
    <div className="space-y-4">
      <section aria-label="Takeaways" className="border-2 border-line bg-bg-1 p-4">
        <p className="label text-xs">Takeaways</p>
        <ul className="mt-3 space-y-3 text-sm">
          {step.takeaways.map((t, i) => (
            <li key={i} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5 font-label text-xs text-magenta">
                {String(i + 1).padStart(2, '0')}
              </span>
              <Markdown paragraphs={t} inline />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Complexity" className="grid grid-cols-2 gap-3">
        <div className="border-2 border-line bg-bg-1 p-3">
          <p className="label text-xs">Time</p>
          <p className="mt-1 font-mono text-lg text-text">{step.complexity.time}</p>
        </div>
        <div className="border-2 border-line bg-bg-1 p-3">
          <p className="label text-xs">Space</p>
          <p className="mt-1 font-mono text-lg text-text">{step.complexity.space}</p>
        </div>
      </section>

      <YoullLearn items={lesson.youllLearn} ticked />

      <p className="text-sm text-text-dim">
        <span className="label mr-2 text-xs text-magenta">Coming up</span>
        {next ? (
          <Link to={`/learn/${next.slug}`} className="text-text underline decoration-cyan underline-offset-4">
            {next.title}
          </Link>
        ) : (
          <>That is every lesson so far. More are on the way.</>
        )}
      </p>
    </div>
  );
}

export default Recap;
