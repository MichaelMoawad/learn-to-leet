// Problem statement, examples and constraints. Rendered in the challenge step's text rail and
// by the sandbox's "Problem" button, so it carries no outer margin.
import type { Problem } from '../content/schema';
import { Markdown } from '../ui/Markdown';
import { Panel } from '../ui/Panel';

export function ProblemCard({ problem }: { problem: Problem }) {
  return (
    <Panel as="section" aria-label="Problem" className="p-4 sm:p-5">
      <p className="label text-xs">Problem</p>
      <Markdown paragraphs={problem.statement} className="mt-3 text-sm sm:text-base" />

      {problem.examples.length > 0 && (
        <div className="mt-5 space-y-3">
          {problem.examples.map((ex, i) => (
            <div key={i} className="border-2 border-line bg-bg-0 p-3">
              <p className="label text-xs text-text-dim">Example {i + 1}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-sm">
                <dt className="text-text-dim">Input</dt>
                <dd className="break-words">{ex.input}</dd>
                <dt className="text-text-dim">Output</dt>
                <dd className="break-words text-green">{ex.output}</dd>
              </dl>
              {ex.note && <Markdown paragraphs={ex.note} className="mt-2 text-sm text-text-dim" />}
            </div>
          ))}
        </div>
      )}

      {problem.constraints.length > 0 && (
        <div className="mt-5">
          <p className="label text-xs">Constraints</p>
          <ul className="mt-2 space-y-1 font-mono text-sm text-text-dim">
            {problem.constraints.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true" className="text-cyan-deep">
                  ▪
                </span>
                <span className="break-words">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

export default ProblemCard;
