import { useMemo, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import type { Lesson, Scene } from '../content/schema';
import { Sandbox } from '../sandbox/Sandbox';
import { Visual } from '../visual/Visual';
import { composeLesson } from '../visual/compose';
import { Tabs, tabId, tabPanelId } from '../ui/Tabs';
import { scenesForLesson } from './scenes';
import { useWideLayout } from './useWideLayout';

export type PaneTab = 'visual' | 'code';

const TABS = [
  { id: 'visual' as const, label: 'Visual' },
  { id: 'code' as const, label: 'Code' },
];
const PREFIX = 'pane';

/**
 * Middle tier (1024 to 1279px) height the visual asks for: the lesson's scene at scale 0.85 (the scale below which the
 * engine starts boosting text) plus the HUD row, legend, caption and padding around it. The text
 * rail gets whatever is left, but never less than 200px, so the visual may end up smaller.
 */
function desiredVisualHeight(scenes: Scene[]): number {
  const { h } = composeLesson(scenes).bounds;
  const maxVars = Math.max(0, ...scenes.map((s) => s.vars?.length ?? 0));
  const hudRows = maxVars > 3 ? 2 : 1; // three 112px tiles fit beside Replay and Pause at 1280
  return Math.ceil(h * 0.85 + 100 + hudRows * 64);
}

/**
 * The lesson body, one DOM tree for every width so nothing remounts (SPEC 1, page layout).
 *
 * - 1280px and up: three columns. A narrow text rail (scrolls on its own), the visual as the
 *   full-height centre stage, and the sandbox on the right, always visible.
 * - 1024 to 1279px: two columns. Left holds the step text over the visual. The visual's height is
 *   fixed per lesson (see desiredVisualHeight), so its fit never changes between steps; the text
 *   takes the rest and scrolls. Right holds the sandbox, always visible.
 * - Below 1024px: VISUAL / CODE tabs over the pane, step text under it (above it on the
 *   challenge). The inactive panel is hidden with CSS, never unmounted.
 *
 * The left wrapper is `display: contents` on phones and at 1280px and up, so its children join the
 * stacked flex order or the three-column grid.
 */
export function LessonPane({
  lesson,
  index,
  tab,
  onTab,
  text,
  textRef,
}: {
  lesson: Lesson;
  index: number;
  tab: PaneTab;
  onTab(tab: PaneTab): void;
  text: ReactNode;
  textRef?: Ref<HTMLDivElement>;
}) {
  const wide = useWideLayout();
  const scenes = useMemo(() => scenesForLesson(lesson), [lesson]);
  const visualH = useMemo(() => desiredVisualHeight(scenes), [scenes]);
  const isChallenge = lesson.steps[index].kind === 'challenge';

  const panel = (id: PaneTab): HTMLAttributes<HTMLDivElement> =>
    wide
      ? { role: 'region', 'aria-label': id === 'visual' ? 'Visual' : 'Code' }
      : { role: 'tabpanel', id: tabPanelId(PREFIX, id), 'aria-labelledby': tabId(PREFIX, id) };
  // The hidden sandbox is display: none. The hidden visual stays laid out at its real size (out of
  // flow) so the engine's measurements hold and the view does not jump when VISUAL comes back.
  // It is hidden with opacity, not only visibility: Leet's frame animation sets visibility="visible"
  // on its own frames, which would override a hidden parent. `inert` takes it out of focus and the
  // accessibility tree.
  const visualHidden = !wide && tab !== 'visual';
  const hideCode = tab === 'code' ? '' : 'max-lg:hidden';
  const hideVisual = visualHidden
    ? 'max-lg:pointer-events-none max-lg:invisible max-lg:opacity-0 max-lg:absolute max-lg:inset-x-4 max-lg:top-4 max-lg:-z-10 sm:max-lg:inset-x-6'
    : '';

  return (
    <main className="relative mx-auto flex w-full max-w-[1920px] flex-col gap-3 px-4 pt-4 sm:px-6 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-8 lg:pt-5 lg:pb-[78px] xl:grid-cols-[clamp(300px,21vw,340px)_minmax(0,1fr)_clamp(420px,25vw,480px)] xl:gap-6">
      <div className="max-lg:contents lg:flex lg:min-h-0 lg:flex-col lg:gap-3 xl:contents">
        <div
          ref={textRef}
          className={`min-w-0 ${isChallenge ? 'order-0 max-lg:mb-3' : 'order-4 max-lg:mt-3'} scroll-fade lg:order-none lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2 xl:col-start-1 xl:row-start-1`}
        >
          {text}
        </div>
        <Tabs tabs={TABS} value={tab} onChange={onTab} idPrefix={PREFIX} label="Pane" className="order-1 lg:hidden" />
        <div
          {...panel('visual')}
          inert={visualHidden}
          style={{ '--visual-h': `${visualH}px` } as CSSProperties}
          className={`order-2 h-[46vh] min-h-[260px] overflow-hidden lg:order-none lg:h-[clamp(300px,var(--visual-h),calc(100%-212px))] lg:min-h-0 lg:flex-none xl:col-start-2 xl:row-start-1 xl:h-auto ${hideVisual}`}
        >
          <Visual scenes={scenes} index={index} />
        </div>
      </div>
      <div {...panel('code')} className={`order-3 min-w-0 lg:order-none lg:min-h-0 lg:overflow-y-auto lg:pr-1 xl:col-start-3 xl:row-start-1 ${hideCode}`}>
        <Sandbox lesson={lesson} problemButton={wide || !isChallenge} />
      </div>
    </main>
  );
}

export default LessonPane;
