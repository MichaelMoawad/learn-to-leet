import { Markdown } from '../ui/Markdown';

/** "You'll learn" list: plain on step 1, ticked on the recap. */
export function YoullLearn({ items, ticked = false }: { items: string[]; ticked?: boolean }) {
  return (
    <section aria-label="You'll learn" className="border-2 border-line bg-bg-1 p-4">
      <p className="label text-xs">{ticked ? "What you learned" : "You'll learn"}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={`mt-1 inline-flex size-4 shrink-0 items-center justify-center border-2 font-label text-[10px] leading-none ${
                ticked ? 'border-green-deep bg-green text-ink' : 'border-cyan-deep bg-bg-2 text-transparent'
              }`}
            >
              {ticked ? '✓' : ''}
            </span>
            {ticked && <span className="sr-only">Done: </span>}
            <Markdown paragraphs={item} inline />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default YoullLearn;
