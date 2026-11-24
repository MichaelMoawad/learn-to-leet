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
  /**
   * Optional token flows the step-to-step diff cannot express (SPEC 3.0 item 3). `from` and `to`
   * are element keys (`structureId/elementId`, e.g. 'nums/2' or 'seen/6'). With `loop` true (the
   * default) small glowing tokens keep flowing from one element to the other while the scene is
   * idle. With `loop: false` one token flies once when the step is entered (forward or Replay).
   * Flows whose endpoints are missing from the scene are ignored.
   */
  flows?: { from: string; to: string; tone?: Tone; loop?: boolean }[];
  /**
   * Optional override for Leet standing in the scene. By default Leet stands beside the first
   * structure's first pointer target (else the first `active` element, else the first structure),
   * idles, and cheers on the lesson's final scene (and trailing steps repeating it) when it has a
   * `good` var or element. `pose` forces a pose, `at` an element key to
   * stand beside, and `hidden` removes Leet from this step.
   */
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
