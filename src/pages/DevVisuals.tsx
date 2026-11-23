// Dev-only gallery (SPEC section 1, /dev/visuals). Placeholder until phase 3 fills it with every
// structure; for now it scrubs through the scenes of each authored lesson.
import { useState } from 'react';
import { Link } from 'react-router';
import { availableLessons } from '../content';
import { Visual } from '../visual/Visual';
import { scenesForLesson } from '../lesson/scenes';

export default function DevVisuals() {
  const lessons = availableLessons();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="label text-xs">Dev only</p>
      <h1 className="mt-2 font-display text-xl font-semibold">Visual gallery</h1>
      <p className="mt-2 text-text-dim">
        Placeholder. Phase 3 adds every structure with sample scenes. <Link to="/" className="text-cyan underline">Home</Link>
      </p>
      <div className="mt-8 space-y-8">
        {lessons.map((l) => (
          <LessonScenes key={l.slug} title={l.title} scenes={scenesForLesson(l)} />
        ))}
      </div>
    </main>
  );
}

function LessonScenes({ title, scenes }: { title: string; scenes: ReturnType<typeof scenesForLesson> }) {
  const [i, setI] = useState(0);
  return (
    <section>
      <div className="mb-3 flex items-center gap-4">
        <h2 className="font-display text-lg">{title}</h2>
        <input
          type="range"
          min={0}
          max={scenes.length - 1}
          value={i}
          onChange={(e) => setI(Number(e.target.value))}
          aria-label={`${title} scene`}
          className="flex-1 accent-cyan"
        />
        <span className="label text-xs">
          {i + 1} / {scenes.length}
        </span>
      </div>
      <Visual scenes={scenes} index={i} />
    </section>
  );
}
