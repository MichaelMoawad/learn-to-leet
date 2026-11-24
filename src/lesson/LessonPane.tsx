import { useMemo, useState } from 'react';
import type { Lesson } from '../content/schema';
import { Sandbox } from '../sandbox/Sandbox';
import { Visual } from '../visual/Visual';
import { Tabs, tabId, tabPanelId } from '../ui/Tabs';
import { scenesForLesson } from './scenes';

export type PaneTab = 'visual' | 'code';

const TABS = [
  { id: 'visual' as const, label: 'Visual' },
  { id: 'code' as const, label: 'Code' },
];
const PREFIX = 'pane';

/**
 * VISUAL / CODE tabs. The sandbox mounts on first visit to CODE and then stays mounted (hidden
 * when VISUAL is showing) so the editor, its undo history and the warm worker survive tab switches.
 */
export function LessonPane({
  lesson,
  index,
  tab,
  onTab,
}: {
  lesson: Lesson;
  index: number;
  tab: PaneTab;
  onTab(tab: PaneTab): void;
}) {
  const [codeMounted, setCodeMounted] = useState(tab === 'code');
  if (tab === 'code' && !codeMounted) setCodeMounted(true);
  const scenes = useMemo(() => scenesForLesson(lesson), [lesson]);

  return (
    <section aria-label="Lesson pane" className="flex min-w-0 flex-col gap-3">
      <Tabs tabs={TABS} value={tab} onChange={onTab} idPrefix={PREFIX} label="Pane" />
      <div
        role="tabpanel"
        id={tabPanelId(PREFIX, 'visual')}
        aria-labelledby={tabId(PREFIX, 'visual')}
        hidden={tab !== 'visual'}
        className="h-[46vh] min-h-[260px] overflow-hidden lg:h-[calc(100dvh-212px)] lg:min-h-[420px]"
      >
        <Visual scenes={scenes} index={index} />
      </div>
      <div
        role="tabpanel"
        id={tabPanelId(PREFIX, 'code')}
        aria-labelledby={tabId(PREFIX, 'code')}
        hidden={tab !== 'code'}
        className="min-w-0"
      >
        {codeMounted && <Sandbox lesson={lesson} problemButton={lesson.steps[index].kind !== 'challenge'} />}
      </div>
    </section>
  );
}

export default LessonPane;
