// Character-grid pixel art rendered as SVG (SPEC 5.3). A frame is one string per row, one
// character per pixel. '.' is transparent; every other character is looked up in a palette that
// maps it to a CSS colour (usually a token, e.g. 'var(--cyan)'). Each colour becomes a single
// <path>, with horizontal runs merged, so a 24x24 sprite is a handful of nodes, not 576 rects.
export type PixelFrame = readonly string[];
export type PixelPalette = Readonly<Record<string, string>>;

/** Path data for every run of `char` in `frame`, in grid units. Exported for tests. */
export function runPath(frame: PixelFrame, char: string): string {
  let d = '';
  frame.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== char) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x] === char) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  });
  return d;
}

/** Characters that appear in the frame and are in the palette, in palette order (draw order). */
function charsIn(frame: PixelFrame, palette: PixelPalette): string[] {
  const seen = new Set(frame.join(''));
  return Object.keys(palette).filter((c) => c !== '.' && seen.has(c));
}

/** One <path> per colour. Draws at (x, y) in the parent's units, one pixel = `scale` units. */
export function PixelPaths({
  frame,
  palette,
  x = 0,
  y = 0,
  scale = 1,
}: {
  frame: PixelFrame;
  palette: PixelPalette;
  x?: number;
  y?: number;
  scale?: number;
}) {
  const transform = x || y || scale !== 1 ? `translate(${x} ${y})${scale !== 1 ? ` scale(${scale})` : ''}` : undefined;
  return (
    <g transform={transform} shapeRendering="crispEdges">
      {charsIn(frame, palette).map((c) => (
        <path key={c} d={runPath(frame, c)} style={{ fill: palette[c] }} />
      ))}
    </g>
  );
}

/** A standalone <svg> sized cols*scale by rows*scale. Decorative unless given a title. */
export function PixelSprite({
  frame,
  palette,
  scale,
  title,
  className,
}: {
  frame: PixelFrame;
  palette: PixelPalette;
  scale: number;
  title?: string;
  className?: string;
}) {
  const rows = frame.length;
  const cols = frame[0]?.length ?? 0;
  return (
    <svg
      width={cols * scale}
      height={rows * scale}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <PixelPaths frame={frame} palette={palette} />
    </svg>
  );
}

export default PixelSprite;
