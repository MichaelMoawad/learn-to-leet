import type { Lesson, Step } from '../content/schema';
import { LeetBubble } from '../mascot/LeetBubble';
import { Markdown } from '../ui/Markdown';
import { ProblemCard } from './ProblemCard';
import { Recap } from './Recap';
import { YoullLearn } from './YoullLearn';

/** The text rail: step counter, title, body, Leet, plus the step-specific extras. */
export function StepText({ lesson, index }: { lesson: Lesson; index: number }) {
  const step: Step = lesson.steps[index];
  return (
    <article aria-labelledby="step-title" className="space-y-4">
      <p className="label text-xs" aria-hidden="true">
        Step {index + 1} / {lesson.steps.length}
      </p>
      <h1 id="step-title" tabIndex={-1} className="font-display text-xl leading-tight font-semibold text-text outline-none">
        {step.title}
      </h1>
      <Markdown paragraphs={step.body} className="text-text" />
      {step.leet && <LeetBubble pose={step.leet.pose} says={step.leet.says} />}
      {index === 0 && <YoullLearn items={lesson.youllLearn} />}
      {step.kind === 'challenge' && <ProblemCard problem={lesson.problem} />}
      {step.kind === 'recap' && <Recap lesson={lesson} step={step} />}
    </article>
  );
}

export default StepText;
