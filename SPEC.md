# Learn to Leet: build spec

Written in phase 1 (2026-11-23). Read `BRIEF.md` first for the fixed decisions. This file is the single source of truth for phases 2 to 5. Where the two disagree, `BRIEF.md` wins and the mismatch gets reported to Michael.

House rules that apply to every phase and every agent:

- No em dashes in any user-facing copy, README text or lesson content. Use commas or restructure.
- Problem statements are original. Never paste LeetCode text. Naming the LeetCode number and title is fine.
- The word "Leetify" appears nowhere.
- No backend, no accounts, no analytics. Everything runs in the browser.
- Agents report back in short summaries (what changed, what was verified, what is open), never file dumps.

---

## 1. Stack and folder structure

| Choice | Version (pinned at scaffold) | Why |
|---|---|---|
| Vite + React + TypeScript (strict) | vite 8, react 19, typescript 7 | Static SPA, no server needed. Vite has first-class module workers, which the sandbox depends on. |
| React Router (declarative `BrowserRouter`) | 8 | Two routes. Path URLs so lessons are shareable. |
| Tailwind CSS with `@theme` tokens | 4 | Tokens live in one CSS file, agents style fast and consistently. |
| Motion (`motion/react`) | 14 | Keyed enter, exit and tween for the visual engine without a hand-written tween loop. |
| CodeMirror 6 via `@uiw/react-codemirror`, `@codemirror/lang-python`, `@codemirror/lang-javascript` | 4.25 / 6 | Small and usable on phones. Monaco is neither. |
| Pyodide, loaded from jsDelivr inside a worker | 314.0.8 | Python in the browser. About 6 MB compressed on first run (wasm 3.4 MB, stdlib 2.5 MB), cached after. |
| Sucrase (in the JS worker) | 3.35 | TS to JS by stripping types. Pure JS, about 1 MB unpacked, runs in a worker. TypeScript 7 is a native binary with no in-browser transpile API, and esbuild-wasm is about ten times the download. Trade-off: no type checking in the sandbox, only syntax and runtime errors. |
| Zustand with `persist` | 5 | Progress, drafts and prefs in `localStorage` with almost no code. |
| `markdown-to-jsx` | 9 | Renders the small Markdown subset used in step text. |
| `@fontsource/*` (self-hosted fonts) | 5 | No third-party font requests, no layout shift. |
| Vitest, Playwright | 5, 1.65 | Unit tests for harness, compare and layout. One e2e smoke test. |
| Node | 22.22 or later | react-router 8 asks for it. This machine has 22.14, which works with an install warning. |

Hosting is Vercel static. `vercel.json` rewrites every path to `/index.html`. No COOP/COEP headers are needed (see section 4, timeouts).

Not in scope: light theme, i18n, search, user accounts, hard-difficulty problems, problems that are judged on in-place mutation, pre-rendering for SEO.

```
learn-to-leet/
  BRIEF.md  SPEC.md  USAGE.md  README.md  LICENSE (MIT)
  index.html  vite.config.ts  vercel.json  package.json  tsconfig.json
  public/                    favicon, og.png
  scripts/check-content.ts   validates lessons and runs reference solutions (section 4.6)
  src/
    main.tsx
    app/        App.tsx, routes.tsx, store.ts (zustand), useReducedMotion.ts
    styles/     tokens.css (section 5.1), global.css
    ui/         Button3D, Panel, Tabs, Chip, ProgressSegments, Markdown, PixelSprite, icons.ts
    mascot/     Leet.tsx, LeetBubble.tsx, sprites.ts
    pages/      Home.tsx, LessonPage.tsx, NotFound.tsx, DevVisuals.tsx (dev only)
    lesson/     LessonHeader, StepText, LessonPane, StepperBar, ProblemCard, Recap, CourseDrawer
    visual/     Visual.tsx, iso.ts, compose.ts, render/ (Floor, Zone, Edge, Block, Marker, Label), layout/ (one file per structure)
    sandbox/    Sandbox.tsx, Editor.tsx, TestList.tsx, runner.ts, compare.ts, protocol.ts,
                workers/ (python.worker.ts, js.worker.ts), harness/ (python.ts, js.ts, prelude.py.ts)
    content/    schema.ts, modules.ts, index.ts, lessons/<slug>.ts
  tests/        unit/*.test.ts, e2e/smoke.spec.ts
```

`content/index.ts` loads every lesson with `import.meta.glob('./lessons/*.ts', { eager: true })`. Fifteen lessons of text is small enough to ship in the main bundle.

### Routes and page layout

- `/` Home. Hero (title with glow, one-line pitch, Leet idle, a Start button that opens the first unfinished lesson), then one section per module with lesson cards. A card shows title, "LC 1", difficulty chip, minutes, step count, pattern, and done or solved state. Footer carries the inspiration credit (section 7, phase 5).
- `/learn/:slug?step=N` Lesson. `N` is 1-based and kept in sync with `history.replaceState`.
- `/dev/visuals` Gallery of every structure with sample scenes and a step scrubber. Dev builds only.

Lesson page, desktop (1280px and up): header (logo, "module / lesson n of m", chips for difficulty, minutes and steps, course drawer button, reduced-motion toggle), then three columns that fill the viewport between the header and the bottom bar, inside a 1920px max width. There are no pane tabs on desktop.

- Left: the text rail (step counter, title, body, Leet bubble, "You'll learn" on step 1, `ProblemCard` on the challenge step), `clamp(300px, 21vw, 340px)` wide, scrolling on its own with a fade at the bottom edge while more text is below.
- Centre: the visual, the hero of the page. Full column height and all the width that is left (464px at 1280, about 620px at 1440, about 1000px at 1920), so the floor runs edge to edge with the HUD tiles across the top, Replay and Pause top right and the legend bottom left. Its fit never changes between steps.
- Right: the sandbox, `clamp(420px, 25vw, 480px)` wide, always visible on every step, scrolling on its own.

A fixed bottom bar holds Back, one clickable progress segment per step, "STEP 3 / 9", and Next. On the last step Next becomes "Next lesson", or "All lessons" (back to Home) when the next lesson has no file yet.

From 1024px to 1279px three columns would leave the visual only 210px (at 1024) to 460px wide, so this range keeps two columns split 11 to 9: the text rail on top of the left column and the visual below it, the sandbox on the right. The visual's height is fixed per lesson (the lesson's scene at scale 0.85 plus its HUD, legend and caption), and the text rail takes the rest of the column but never less than 200px, scrolling on its own.

Below 1024px the layout stacks: `VISUAL` and `CODE` tabs, the pane (visual capped at 46vh), text under it, stepper bar fixed to the bottom with safe-area padding. On the challenge step the text goes above the pane. Below 1024px the sandbox column would be under 400px wide; 900px was checked and is too tight.

The sandbox mounts once per lesson at page level, whatever the width. Steps, tab switches and crossing the breakpoint never remount it, so editor contents, test results, the selected language and hint state survive; on phones the inactive tab is hidden with CSS. Opening another lesson resets it.

Behaviour:

- Left and Right arrow keys change step unless focus is inside the editor.
- On phones the `CODE` tab is available on every step, and arriving on the challenge step switches to it automatically. On desktop the sandbox is always on screen. On the challenge step the text rail shows the step body followed by `ProblemCard` (statement, examples, constraints). On other steps the sandbox header has a "Problem" button that opens the same card. On desktop the button also shows on the challenge step, because the card in the text rail starts below the fold there.
- Steps are never gated. Reaching the recap marks the lesson completed. Passing all tests marks it solved for that language.
- "You'll learn" shows under the body on step 1 and as a ticked list on the recap. The recap also shows a "Coming up" line naming the next lesson.
- Store shape (`localStorage` key `ltl:v1`): `progress[slug] = { step, completed, solved: { python?, typescript? } }`, `drafts[slug][language] = code`, `prefs = { language, motion: 'auto' | 'reduced' | 'full' }`. Drafts save on a 500ms debounce.

---

## 2. Lesson data

A lesson is one TypeScript file that default-exports a `Lesson`. TypeScript rather than JSON so content is type-checked and authors can use constants and small helpers to avoid repeating state. Every step carries its full scene (no diffs), so any step can be rendered directly and Back works for free.

### 2.1 Schema (`src/content/schema.ts`)

```ts
export type Markdown = string; // subset: **bold**, *em*, `code`, "- " lists. No headings, images, HTML.
export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type Language = 'python' | 'typescript'; // the typescript tab is labelled "JS / TS"
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Tone = 'idle' | 'active' | 'compare' | 'good' | 'bad' | 'muted' | 'visited';
export type LeetPose = 'idle' | 'hint' | 'cheer' | 'oops';

export interface Module {
  slug: string;
  title: string;
  blurb: string;       // one sentence
  icon: string;        // key into ui/icons.ts
  lessons: string[];   // lesson slugs, in order
}

export interface Lesson {
  slug: string;
  title: string;
  source: { leetcode: number; name: string }; // reference only
  pattern: string;     // e.g. "Hash map lookup"
  difficulty: Difficulty;
  minutes: number;
  youllLearn: string[]; // 3 or 4 items
  problem: Problem;
  steps: Step[];        // 5 to 10. Exactly one challenge step. The last step is the recap.
  challenge: Challenge;
}

export interface Problem {
  statement: Markdown[]; // one string per paragraph
  examples: { input: string; output: string; note?: string }[];
  constraints: string[];
}

interface StepBase {
  title: string;        // 6 words or fewer
  body: Markdown[];     // one string per paragraph. Concept steps 25 to 80 words in total, challenge and recap 10 to 80
  leet?: { pose: LeetPose; says: string }; // 20 words or fewer, on at most 4 steps per lesson
}
export interface ConceptStep extends StepBase { kind: 'concept'; scene: Scene }
export interface ChallengeStep extends StepBase { kind: 'challenge' }
export interface RecapStep extends StepBase {
  kind: 'recap';
  takeaways: Markdown[]; // 3 to 5
  complexity: { time: string; space: string };
  scene?: Scene;         // if absent, the last concept scene stays up
}
export type Step = ConceptStep | ChallengeStep | RecapStep;

// ---------- sandbox ----------
export type ValueType = 'json' | 'linkedList' | 'tree';
// 'linkedList': JSON array <-> ListNode chain. 'tree': level-order JSON array with nulls <-> TreeNode.

export interface Challenge {
  entry: Record<Language, string>;   // function name per language
  params: { name: string; type: ValueType }[];
  returns: ValueType;
  compare?: 'exact' | 'anyOrder' | 'anyOrderNested'; // default 'exact'
  starter: Record<Language, string>;
  solution: Record<Language, string>;
  tests: TestCase[];                 // 5 to 8, the first ones match problem.examples
  hints: string[];                   // 2 or 3, revealed one at a time
  timeoutMs?: number;                // per test, default 2000 (JS) and 4000 (Python)
}
export interface TestCase { name: string; args: Json[]; expected: Json }

// ---------- visual ----------
export interface Scene {
  structures: Structure[]; // drawn top to bottom in this order
  vars?: Var[];            // variable chips shown above the drawing
  caption?: string;        // one line under the drawing
  // Token flows the step diff cannot express (3.0 item 3). `from` and `to` are element keys
  // ('nums/2', 'seen/6'). `loop` true (default): tokens keep flowing while idle. `loop: false`: one
  // token flies when the step is entered. Flows with missing endpoints are ignored.
  flows?: { from: string; to: string; tone?: Tone; loop?: boolean }[];
  // Leet in the scene. `pose` forces a pose, `at` an element key to stand beside, `hidden` removes Leet.
  leet?: { pose?: LeetPose; at?: string; hidden?: boolean };
}
export interface Var { name: string; value: string | number; tone?: Tone }

export interface Cell {
  id?: string;
  value: string | number; // at most 4 characters
  tone?: Tone;
  sub?: string;           // small note on the floor in front of the block
  h?: number;             // block height in units, 0 (flat tile) to 4, default 1
}
export type CellInput = Cell | string | number;            // a bare value means an idle cell
export interface Pointer { id: string; at: number | string; tone?: Tone } // label is the id; at = index or node id

interface StructureBase {
  id: string;
  label?: string;
  beside?: boolean; // sit to the right of the previous structure instead of below it
}

export interface ArrayStructure extends StructureBase {
  kind: 'array';
  cells: CellInput[];
  pointers?: Pointer[];
  window?: [number, number]; // inclusive index range drawn as a bracket (sliding window)
  variant?: 'cells' | 'bars'; // 'bars' draws column heights from numeric values
  indices?: boolean;          // default true
}
export interface HashMapStructure extends StructureBase {
  kind: 'hashmap';
  entries: { key: string | number; value?: string | number; tone?: Tone }[]; // omit value for a set
}
export interface StackStructure extends StructureBase { kind: 'stack'; items: CellInput[] } // bottom first
export interface QueueStructure extends StructureBase { kind: 'queue'; items: CellInput[] } // front first
export interface LinkedListStructure extends StructureBase {
  kind: 'linkedList';
  nodes: { id: string; value: string | number; next?: string | null; tone?: Tone }[];
  // Drawn left to right in array order. `next` defaults to the following node; set it to show rewiring.
  pointers?: Pointer[];
}
export interface TreeStructure extends StructureBase {
  kind: 'tree';
  root: string | null;
  nodes: { id: string; value: string | number; left?: string; right?: string; tone?: Tone; sub?: string }[];
  pointers?: Pointer[];
}
export interface GraphStructure extends StructureBase {
  kind: 'graph';
  directed?: boolean;
  nodes: { id: string; value?: string | number; at: [col: number, row: number]; tone?: Tone }[]; // author places nodes: col runs right, row runs down on screen
  edges: { from: string; to: string; tone?: Tone; label?: string }[];
  pointers?: Pointer[];
}
export interface GridStructure extends StructureBase {
  kind: 'grid';
  rows: CellInput[][];
  pointers?: { id: string; at: [row: number, col: number]; tone?: Tone }[];
}
export type Structure =
  | ArrayStructure | HashMapStructure | StackStructure | QueueStructure
  | LinkedListStructure | TreeStructure | GraphStructure | GridStructure;
```

Identity rule, which drives all animation: an element's key is `structure.id + '/' + elementId`, where `elementId` is `cell.id` if set, else the index (array, stack, queue, grid `r,c`), the `key` (hash map), or the node `id` (list, tree, graph). Same key in two consecutive steps means the element tweens. Give cells explicit ids whenever values move (swaps, pushes that shift positions).

Size limits, enforced by `check-content`: cell text up to 4 characters, arrays up to 10 cells, linked lists up to 6 nodes, grids up to 6 by 6, trees up to 4 levels and 9 nodes, graphs inside a 5 by 4 placement grid, hash maps up to 8 entries, stacks and queues up to 6 items. On top of these, the whole lesson must fit the 480 by 480 px bound from section 3.1. Use `beside` for a stack or other narrow structure when three structures would not fit stacked.

### 2.2 Authoring rules

- Step arc: the problem, the naive idea, the insight, 2 to 4 walkthrough steps on one small input, the challenge, the recap.
- One idea per step. The scene must show exactly what the text says.
- Use the same input for the whole walkthrough, and make it `tests[0]`.
- Tones mean the same thing everywhere: `active` is the element being looked at now, `compare` is being checked against something, `good` is a match or part of the answer, `bad` is a failed check, `muted` is ruled out, `visited` is already processed.
- Height is for things that are physically taller or flatter (land and water, bar heights). Emphasis is always tone, never `h`.
- `bars` values are at most 2 characters: the value sits in the left half of the top face, the only part a taller bar in front never hides.
- Leet cheers automatically on the lesson's final scene (and trailing steps repeating it) when it has a `good` var or cell. To cheer anywhere else, set `scene.leet.pose`.
- Both reference solutions must pass every test. Tests cover the worked example, the smallest valid input, duplicates or negatives where relevant, and one case that breaks the most likely wrong solution.

### 2.3 Complete example: `src/content/lessons/two-sum.ts`

```ts
import type { ArrayStructure, HashMapStructure, Lesson, Pointer, Tone } from '../schema';

const NUMS = [6, 2, 15, 9, 3];
const TARGET = 11;

const nums = (tones: Partial<Record<number, Tone>> = {}, pointers: Pointer[] = []): ArrayStructure => ({
  kind: 'array',
  id: 'nums',
  label: 'nums',
  cells: NUMS.map((value, i) => ({ value, tone: tones[i] })),
  pointers,
});

const seen = (keys: number[], tones: Partial<Record<number, Tone>> = {}): HashMapStructure => ({
  kind: 'hashmap',
  id: 'seen',
  label: 'seen (value → index)',
  entries: keys.map((key) => ({ key, value: NUMS.indexOf(key), tone: tones[key] })),
});

const lesson: Lesson = {
  slug: 'two-sum',
  title: 'Two Sum',
  source: { leetcode: 1, name: 'Two Sum' },
  pattern: 'Hash map lookup',
  difficulty: 'easy',
  minutes: 8,
  youllLearn: [
    'Why checking every pair costs O(n²)',
    'How to turn "find a pair" into "have I seen the partner?"',
    'Using a hash map for constant-time lookups',
    'Why you check the map before you insert',
  ],

  problem: {
    statement: [
      'You are given a list of integers `nums` and an integer `target`. Exactly one pair of **different positions** in the list holds values that add up to `target`.',
      'Return the two positions as a list `[i, j]` with `i < j`.',
    ],
    examples: [
      { input: 'nums = [6, 2, 15, 9, 3], target = 11', output: '[1, 3]', note: '2 + 9 = 11' },
      { input: 'nums = [5, 5], target = 10', output: '[0, 1]', note: 'Equal values are fine as long as the positions differ.' },
    ],
    constraints: [
      '2 <= nums.length <= 10,000',
      '-1,000,000,000 <= nums[i], target <= 1,000,000,000',
      'Exactly one valid pair exists.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'You get a list of numbers and a target. Exactly one pair of numbers in the list adds up to the target. Your job is to return the **positions** of that pair, smaller index first.',
        'Here `nums = [6, 2, 15, 9, 3]` and `target = 11`. The answer is `[1, 3]`, because `2 + 9 = 11`.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Let's find that pair without checking every combination." },
      scene: {
        structures: [nums({ 1: 'good', 3: 'good' })],
        vars: [{ name: 'target', value: TARGET }],
      },
    },
    {
      kind: 'concept',
      title: 'Brute force: every pair',
      body: [
        'The obvious plan: pick a number, then check it against every number after it. Pointer `i` holds the first number while `j` scans the rest.',
        'It works, but each number gets compared with nearly every other one. For a list of `n` numbers that is about `n² / 2` checks, which gets slow fast.',
      ],
      scene: {
        structures: [nums({ 0: 'compare', 1: 'compare' }, [{ id: 'i', at: 0 }, { id: 'j', at: 1 }])],
        vars: [{ name: 'target', value: TARGET }, { name: 'sum', value: 8, tone: 'bad' }],
        caption: '6 + 2 = 8, not 11. Move j and try again.',
      },
    },
    {
      kind: 'concept',
      title: 'Flip the question',
      body: [
        'Stop asking *which two numbers add up to 11?* Ask this instead: *I am holding 6, so what number would finish the pair?*',
        'There is only one answer: `11 - 6 = 5`. Call it `need`. For every number the partner is fixed, so the problem becomes: have I already seen `need`?',
      ],
      scene: {
        structures: [nums({ 0: 'active' }, [{ id: 'i', at: 0 }])],
        vars: [{ name: 'target', value: TARGET }, { name: 'need', value: 5, tone: 'active' }],
      },
    },
    {
      kind: 'concept',
      title: "Remember what you've seen",
      body: [
        'To answer *have I seen it?* instantly, keep a hash map called `seen` that stores each value with its index.',
        'At `i = 0` we need 5. The map is empty, so no luck. Before moving on, store `6 → 0` so later numbers can find it.',
      ],
      leet: { pose: 'hint', says: 'A hash map lookup takes the same time no matter how big the map gets.' },
      scene: {
        structures: [nums({ 0: 'active' }, [{ id: 'i', at: 0 }]), seen([6], { 6: 'active' })],
        vars: [{ name: 'target', value: TARGET }, { name: 'need', value: 5, tone: 'bad' }],
        caption: '5 is not in seen yet. Store 6 → 0.',
      },
    },
    {
      kind: 'concept',
      title: 'Index 1: still no match',
      body: [
        'Now `i = 1` and the number is 2, so `need = 11 - 2 = 9`.',
        'Is 9 in `seen`? No, the map only holds 6. Store `2 → 1` and move on. Notice there is no inner loop: each number costs one lookup and one insert.',
      ],
      scene: {
        structures: [nums({ 0: 'visited', 1: 'active' }, [{ id: 'i', at: 1 }]), seen([6, 2], { 2: 'active' })],
        vars: [{ name: 'target', value: TARGET }, { name: 'need', value: 9, tone: 'bad' }],
      },
    },
    {
      kind: 'concept',
      title: 'Index 2: nothing yet',
      body: [
        'At `i = 2` the number is 15, so `need = 11 - 15 = -4`. Negative numbers are fine, the arithmetic is the same.',
        '-4 is not in the map. Store `15 → 2` and keep walking. The map now remembers everything to the left of `i`.',
      ],
      scene: {
        structures: [
          nums({ 0: 'visited', 1: 'visited', 2: 'active' }, [{ id: 'i', at: 2 }]),
          seen([6, 2, 15], { 15: 'active' }),
        ],
        vars: [{ name: 'target', value: TARGET }, { name: 'need', value: -4, tone: 'bad' }],
      },
    },
    {
      kind: 'concept',
      title: 'Index 3: match',
      body: [
        'At `i = 3` the number is 9, so `need = 11 - 9 = 2`.',
        'This time the lookup hits: `seen` has `2 → 1`. The partner sits at index 1 and we are at index 3, so we return `[1, 3]`. Found in a single pass.',
      ],
      leet: { pose: 'cheer', says: 'One pass, one map. That is the whole trick.' },
      scene: {
        structures: [
          nums({ 0: 'visited', 1: 'good', 2: 'visited', 3: 'good' }, [{ id: 'i', at: 3 }]),
          seen([6, 2, 15], { 2: 'good' }),
        ],
        vars: [{ name: 'target', value: TARGET }, { name: 'need', value: 2, tone: 'good' }],
        caption: 'seen[2] = 1, so the answer is [1, 3].',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `two_sum` (Python) or `twoSum` (JS / TS) using the one-pass hash map idea. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You swapped a slow nested loop for a single pass by remembering what you had already seen.'],
      takeaways: [
        '**Flip the question.** For each number the partner is fixed: `target - num`.',
        '**Trade memory for speed.** A hash map answers *have I seen this?* in constant time.',
        '**Check first, store second.** That order stops a number pairing with itself.',
        '**Spot the pattern.** "Find a pair that satisfies X" often means a hash map of what you have seen so far.',
      ],
      complexity: { time: 'O(n)', space: 'O(n)' },
    },
  ],

  challenge: {
    entry: { python: 'two_sum', typescript: 'twoSum' },
    params: [
      { name: 'nums', type: 'json' },
      { name: 'target', type: 'json' },
    ],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    # Return [i, j] with i < j where nums[i] + nums[j] == target.
    pass
`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
  // Return [i, j] with i < j where nums[i] + nums[j] === target.
  return [];
}
`,
    },
    solution: {
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}  # value -> index
    for i, num in enumerate(nums):
        need = target - num
        if need in seen:
            return [seen[need], i]
        seen[num] = i
    return []
`,
      typescript: `function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>(); // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    const j = seen.get(need);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return [];
}
`,
    },
    tests: [
      { name: 'worked example', args: [[6, 2, 15, 9, 3], 11], expected: [1, 3] },
      { name: 'two equal values', args: [[5, 5], 10], expected: [0, 1] },
      { name: 'pair at both ends', args: [[1, 5, 8, 3], 4], expected: [0, 3] },
      { name: 'negative numbers', args: [[-4, 10, 7, -6], 1], expected: [2, 3] },
      { name: 'cannot reuse one position', args: [[3, 4, 2], 6], expected: [1, 2] },
      { name: 'zeros', args: [[0, 7, 0], 0], expected: [0, 2] },
    ],
    hints: [
      'For each number, work out the value that would complete the pair: `target - num`.',
      'Keep a map from value to index for the numbers you have already passed.',
      'Look up `need` in the map before you store the current number.',
    ],
  },
};

export default lesson;
```

---

## 3. Visual engine

### 3.0 Target feel (added 2026-11-23 after reviewing phase 2)

Reference: `reference/target-scene.webp` (from designed-to-scale). The visual is the hero of every step: a living isometric diorama, not a box of text. Phase 3 isn't done until a Two Sum step stands up next to that screenshot, rendered in our dark neon palette. Everything in 3.1 to 3.4 still applies. This section raises the bar on top of it.

1. **The scene fills the pane.** No card, border or "VISUAL" heading around it. The dotted floor grid runs edge to edge across the whole visual pane at full height, and the data sits centred on it.
2. **Chunky, physical objects.** Thick outline, a soft floor shadow, a lit top face (a 1px highlight on the top edge) and a darker side face. Blocks should look like things you could pick up, not flat diagrams.
3. **Steps play, they don't snap.** On entering a step the scene acts out the operation: the pointer slides to its cell, the value being stored flies as a glowing token along an arc from the array cell into its hash map slot, a lookup pulses the slot it checks. Where it fits, idle motion loops, like tokens flowing along edges the way requests flow in the reference. Derive these from the diff between consecutive scenes (a new block whose text matches an active block flies out of it) so lesson authors write nothing extra. Add an optional `flows` field to `Scene` only for cases the diff can't express. **Replay** and **Pause** sit top right of the pane as small `Button3D`s. Reduced motion shows the end state.
4. **HUD tiles.** The step vars become stat tiles across the top of the pane (pixel icon, small label, big value), like the reference's Users / Requests tiles. A tile flashes in its tone when its value changes.
5. **Pill labels.** Structure titles and callouts are rounded pills floating above their object with a thin leader line, not loose text.
6. **Leet lives in the scene.** The mascot stands on the floor as an isometric pixel character beside the active element and walks with it (for example along the array with `i`), and celebrates when a step finds the answer. The tip box in the text rail stays.
7. **Legend** at the bottom left, showing only the tones the lesson uses.

### 3.1 Style: true isometric

Decided by Michael on 2026-11-23. The scene is a dark floor with a dotted diamond grid, and every piece of data is a block standing on it, drawn in 2:1 pixel-art isometric as one inline SVG.

- A tile is 64px wide and 32px tall on screen. One height unit is 16px.
- A block is a slab with three visible faces (top, left, right), a 2px rim, a 1px light line along the back edges of the top face, and a soft blurred floor shadow. It is inset 4px (x) and 2px (y) from its tile so neighbours show a gap. The rim is a visible colour, not ink (an ink outline vanishes on the dark floor): `#4a64b4` on idle blocks, the tone's deep colour pulled slightly toward ink otherwise. Faces use `shape-rendering="crispEdges"`, the rim and other outlines use the default (anti-aliased) rendering.
- Draw order, back to front: floor grid, zones, edges, shadows, blocks sorted by `x + y` then `z`, then markers and labels.

Isometric costs legibility on a phone, so these rules are not optional:

1. **Text stays upright**, everywhere, never sheared. Values sit on the top face, centred, except where the next cell in a row hides the right half of the face: there the value moves into the left half (`textDx`, see 3.3). Stack items, whose top is covered, carry their value upright and centred on the right face. Pointers, labels and Leet are upright billboards.
2. **Rows run along the x axis** (down and to the right on screen) and never wrap.
3. **Trees and graphs are placed in screen-aligned rows and columns**, so a tree still reads top down. Each node is still an isometric block on the floor.
4. **A lesson's composed scene is at most 480 by 480 px** at scale 1, so a 390px phone never shrinks value text below about 11px. `check-content` enforces this.
5. **No pan, zoom or camera moves.**

### 3.2 API

```tsx
<Visual scenes={Scene[]} index={number} />
```

`scenes` is every scene of the lesson in step order (challenge and scene-less recap steps repeat the previous scene), `index` is the current one. Passing all scenes lets the engine compute one bounding box for the whole lesson, so the view never jumps between steps. Reduced motion is read from the store hook, not a prop.

Pipeline, each stage a pure function so it can be unit tested and reused by `check-content`:

1. `layout/<kind>.ts`: `(structure) => LayoutResult` in world coordinates (tiles).
2. `compose.ts`: projects each structure to screen pixels and stacks structures vertically, centred, with a 24px gap between what is actually drawn (a skyline of element rects, not bounding boxes, so a diagonal row does not waste the floor under its low end). A structure marked `beside` goes to the right of the previous one instead (32px gap, bottom-aligned). Each structure keeps one lesson-wide shape (everything it draws in any scene), so it never moves between steps. Offsets snap to the (32, 16) tile lattice so every structure sits on the shared floor grid. Prefixes keys with the structure id, places Leet and returns the flat screen-space lists plus bounds.
3. `choreo.ts`: plans the step choreography from the diff of two consecutive scenes (3.4).
4. `Visual.tsx`: renders the SVG, fitted once to the lesson-wide bounds around the HUD, never above 1.5x. HUD tiles, Replay and Pause, caption and legend are HTML over the SVG.

```ts
// visual/iso.ts
export const TW = 64, TH = 32, ZU = 16; // tile width, tile height, pixels per height unit
export const LIFT = 0.5;                // height units an active block floats above the floor
export const project = (x: number, y: number, z = 0): [number, number] =>
  [(x - y) * TW / 2, (x + y) * TH / 2 - z * ZU];
export const unproject = (sx: number, sy: number): [number, number] => // floor point under a screen point
  [sx / TW + sy / TH, sy / TH - sx / TW];

interface LayoutResult { blocks: BlockSpec[]; edges: EdgeSpec[]; zones: ZoneSpec[]; markers: MarkerSpec[]; labels: LabelSpec[] }

// A block fills the tile [x, x+1] by [y, y+1], starts z units above the floor and is h units tall.
// x and y may be fractional (trees and graphs).
interface BlockSpec  { key: string; x: number; y: number; z: number; h: number; text: string; textOn: 'top' | 'side';
                       textDx?: number;          // top-face value offset, screen px at scale 1, default 0
                       sub?: string; tone: Tone; role?: 'key' | 'value' }                     // role: hash map halves
interface EdgeSpec   { key: string; points: [number, number][]; tone: Tone; arrow: boolean; label?: string;
                       cap?: 'arrow' | 'cross' | 'none'; flow?: boolean }                     // polyline on the floor
interface ZoneSpec   { key: string; x: number; y: number; w: number; d: number; tone: Tone; style?: 'outline' | 'plate' } // floor rectangle
interface MarkerSpec { key: string; x: number; y: number; z: number; text: string; tone: Tone; for?: string } // pointer: down arrow and pill floating above a floor point
interface LabelSpec  { key: string; x: number; y: number; text: string; kind: 'title' | 'tag' | 'index' | 'note';
                       for?: string; place?: 'above' | 'below'; align?: 'center' | 'end' }   // upright text anchored to a floor point
```

Value text is JetBrains Mono 700 at 16px, dropping to 12px for 4 characters, on the top face and on stack side faces alike. Below scale 1 small text is boosted so it stays legible on a phone (values about 13.6px, pills and indices about 11px at 390px). Labels: `title` is a pill floating above (or below) its anchor with a thin leader line, `tag` is the same pill centred on its anchor with no leader, `index` is Silkscreen floor text, `note` small mono floor text. All screen coordinates are integers at rest.

Edge rendering: block faces use `shape-rendering="crispEdges"` for the pixel look, rims and outlines keep the default anti-aliased rendering.

### 3.3 Structures

| Kind | Layout |
|---|---|
| `array` | Cells along x at `y = 0`, `h` from the cell (default 1.5). Index labels on the floor in front of each cell. Pointer markers float above their cell, and several on one cell stack upward. `window` draws a dashed zone around the range. The `bars` variant sets `h = 0.75 + 3.25 * value / max`. Strings are arrays of single characters. |
| `hashmap` | Entries along x on a floor plate, 1.5 tiles apart so the gap between entries is wider than the seam inside one. Each entry is two touching blocks: key at the back (`y = 0`, h 1.5), a shorter, dimmer value block in front (`y = 0.875`, h 0.75). A set (no values) is the key row only. New entries append at the end. Empty slots up to the lesson-wide entry count show as dashed floor tiles. |
| `stack` | A pile on one tile on a floor plate. Each item is 1.5 units tall, stacked along z, value upright on the right face. A "top" marker floats above the pile. |
| `queue` | A row along x like an array (default h 1.5) on a floor plate, with "front" and "back" tag pills on the row's axis beyond the two ends, at least 6px clear of the blocks. |
| `linkedList` | Nodes along x on every second tile, floor arrows between them at `y = 0.72` (the floor just behind a block is hidden by it). A `next` that is not the following node routes along the lane in front of the row (`y = 1.5`). A node whose `next` is null gets a stub ending in a small pixel cross. |
| `tree` | Screen-aligned: column = in-order position at 48px, row = depth at 64px, converted with `unproject`. Edges are floor lines from parent to child, no arrowheads. |
| `graph` | Screen-aligned: `at` times (96px, 64px), converted with `unproject`. Edges are straight floor lines trimmed at least 20px short of each node centre, and further where needed so the end (and its arrowhead when `directed`) clears the block outline. Optional upright label pill at the midpoint. |
| `grid` | Cell `(r, c)` on tile `(c, r)`, `h` from the cell (default 1). Pointer markers float above their cell. `Cell.sub` is not drawn (the floor in front of a cell is the next row's cell). |

Each structure's `label` is an upright title pill. `Cell.sub` is a small floor label in front of the block (except in grids). Edges and lines lit in a tone carry small glowing tokens flowing along them while idle (EdgeSpec `flow`).

Value position in rows (arrays and queues): cell k+1 is drawn in front of cell k and covers the right half of its top face when taller. A value moves into the left half of the top face (`textDx = -12`) when the next cell's top (`z + h`, `LIFT` included) is at least 0.75 units higher than its own, else it stays centred. The offset tweens with the height. `bars` values always sit in the left half, so the row reads consistently.

Tone rendering, the same for every kind. Top face takes the tone colour, the right face its deep colour, the left face an even mix of the two, a rim in the deep colour pulled slightly toward ink, and `--ink` text.

| Tone | Look |
|---|---|
| `idle` | Top `#1c2a55`, left `#16224a`, right `#101a3b`, rim `#4a64b4`, `--text` text (a step brighter than the floor and plates, so idle blocks read as objects) |
| `active` | Cyan with a soft glow and a slow bob, floating `LIFT` above the floor while its shadow stays put. Grid cells do not float. |
| `compare` | Amber |
| `good` | Green |
| `bad` | Red |
| `visited` | Opaque dim violet (violet mixed toward the idle top), `--text` text. Opaque so dense scenes do not show through. |
| `muted` | Idle colours at 45% opacity, flattened to `h = 0.25`. Grid cells keep their height and are only dimmed: opaque, idle colours pulled halfway to the floor, `--text-dim` text (a translucent full-height cell would show its neighbours through it). |

Index labels take the colour of their cell's tone: idle a step lighter than `--text-dim`, visited a violet clearly lighter than the visited face, muted `--text-dim`, other tones their accent.

HUD tiles (3.0 item 4) show the var name exactly as written (it is a code identifier) in JetBrains Mono at about 11px in `--text-dim`, no uppercase, above the big value.

**Leet in the scene** is an upright billboard of the front sprite with a right-side extrusion and a stepped floor shadow, not a 3/4 isometric drawing (unreadable at 48px). It stands on a whole floor tile as close as possible to its anchor (`scene.leet.at`, else the first structure's first pointer target, else the first `active` block, else the first block) without touching any block, marker, label or edge, is depth-sorted with the blocks, and walks when its tile changes. Pose: `scene.leet.pose` always wins; otherwise it cheers only on the last distinct scene of the lesson (the final scene and any trailing steps repeating its structures and vars) when that scene has a `good` var or cell, and idles everywhere else.

### 3.4 Transitions

Every spec renders as a Motion element keyed by `key` inside `AnimatePresence`, so the diff between two steps is automatic.

| Change | Animation |
|---|---|
| Same key, new position | Spring (`stiffness 300, damping 26`, about 350ms). Edges, zones and markers follow their endpoints. |
| Same key, new tone | Face colours crossfade in 200ms. Floating up or settling down is a spring with a slight overshoot. |
| Same key, new height | Tween 200ms. |
| Same key, new text | Pop: scale 1 to 1.15 to 1 in 180ms. |
| New key | Drops onto the floor: opacity 0 to 1, falling 16px, 250ms, staggered 30ms in draw order, total capped at 300ms. New edges draw from 0 to full length in 200ms. |
| Key removed | Sinks 8px and fades in 150ms. |
| Var chip value change | 200ms flash in the chip's tone. |

Depth order always follows the target step, so blocks re-sort at the start of a transition. Reduced motion sets every duration to 0, so steps swap instantly.

**Choreography** (3.0 item 3, `choreo.ts`, pure). Entering a step forward by exactly one, or Replay, plays the diff in three phases. Back and multi-step jumps play only the plain tweens above.

1. Slide: pointer markers, moved blocks and Leet spring to their new spots (`slide` 320ms; when nothing moves the next phase starts after `idleLead` 120ms).
2. Lookups, "check first, store second": a block whose tone changes to `good`, `bad` or `compare` pulses in its new tone; a new or changed var with tone `good`, `bad` or `active` whose value matches a hash map key pulses that key; a `bad` var matching no key flashes the first hash map red (title pill and a ring on its plate). Pulse and miss last 620ms, and flights wait `lookupGap` 300ms when there was a lookup.
3. Flights: a new block whose text matches an `active` or `compare` block in another structure (or that block's index label) gets a glowing token flying along an arc from it (`fly` 420ms, staggered 130ms in draw order). The block stays hidden until the token lands, then drops in (250ms). `flows` with `loop: false` fly one plain token in this phase.

---

## 4. Sandbox

### 4.1 UI

`<Sandbox lesson={Lesson} />`, in the right column on desktop and the `CODE` tab on phones (section 1). Top row: language tabs (`Python`, `JS / TS`), a Problem button, Reset. Then the editor, then Run (primary `Button3D`, also Cmd/Ctrl+Enter), Hint, and Show solution. Then the test list.

- Each test row shows a pixel tick, cross or clock, the name and the time taken. Expanding it shows the arguments, expected value, returned value, captured stdout and any error. The header reads "4 / 6 passed".
- While Pyodide is loading, Run shows "Loading Python" with a pixel progress bar. This happens once per visit.
- All tests passing triggers Leet `cheer` and marks the lesson solved. The first failing run in a session shows Leet `oops` with a one-line nudge. Hint reveals the next hint in a Leet `hint` bubble.
- Show solution asks for confirmation unless the lesson is already solved, then shows the reference solution read-only with a "Back to my code" button. The draft is untouched.

### 4.2 Workers and runner

One module worker per language, created by `runner.ts` with `new Worker(new URL('./workers/x.worker.ts', import.meta.url), { type: 'module' })`. Nothing user-written is ever evaluated on the main thread.

```ts
// runner.ts
createRunner(language: Language): {
  warm(): Promise<void>;                               // spawn the worker and load the runtime
  run(code: string, challenge: Challenge, onUpdate: (r: TestResult[]) => void): Promise<RunSummary>;
  dispose(): void;
};
type TestStatus = 'pending' | 'running' | 'pass' | 'fail' | 'error' | 'timeout' | 'skipped';
interface TestResult { name: string; status: TestStatus; actual?: Json; expected: Json; stdout: string; error?: { message: string; line?: number }; ms?: number }
interface RunSummary { results: TestResult[]; compileError?: { message: string; line?: number }; passed: number; total: number }

// protocol.ts
type ToWorker = { type: 'run'; runId: number; code: string; entry: string; params: Challenge['params']; returns: ValueType; tests: TestCase[] };
type FromWorker =
  | { type: 'ready' }
  | { type: 'compile-error'; runId: number; message: string; line?: number }   // syntax error, or the entry function is missing
  | { type: 'test-start'; runId: number; index: number }
  | { type: 'test-end'; runId: number; index: number; ok: true; actualJson: string; stdout: string; ms: number }
  | { type: 'test-end'; runId: number; index: number; ok: false; error: { message: string; line?: number }; stdout: string; ms: number }
  | { type: 'done'; runId: number };
```

Phase 2 added three worker messages to this list: `progress` (runtime load fraction), `load-error` and `crash`. `src/sandbox/protocol.ts` is the source of truth from here on. Each language has one runner shared by the whole page, so Pyodide loads once per visit.

Workers only execute and serialise. The pass or fail decision is made once, on the main thread, in `compare.ts`, so both languages are judged identically:

- `exact`: deep equality on JSON values, numbers equal within `1e-9`.
- `anyOrder`: both must be arrays, sorted by their JSON string, then `exact`.
- `anyOrderNested`: sort each inner array first, then as `anyOrder`.

### 4.3 Pyodide

- The Python worker loads Pyodide by URL import, which keeps it out of the bundle: `const { loadPyodide } = await import(/* @vite-ignore */ PYODIDE_URL + 'pyodide.mjs')` then `loadPyodide({ indexURL: PYODIDE_URL })`, with `PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.8/full/'` defined once in `sandbox/workers/pyodideUrl.ts`. Verified reachable with CORS on 2026-11-23. The `pyodide` npm package is a dev dependency at the same version, for types and for `check-content`.
- No extra packages. Standard library only.
- When it loads: lazily. Nothing loads because the sandbox is on screen. `warm()` runs for the selected language on the first focus of the editor, or on the first Run (which warms before running), whichever comes first. So Pyodide loads only once the editor is focused or Run is pressed while Python is selected. The JS worker follows the same rule.
- Load failure (offline, CDN blocked) shows an inline error with a Retry button and a note that JS / TS still works.

### 4.4 Harness

The harness logic lives in `sandbox/harness/python.ts` and `sandbox/harness/js.ts` as functions that take a runtime and a callback, so the workers and `scripts/check-content.ts` run the same code.

Python, per run:

1. Create a fresh namespace. Exec the prelude (`ListNode`, `TreeNode`, and the JSON codecs for `linkedList` and `tree`), then `exec(compile(code, 'solution.py', 'exec'), ns)`. A `SyntaxError` becomes `compile-error` with its line.
2. Look up `entry` in the namespace. Missing or not callable becomes `compile-error`: "Define a function named `two_sum`."
3. For each test: decode the args from JSON (a fresh copy per test), redirect stdout to a buffer, time the call, encode the result (tuples become lists, list and tree nodes go through the codecs), and `json.dumps` it. A value that cannot be serialised is an error that says what was returned. Returning `None` is a failed test, not an error.
4. An exception becomes `{ message: 'IndexError: list index out of range', line }`, where `line` is the last traceback frame in `solution.py`.

JS / TS, per run:

1. Transpile with Sucrase, `transforms: ['typescript', 'imports']`. A syntax error becomes `compile-error` with its line.
2. Evaluate with `new Function('exports', 'console', js + '; return typeof ENTRY !== "undefined" ? ENTRY : exports.ENTRY;')`, so both a plain declaration and an `export` work. `console` is a shim that captures `log`, `info`, `warn` and `error`.
3. For each test: fresh args from JSON, time the call, `JSON.stringify` the result. `undefined` is an error: "Your function returned undefined."
4. Line numbers on runtime errors are best effort. The message is always shown.

Both languages: stdout is capped at 10 KB per test, and the prelude classes are `ListNode(val, next)` and `TreeNode(val, left, right)` with the usual field names.

### 4.5 Timeouts

Workers run user code synchronously, so the watchdog lives in `runner.ts`. It starts a timer on every `test-start` (`challenge.timeoutMs`, default 2000ms for JS and 4000ms for Python). If the timer fires, the runner calls `worker.terminate()`, marks that test `timeout` and the rest `skipped`, then spawns and warms a new worker in the background. Pyodide re-init after a kill is served from cache and takes a few seconds, during which Run shows the loading state.

Terminating the worker is chosen over Pyodide's `SharedArrayBuffer` interrupt because it needs no cross-origin isolation headers and behaves the same for both languages. Pyodide load itself has a 30s timeout.

### 4.6 `npm run check-content [slug]`

A Node script (run with `tsx`) and the definition of done for every lesson. For each lesson it checks:

- Schema rules from section 2.1: step count, exactly one challenge step, recap last, word limits, size limits, every pointer, `next`, `left`, `right` and edge reference resolves.
- Copy rules: no em dashes, no "Leetify", no empty strings.
- Scene bounds: the lesson's composed scenes fit 480 by 480 px (section 3.1). This check uses `visual/compose.ts`, so it is added in phase 3A, not phase 2.
- Both reference solutions pass every test, and both starters compile and fail at least one test. Python runs through the `pyodide` npm package in Node, TS through Sucrase, both through the shared harness.

It prints one line per lesson and exits non-zero on any failure.

---

## 5. Design

### 5.1 Tokens (`src/styles/tokens.css`, exposed through Tailwind `@theme`)

| Token | Value | Use |
|---|---|---|
| `--bg-0` | `#070b1a` | Page |
| `--bg-1` | `#0b1228` | Panels, editor |
| `--bg-2` | `#121c3a` | Raised surfaces, idle block face |
| `--line` | `#1e2c56` | Borders, grid lines, floor dots |
| `--line-bright` | `#33488a` | Outline of idle blocks |
| `--text` | `#e6f0ff` | Body text |
| `--text-dim` | `#8fa3c8` | Secondary text |
| `--cyan` / `--cyan-deep` | `#22e0f0` / `#0e8fa3` | Main accent, `active` tone / its edge |
| `--magenta` / `--magenta-deep` | `#ff4fd8` / `#a3207f` | Second accent, focus rings |
| `--green` / `--green-deep` | `#4dff9a` / `#1f9a57` | Pass, `good` |
| `--red` / `--red-deep` | `#ff5470` / `#a32840` | Fail, `bad` |
| `--amber` / `--amber-deep` | `#ffd166` / `#a8842c` | `compare`, warnings |
| `--violet` / `--violet-deep` | `#9b8cff` / `#5546b8` | `visited` |
| `--ink` | `#050814` | Text on bright faces, hard shadows, sprite outline |

Type, all self-hosted:

| Role | Font | Use |
|---|---|---|
| Display | Pixelify Sans 600, 700 | Page and step titles. Hero title gets `text-shadow: 0 0 16px` cyan at 55%. |
| Label | Silkscreen 400, uppercase, `letter-spacing: 0.12em`, cyan | Chips, tab names, "STEP 3 / 9", block index labels, Leet's name tag |
| Body | Space Grotesk 400, 500, 700 | Step text, problem statement |
| Code | JetBrains Mono 400, 700 | Editor, inline code, test output, block values |

Sizes: 12, 14, 16 (body), 20, 28, 40, 56 (hero, 36 on phones). Body line height 1.6.

Spacing is a 4px grid: 4, 8, 12, 16, 24, 32, 48, 64. Corners are square. Borders are 2px solid. Panels use a `pixel-corners` utility (a `clip-path` that notches each corner by 4px). Breakpoints: 640, 1024 and 1280 (the lesson page's three-column layout).

Page background: `--bg-0` with a 32px grid of 1px lines in `--line` at 35% opacity, fading out toward the bottom with a mask. No scanlines, no animated background.

Focus: `outline: 2px solid var(--magenta); outline-offset: 4px` on every interactive element. Body text contrast is at least 4.5:1.

Reduced motion: effective when `prefs.motion` is `'reduced'`, or `'auto'` and the OS asks for it. It sets a `data-motion="reduced"` attribute on `<html>`. Under it, the visual engine swaps instantly, buttons change position with no transition, Leet shows a still frame, and nothing glows or pulses.

### 5.2 `Button3D`

Mechanics follow Josh Comeau's 3D button article (three stacked layers, the front moves, the rest stay), written from scratch with our own values and a hard pixel look.

```html
<button class="btn3d" data-variant="primary" data-size="md">
  <span class="btn3d-shadow"></span>
  <span class="btn3d-edge"></span>
  <span class="btn3d-front">Run</span>
</button>
```

- The button itself has no background, border or padding. Shadow and edge are absolutely positioned and fill it. The front is the only layer in flow.
- Shadow: `--ink` at 60%, no blur. Edge: the variant's deep colour. Front: the variant's colour, `--ink` text, Silkscreen label, 2px `--ink` border.

| State | Front `translateY` | Shadow `translateY` | Transition |
|---|---|---|---|
| Rest | -4px | 2px | 500ms `cubic-bezier(.3, .7, .4, 1)` (settling back) |
| Hover (only inside `@media (hover: hover)`) | -6px | 4px | 260ms `cubic-bezier(.3, .7, .4, 1.6)` (overshoots, reads as a spring) |
| Active | -1px | 1px | 40ms linear |
| Disabled | -1px | 1px | none, front desaturated, `cursor: not-allowed` |

- Hover also applies `filter: brightness(1.1)` to the front.
- Variants: `primary` (cyan), `secondary` (magenta), `success` (green), `ghost` (`--bg-2` front, cyan text and border, `--line` edge). Sizes: `sm` 28px, `md` 36px, `lg` 48px front height.
- Reduced motion: same positions, `transition: none`.
- Renders as `<a>` when given `href`. Never a `div`.

### 5.3 Leet, the mascot

Leet is a small robot with a chunky CRT monitor for a head. Its face is drawn on the screen, which makes expressions a few pixels of change, and it stands on two stubby legs with two short arms.

- Sprite: 24 by 24 pixels. Rendered only at integer scales: 2x (48px, inline), 4x (96px, speech bubble), 6x (144px, hero).
- Palette, 6 colours plus transparent: outline `--ink`, body `--cyan`, body shade `--cyan-deep`, screen `--bg-1`, face pixels `--text`, accent `--magenta` (antenna tip, cheeks, hint spark).
- Poses, 2 frames each, played at 3 frames per second with stepped timing:
  1. `idle`: standing, eyes open, then a blink. Used in the hero, lesson intros and the 404 page.
  2. `hint`: one arm raised and pointing, a magenta spark above the antenna that flickers. Used for hints and tips.
  3. `cheer`: both arms up, happy closed eyes, hops 2px. Used when every test passes and on the recap.
  4. `oops`: eyes as two X shapes, a sweat drop, arms down. Used on the first failing run.
- Format: no image files. `mascot/sprites.ts` holds each frame as 24 strings of 24 characters, one character per palette entry (`.` is transparent). `PixelSprite` turns a frame into one SVG path per colour, merging horizontal runs. The same component and format draw the UI icons in `ui/icons.ts` (16 by 16: tick, cross, clock, arrow, lock, one icon per module).
- `LeetBubble`: a pixel-cornered panel with the sprite on the left, a "LEET" label and the line of text. It slides up 8px on entry (not under reduced motion).

---

## 6. MVP modules and lessons

Fifteen lessons, eight modules. Slugs are the kebab-case LeetCode names. Every engine structure is used at least once.

| # | Module | Lesson (LC number) | Level | Pattern | Structures | Harness notes |
|---|---|---|---|---|---|---|
| 1 | Arrays and Hashing | Two Sum (1) | Easy | Hash map lookup | array, hashmap | done in this spec |
| 2 | Arrays and Hashing | Group Anagrams (49) | Medium | Hash map grouping by key | array, hashmap | `anyOrderNested` |
| 3 | Two Pointers and Sliding Window | Valid Palindrome (125) | Easy | Converging pointers | array | |
| 4 | Two Pointers and Sliding Window | Container With Most Water (11) | Medium | Greedy converging pointers | array (`bars`) | |
| 5 | Two Pointers and Sliding Window | Longest Substring Without Repeating Characters (3) | Medium | Sliding window with a set | array (`window`), hashmap (set) | |
| 6 | Stacks | Valid Parentheses (20) | Easy | Stack matching | array, stack | |
| 7 | Stacks | Daily Temperatures (739) | Medium | Monotonic stack | array (`bars`), stack, array | |
| 8 | Binary Search | Binary Search (704) | Easy | Halving the search space | array | |
| 9 | Linked Lists | Reverse Linked List (206) | Easy | Pointer rewiring | linkedList | `linkedList` in and out |
| 10 | Linked Lists | Middle of the Linked List (876) | Easy | Fast and slow pointers | linkedList | `linkedList` in and out |
| 11 | Trees | Maximum Depth of Binary Tree (104) | Easy | Recursive DFS | tree, stack (call stack) | `tree` in |
| 12 | Trees | Binary Tree Level Order Traversal (102) | Medium | BFS with a queue | tree, queue | `tree` in |
| 13 | Graphs and Grids | Number of Islands (200) | Medium | Grid flood fill | grid | |
| 14 | Graphs and Grids | Course Schedule (207) | Medium | Topological sort | graph, queue | |
| 15 | Dynamic Programming | Climbing Stairs (70) | Easy | 1D DP table | array | |

If the budget runs tight in phase 4, cut in this order: 3, 7, 14. Twelve lessons is the floor.

---

## 7. Phases 2 to 5: agent briefs

For the session running each phase: you are the orchestrator. Give each agent its brief below plus the spec sections it names, nothing else. Agents own the listed paths and must not edit outside them. Every agent finishes by running `npm run typecheck && npm run test` and reports in under 150 words. At the end of the phase, append a line to `USAGE.md` (phase, model, weekly usage % before and after) and commit.

### Phase 2: site shell and sandbox (Opus)

**2.0 Scaffold** (one agent, runs first, alone). Sections 1, 2, 5.1.
Create the Vite app in this folder with the stack and tree from section 1, `git init`, npm scripts (`dev`, `build`, `typecheck`, `test`, `check-content`, `e2e`), `vercel.json`, `tokens.css`, fonts, `schema.ts` and `two-sum.ts` copied from section 2, `modules.ts` with all eight modules from section 6 (lessons without a file render as "Coming soon" cards), and stub `<Visual>` and `<Sandbox>` components with the final props that render a placeholder panel.
Done when: `npm run build` and `npm run typecheck` pass and the dev server shows a page using the tokens.

Then two agents in parallel:

**2A Site shell.** Owns `src/app`, `src/pages`, `src/lesson`, `src/ui`, `src/styles`. Sections 1 (routes and layout), 5.1, 5.2.
Build `Button3D`, the shared UI pieces, the store, Home, the lesson page with header, text rail, pane tabs, stepper bar, course drawer, `ProblemCard`, recap, keyboard navigation, `?step=` sync, progress persistence, the reduced-motion toggle and the 404 page. Use a plain placeholder box where Leet will go.
Done when: Two Sum can be stepped through start to finish with mouse and keyboard at 1280px and 390px wide, progress survives a reload, the button passes every row of the state table in 5.2, and reduced motion removes all transitions. Verify in the browser, not only by tests.

**2B Sandbox.** Owns `src/sandbox`, `scripts`, `tests/unit/sandbox*`. Sections 2.1 (sandbox types), 4.
Build the workers, runner, protocol, shared harnesses with the list and tree codecs, `compare.ts`, the editor, test list, hints, show solution, draft persistence, and `check-content`. Unit test compare modes, both codecs and the harness error paths.
Done when: in the browser, the Two Sum reference solutions pass 6 of 6 in both languages, the starters fail, a syntax error and a runtime error each show a message, `while True: pass` and `while (true) {}` each time out and the next run works, and `npm run check-content` passes.

**2.9 Integrate** (orchestrator, or one agent). Wire the real `<Sandbox>` into the lesson page, write `tests/e2e/smoke.spec.ts` (open Two Sum, step to the challenge, paste the TS solution, run, see 6 of 6; repeat for Python), fix seams.
Phase done when: the e2e test passes and the phase 2 row of the table in `BRIEF.md` is true.

### Phase 3: visual engine (Opus, then a short Fable review)

**3A Engine core** (first). Owns `src/visual`, `src/pages/DevVisuals.tsx`, `tests/unit/visual*`. Sections 2.1 (visual types), 3, 5.1.
Build `iso.ts`, the six render primitives (floor, zone, edge, block, marker, label) with depth sorting, `compose.ts` including `beside`, `Visual.tsx` with every transition in 3.4, vars and caption, reduced motion, and the `array` (including `window` and `bars`), `hashmap`, `stack` and `queue` layouts. Build `/dev/visuals` with a scrubber and at least two sample scene sequences per structure. Add the scene bounds check to `scripts/check-content.ts`, the one file outside your paths you may edit. Unit test `project` and `unproject`, each layout function and the key rule.
Also build everything in 3.0 except Leet in the scene (3C provides the sprite, 3A places it).
Done when: a screenshot of Two Sum step 4 at 1280px, put next to `reference/target-scene.webp`, reads as the same kind of thing (full-pane floor, chunky lit blocks, HUD tiles, pills, a token flying from the array into the map). Also: the lesson plays end to end with correct tweens forward and back, the view never shifts between steps, blocks never draw in the wrong depth order, and values, indices and pointers are readable at 390px wide.

**3B Remaining structures** (after 3A merges). Owns `src/visual/layout/{linkedList,tree,graph,grid}.ts` and their gallery samples. Sections 2.1, 3.3.
Done when: each has gallery sequences that exercise its hard case (list rewiring with a backward arc, a tree gaining tones level by level, a directed graph with edge tones, a grid flood fill) and unit tests.

**3C Leet and icons** (parallel with 3A). Owns `src/mascot`, `src/ui/PixelSprite.tsx`, `src/ui/icons.ts`. Section 5.3.
Draw the four poses and the icon set as character grids, build `PixelSprite`, `Leet` and `LeetBubble`, and replace the placeholders from 2A.
Done when: all four poses read clearly at 48px and 96px, frames animate at 3 fps and freeze under reduced motion, and no image files were added.

**3D Review** (Fable, short). Look at `/dev/visuals` and the Two Sum lesson at 1280px and 390px, with motion on and reduced, next to `reference/target-scene.webp`. First judge whether it meets every point in 3.0. A miss there goes to the top of the punch list. Then judge whether values, indices and pointers stay readable in isometric at phone width, transition feel, depth-order glitches, edge rendering (`crispEdges` or not), and whether Leet looks intentional. Output a punch list of at most 10 items. An Opus agent fixes them.
Phase done when: the punch list is closed.

### Phase 4: lessons (Opus orchestrating, Sonnet agents)

One Sonnet agent per lesson, batches run in parallel. Each agent owns exactly one file, `src/content/lessons/<slug>.ts`. The orchestrator adds slugs to `modules.ts`.

Brief template: "Write the lesson for `<title>` (LeetCode `<n>`), pattern `<pattern>`, using structures `<list>`. Follow sections 2.1 and 2.2 of `SPEC.md` and use `two-sum.ts` as the model for tone, length and helper style. The problem statement must be in your own words with your own example values. Done when `npm run check-content <slug>` passes. Report the step titles and the test names, nothing else."

| Batch | Lessons |
|---|---|
| 1 | Group Anagrams, Valid Palindrome, Container With Most Water, Longest Substring Without Repeating Characters |
| 2 | Valid Parentheses, Daily Temperatures, Binary Search, Climbing Stairs |
| 3 | Reverse Linked List, Middle of the Linked List, Maximum Depth of Binary Tree, Binary Tree Level Order Traversal |
| 4 | Number of Islands, Course Schedule |

After each batch the orchestrator steps through every new lesson in the browser once and checks three things: the scene matches the text on every step, moving elements tween rather than pop, and the statement is not a paraphrase of LeetCode's wording. Fixes go back to the lesson's agent.
Phase done when: `npm run check-content` passes for all lessons and each has had its browser pass.

### Phase 5: polish and launch (Opus)

**5A Quality pass.** Phone layout at 390px and 768px, reduced motion across the whole site, keyboard-only run through one lesson, focus rings, Lighthouse (performance and accessibility at 90 or above on the home page), lazy-load the editor chunk, check the first Python run on a throttled connection.

**5B Launch assets.** Owns `README.md`, `public/og.png`, `docs/`. README with what it is, the demo GIF at the top, screenshots, how it works (data-driven lessons, in-browser runners), how to add a lesson, local setup, credits. The GIF is recorded with Playwright video and converted with ffmpeg: about 12 seconds, stepping through Two Sum then a passing run. Credit line for the README and site footer: "Format inspired by Designed to Scale by @DilumSanjaya", linked to https://designed-to-scale.vercel.app. Fill in `USAGE.md` so the numbers are ready for the LinkedIn post.

**5C Deploy.** Create the public GitHub repo `learn-to-leet`, push, deploy to Vercel, check which of learntoleet.com and learntoleet.dev is free. Creating the repo, the first deploy and buying a domain all need Michael's go-ahead in that session.
Phase done when: the production URL passes the e2e smoke test and the phase 5 row in `BRIEF.md` is true.

---

## 8. Open questions for Michael

None of these block phase 2. Each has a default that will be used unless you say otherwise.

Answered: the visual style is true isometric (section 3.1).

1. **"Themes" in the phase 2 row of the brief.** Read as one dark theme plus the reduced-motion mode. A light theme is out of scope. Default: dark only.
2. **Leet.** Specced as a CRT-headed robot drawn by agents as code-defined pixel grids, so there are no image files and no manual work. If you would rather draw or commission the sprite, it can be swapped in later. Default: agent-drawn.
3. **Launch details for phase 5.** Which GitHub account owns the public repo, and what should the "Built by" link in the footer point to (LinkedIn, portfolio)? Default: your logged-in `gh` account and a LinkedIn link you supply at launch.
4. **Licence.** Default: MIT.
