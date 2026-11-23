import MarkdownToJsx from 'markdown-to-jsx';

const blockOptions = { forceBlock: true, disableParsingRawHTML: true, disableAutoLink: true } as const;
const inlineOptions = { forceInline: true, disableParsingRawHTML: true, disableAutoLink: true } as const;

/**
 * Renders the lesson Markdown subset (**bold**, *em*, `code`, "- " lists).
 * Pass one string per paragraph; styles come from the `.md` rules in global.css.
 */
export function Markdown({
  paragraphs,
  inline = false,
  className = '',
}: {
  paragraphs: string | string[];
  inline?: boolean;
  className?: string;
}) {
  const list = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
  if (inline) {
    return (
      <span className={`md ${className}`}>
        {list.map((p, i) => (
          <MarkdownToJsx key={i} options={inlineOptions}>
            {p}
          </MarkdownToJsx>
        ))}
      </span>
    );
  }
  return (
    <div className={`md ${className}`}>
      {list.map((p, i) => (
        <MarkdownToJsx key={i} options={blockOptions}>
          {p}
        </MarkdownToJsx>
      ))}
    </div>
  );
}

export default Markdown;
