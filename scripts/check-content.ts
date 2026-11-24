// npm run check-content [slug]  (SPEC 4.6)
// The definition of done for every lesson: schema and size rules, copy rules, references, and
// both reference solutions passing while both starters compile and fail. Python runs through the
// `pyodide` npm package, JS / TS through Sucrase, both through the same harness as the browser.
// Lesson files are loaded from disk because import.meta.glob only exists inside Vite.
// Scene bounds: every lesson's composed scenes (Leet included) must fit 480 by 480 px at scale 1
// (SPEC 3.1 rule 4), measured with the engine's own visual/compose.ts.
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import type { CellInput, Challenge, Json, Language, Lesson, Pointer, Scene, Step, Structure } from '../src/content/schema.ts';
import { allLessonSlugs } from '../src/content/modules.ts';
import type { FromWorker, RunRequest, TestEndMessage } from '../src/sandbox/protocol.ts';
import { compareValues, judge } from '../src/sandbox/compare.ts';
import { runJs } from '../src/sandbox/harness/js.ts';
import { runPython, type PyRuntime } from '../src/sandbox/harness/python.ts';
import { composeLesson } from '../src/visual/compose.ts';
import { scenesForLesson } from '../src/lesson/scenes.ts';

const lessonsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/content/lessons');

// ---------- helpers ----------

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const totalWords = (xs: string[]) => xs.reduce((n, s) => n + words(s), 0);
const cellValue = (c: CellInput) => (typeof c === 'object' ? c.value : c);
const IDENT = /^[A-Za-z_$][\w$]*$/;

/** Walk every string in the lesson with a readable path. */
function eachString(v: unknown, at: string, fn: (s: string, at: string) => void): void {
  if (typeof v === 'string') fn(v, at);
  else if (Array.isArray(v)) v.forEach((x, i) => eachString(x, `${at}[${i}]`, fn));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) eachString(x, at ? `${at}.${k}` : k, fn);
}

// ---------- schema, size and reference rules ----------

function checkStructure(s: Structure, where: string, out: string[]): void {
  const err = (m: string) => out.push(`${where} ${s.kind} "${s.id}": ${m}`);
  const cellText = (v: string | number, what: string) => {
    if (String(v).length > 4) err(`${what} "${v}" is longer than 4 characters`);
  };
  const checkCell = (c: CellInput, what: string) => {
    cellText(cellValue(c), what);
    if (typeof c === 'object' && c.h !== undefined && !(Number.isInteger(c.h) && c.h >= 0 && c.h <= 4)) err(`${what} h=${c.h} must be 0 to 4`);
  };
  const uniqueIds = (ids: string[], what: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) err(`duplicate ${what} id "${id}"`);
      seen.add(id);
    }
    return seen;
  };
  const checkPointers = (ps: Pointer[] | undefined, resolves: (at: number | string) => boolean) => {
    uniqueIds((ps ?? []).map((p) => p.id), 'pointer');
    for (const p of ps ?? []) if (!resolves(p.at)) err(`pointer "${p.id}" points at missing "${p.at}"`);
  };

  switch (s.kind) {
    case 'array': {
      if (s.cells.length > 10) err(`has ${s.cells.length} cells, max 10`);
      s.cells.forEach((c, i) => checkCell(c, `cell ${i}`));
      const ids = uniqueIds(s.cells.flatMap((c) => (typeof c === 'object' && c.id ? [c.id] : [])), 'cell');
      checkPointers(s.pointers, (at) => (typeof at === 'number' ? Number.isInteger(at) && at >= 0 && at < s.cells.length : ids.has(at)));
      if (s.window) {
        const [a, b] = s.window;
        if (!(Number.isInteger(a) && Number.isInteger(b) && a >= 0 && a <= b && b < s.cells.length)) err(`window [${a}, ${b}] is outside the cells`);
      }
      if (s.variant === 'bars' && s.cells.some((c) => typeof cellValue(c) !== 'number')) err('bars need numeric values');
      break;
    }
    case 'hashmap':
      if (s.entries.length > 8) err(`has ${s.entries.length} entries, max 8`);
      uniqueIds(s.entries.map((e) => String(e.key)), 'key');
      break;
    case 'stack':
    case 'queue':
      if (s.items.length > 6) err(`has ${s.items.length} items, max 6`);
      s.items.forEach((c, i) => checkCell(c, `item ${i}`));
      uniqueIds(s.items.flatMap((c) => (typeof c === 'object' && c.id ? [c.id] : [])), 'item');
      break;
    case 'linkedList': {
      if (s.nodes.length > 6) err(`has ${s.nodes.length} nodes, max 6`);
      const ids = uniqueIds(s.nodes.map((n) => n.id), 'node');
      for (const n of s.nodes) {
        cellText(n.value, `node "${n.id}" value`);
        if (n.next != null && !ids.has(n.next)) err(`node "${n.id}" next points at missing "${n.next}"`);
      }
      checkPointers(s.pointers, (at) => (typeof at === 'number' ? at >= 0 && at < s.nodes.length : ids.has(at)));
      break;
    }
    case 'tree': {
      if (s.nodes.length > 9) err(`has ${s.nodes.length} nodes, max 9`);
      const ids = uniqueIds(s.nodes.map((n) => n.id), 'node');
      const byId = new Map(s.nodes.map((n) => [n.id, n]));
      for (const n of s.nodes) {
        cellText(n.value, `node "${n.id}" value`);
        if (n.left !== undefined && !ids.has(n.left)) err(`node "${n.id}" left points at missing "${n.left}"`);
        if (n.right !== undefined && !ids.has(n.right)) err(`node "${n.id}" right points at missing "${n.right}"`);
      }
      if (s.root !== null && !ids.has(s.root)) err(`root points at missing "${s.root}"`);
      if (s.root !== null && byId.has(s.root)) {
        // Depth and cycle check from the root.
        const visited = new Set<string>();
        const depth = (id: string | undefined, d: number): number => {
          if (id === undefined || !byId.has(id)) return d - 1;
          if (visited.has(id)) {
            err(`node "${id}" is reached twice (not a tree)`);
            return d;
          }
          visited.add(id);
          const n = byId.get(id)!;
          return Math.max(depth(n.left, d + 1), depth(n.right, d + 1));
        };
        const levels = depth(s.root, 1);
        if (levels > 4) err(`is ${levels} levels deep, max 4`);
      }
      checkPointers(s.pointers, (at) => ids.has(String(at)));
      break;
    }
    case 'graph': {
      const ids = uniqueIds(s.nodes.map((n) => n.id), 'node');
      const spots = new Set<string>();
      for (const n of s.nodes) {
        if (n.value !== undefined) cellText(n.value, `node "${n.id}" value`);
        const [c, r] = n.at;
        if (!(Number.isInteger(c) && Number.isInteger(r) && c >= 0 && c < 5 && r >= 0 && r < 4)) err(`node "${n.id}" at [${c}, ${r}] is outside the 5 by 4 grid`);
        if (spots.has(`${c},${r}`)) err(`two nodes share [${c}, ${r}]`);
        spots.add(`${c},${r}`);
      }
      for (const e of s.edges) {
        if (!ids.has(e.from)) err(`edge from missing "${e.from}"`);
        if (!ids.has(e.to)) err(`edge to missing "${e.to}"`);
      }
      checkPointers(s.pointers, (at) => ids.has(String(at)));
      break;
    }
    case 'grid': {
      const rows = s.rows.length;
      const cols = Math.max(0, ...s.rows.map((r) => r.length));
      if (rows > 6 || cols > 6) err(`is ${rows} by ${cols}, max 6 by 6`);
      if (s.rows.some((r) => r.length !== cols)) err('rows have different lengths');
      s.rows.forEach((r, ri) => r.forEach((c, ci) => checkCell(c, `cell ${ri},${ci}`)));
      uniqueIds((s.pointers ?? []).map((p) => p.id), 'pointer');
      for (const p of s.pointers ?? []) {
        const [r, c] = p.at;
        if (!(r >= 0 && r < rows && c >= 0 && c < (s.rows[r]?.length ?? 0))) err(`pointer "${p.id}" at [${r}, ${c}] is outside the grid`);
      }
      break;
    }
  }
}

function checkScene(scene: Scene, where: string, out: string[]): void {
  if (!scene.structures.length) out.push(`${where}: scene has no structures`);
  const ids = new Set<string>();
  for (const s of scene.structures) {
    if (ids.has(s.id)) out.push(`${where}: duplicate structure id "${s.id}"`);
    ids.add(s.id);
    checkStructure(s, where, out);
  }
  if (scene.structures[0]?.beside) out.push(`${where}: the first structure cannot be "beside"`);
}

const SCENE_MAX = 480;

/** The whole lesson's scenes, composed by the visual engine, fit 480 by 480; flow and Leet keys exist. */
function checkSceneBounds(lesson: Lesson, out: string[]): void {
  const scenes = scenesForLesson(lesson);
  let composed;
  try {
    composed = composeLesson(scenes);
  } catch (e) {
    out.push(`scenes: compose failed: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  const { w, h } = composed.bounds;
  if (w > SCENE_MAX || h > SCENE_MAX) {
    out.push(`scenes: composed bounds ${Math.ceil(w)} by ${Math.ceil(h)} px exceed ${SCENE_MAX} by ${SCENE_MAX} (try \`beside\` or fewer cells)`);
  }
  lesson.steps.forEach((step, i) => {
    const scene = 'scene' in step ? step.scene : undefined;
    if (!scene) return;
    const c = composed.scenes[i];
    const keys = new Set([...c.blocks.map((b) => b.key), ...c.markers.map((m) => m.key)]);
    for (const f of scene.flows ?? []) {
      for (const k of [f.from, f.to]) if (!keys.has(k)) out.push(`step ${i + 1}: flow key "${k}" is not an element in the scene`);
    }
    if (scene.leet?.at && !keys.has(scene.leet.at)) out.push(`step ${i + 1}: leet.at "${scene.leet.at}" is not an element in the scene`);
  });
}

function checkStep(step: Step, i: number, out: string[]): void {
  const where = `step ${i + 1}`;
  if (words(step.title) > 6) out.push(`${where}: title "${step.title}" has more than 6 words`);
  const w = totalWords(step.body);
  const [min, max] = step.kind === 'concept' ? [25, 80] : [10, 80];
  if (w < min || w > max) out.push(`${where}: body has ${w} words, needs ${min} to ${max}`);
  if (step.leet && words(step.leet.says) > 20) out.push(`${where}: Leet says more than 20 words`);
  if (step.kind === 'concept') checkScene(step.scene, where, out);
  if (step.kind === 'recap') {
    if (step.takeaways.length < 3 || step.takeaways.length > 5) out.push(`${where}: ${step.takeaways.length} takeaways, needs 3 to 5`);
    if (step.scene) checkScene(step.scene, where, out);
  }
}

function checkChallenge(c: Challenge, lesson: Lesson, out: string[]): void {
  const langs: Language[] = ['python', 'typescript'];
  for (const l of langs) {
    if (!IDENT.test(c.entry[l] ?? '')) out.push(`challenge: entry.${l} "${c.entry[l]}" is not a valid name`);
  }
  if (c.compare && !['exact', 'anyOrder', 'anyOrderNested'].includes(c.compare)) out.push(`challenge: unknown compare "${c.compare}"`);
  if (c.tests.length < 5 || c.tests.length > 8) out.push(`challenge: ${c.tests.length} tests, needs 5 to 8`);
  if (c.hints.length < 2 || c.hints.length > 3) out.push(`challenge: ${c.hints.length} hints, needs 2 or 3`);
  if (c.timeoutMs !== undefined && !(c.timeoutMs > 0)) out.push('challenge: timeoutMs must be positive');
  const names = new Set<string>();
  c.tests.forEach((t, i) => {
    if (names.has(t.name)) out.push(`challenge: duplicate test name "${t.name}"`);
    names.add(t.name);
    if (t.args.length !== c.params.length) out.push(`test ${i + 1} "${t.name}": ${t.args.length} args for ${c.params.length} params`);
    c.params.forEach((p, j) => {
      if (p.type !== 'json' && !Array.isArray(t.args[j])) out.push(`test ${i + 1} "${t.name}": ${p.name} must be an array for type ${p.type}`);
    });
  });

  // The first tests match problem.examples. Checked where the example text parses as JSON.
  const ex = lesson.problem.examples;
  if (ex.length > c.tests.length) out.push(`challenge: ${ex.length} examples but only ${c.tests.length} tests`);
  ex.forEach((e, i) => {
    const t = c.tests[i];
    if (!t) return;
    const parse = (s: string): Json | undefined => {
      try {
        return JSON.parse(s) as Json;
      } catch {
        return undefined;
      }
    };
    const expected = parse(e.output);
    if (expected !== undefined && !compareValues(expected, t.expected, c.compare)) {
      out.push(`example ${i + 1} output ${e.output} does not match test "${t.name}"`);
    }
    let input = e.input;
    for (const p of c.params) input = input.replace(new RegExp(`\\b${p.name}\\s*=\\s*`), '');
    const args = parse(`[${input}]`);
    if (Array.isArray(args) && args.length === t.args.length && !compareValues(args, t.args)) {
      out.push(`example ${i + 1} input does not match test "${t.name}" args`);
    }
  });
}

function checkLesson(lesson: Lesson, slug: string): string[] {
  const out: string[] = [];
  if (lesson.slug !== slug) out.push(`slug "${lesson.slug}" does not match file name`);
  if (!allLessonSlugs.includes(slug)) out.push('slug is not listed in modules.ts');
  if (!['easy', 'medium', 'hard'].includes(lesson.difficulty)) out.push(`unknown difficulty "${lesson.difficulty}"`);
  if (!(lesson.minutes > 0)) out.push('minutes must be positive');
  if (lesson.youllLearn.length < 3 || lesson.youllLearn.length > 4) out.push(`youllLearn has ${lesson.youllLearn.length} items, needs 3 or 4`);
  if (!lesson.problem.statement.length) out.push('problem statement is empty');
  if (!lesson.problem.examples.length) out.push('problem has no examples');

  const steps = lesson.steps;
  if (steps.length < 5 || steps.length > 10) out.push(`${steps.length} steps, needs 5 to 10`);
  const challenges = steps.filter((s) => s.kind === 'challenge').length;
  if (challenges !== 1) out.push(`${challenges} challenge steps, needs exactly 1`);
  if (steps[steps.length - 1]?.kind !== 'recap') out.push('the last step must be the recap');
  if (steps.filter((s) => s.kind === 'recap').length !== 1) out.push('needs exactly one recap step');
  const leets = steps.filter((s) => s.leet).length;
  if (leets > 4) out.push(`Leet speaks on ${leets} steps, max 4`);
  steps.forEach((s, i) => checkStep(s, i, out));
  checkSceneBounds(lesson, out);
  checkChallenge(lesson.challenge, lesson, out);

  // Copy rules.
  eachString(lesson, '', (s, at) => {
    if (s.includes('—')) out.push(`${at}: contains an em dash`);
    if (/leetify/i.test(s)) out.push(`${at}: contains "Leetify"`);
    if (!s.trim()) out.push(`${at}: empty string`);
  });
  const markdown: [string[], string][] = [
    [lesson.problem.statement, 'problem.statement'],
    ...steps.flatMap((s, i): [string[], string][] => [[s.body, `step ${i + 1} body`], ...(s.kind === 'recap' ? [[s.takeaways, `step ${i + 1} takeaways`] as [string[], string]] : [])]),
  ];
  for (const [paras, at] of markdown) {
    for (const p of paras) {
      if (/^\s*#/m.test(p)) out.push(`${at}: Markdown headings are not allowed`);
      if (/!\[/.test(p)) out.push(`${at}: Markdown images are not allowed`);
      if (/<\/?[a-z][^>]*>/i.test(p)) out.push(`${at}: HTML is not allowed`);
    }
  }
  return out;
}

// ---------- running code ----------

let pyodide: Promise<PyRuntime> | null = null;
function getPyodide(): Promise<PyRuntime> {
  pyodide ??= import('pyodide').then(async ({ loadPyodide }) => (await loadPyodide({ stdout: () => {}, stderr: () => {} })) as unknown as PyRuntime);
  return pyodide;
}

interface Outcome {
  compileError?: string;
  passed: number;
  total: number;
  failures: string[];
}

async function runCode(language: Language, code: string, c: Challenge): Promise<Outcome> {
  const req: RunRequest = { type: 'run', runId: 1, code, entry: c.entry[language], params: c.params, returns: c.returns, tests: c.tests };
  const msgs: FromWorker[] = [];
  const emit = (m: FromWorker) => msgs.push(m);
  if (language === 'python') runPython(await getPyodide(), req, emit);
  else runJs(req, emit);

  const ce = msgs.find((m) => m.type === 'compile-error');
  if (ce && ce.type === 'compile-error') return { compileError: `${ce.line ? `line ${ce.line}: ` : ''}${ce.message}`, passed: 0, total: c.tests.length, failures: [] };
  let passed = 0;
  const failures: string[] = [];
  for (const m of msgs) {
    if (m.type !== 'test-end') continue;
    const r = judge(c.tests[m.index], m as TestEndMessage, c.compare);
    if (r.status === 'pass') passed++;
    else failures.push(`"${r.name}" ${r.error ? r.error.message : `returned ${JSON.stringify(r.actual)}, expected ${JSON.stringify(r.expected)}`}`);
  }
  return { passed, total: c.tests.length, failures };
}

async function checkCode(lesson: Lesson): Promise<{ problems: string[]; summary: string }> {
  const problems: string[] = [];
  const parts: string[] = [];
  const label: Record<Language, string> = { python: 'py', typescript: 'ts' };
  for (const lang of ['python', 'typescript'] as Language[]) {
    const sol = await runCode(lang, lesson.challenge.solution[lang], lesson.challenge);
    if (sol.compileError) problems.push(`${label[lang]} solution does not compile: ${sol.compileError}`);
    else if (sol.passed !== sol.total) problems.push(`${label[lang]} solution fails ${sol.failures.join(', ')}`);
    const start = await runCode(lang, lesson.challenge.starter[lang], lesson.challenge);
    if (start.compileError) problems.push(`${label[lang]} starter does not compile: ${start.compileError}`);
    else if (start.passed === start.total) problems.push(`${label[lang]} starter passes every test`);
    parts.push(`${label[lang]} ${sol.passed}/${sol.total}, starter ${start.compileError ? 'broken' : `${start.passed}/${start.total}`}`);
  }
  return { problems, summary: parts.join('; ') };
}

// ---------- main ----------

async function main(): Promise<void> {
  const only = process.argv[2];
  const files = (await readdir(lessonsDir)).filter((f) => f.endsWith('.ts')).sort();
  let failed = 0;
  let checked = 0;

  for (const file of files) {
    const slug = file.replace(/\.ts$/, '');
    if (only && slug !== only) continue;
    checked++;
    let problems: string[] = [];
    let summary = '';
    try {
      const mod = (await import(pathToFileURL(path.join(lessonsDir, file)).href)) as { default?: Lesson };
      const lesson = mod.default;
      if (!lesson) problems.push('no default export');
      else {
        problems = checkLesson(lesson, slug);
        const code = await checkCode(lesson);
        problems.push(...code.problems);
        summary = code.summary;
      }
    } catch (e) {
      problems.push(`crashed: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (problems.length) {
      failed++;
      console.error(`FAIL ${slug}: ${problems.join('; ')}`);
    } else {
      console.log(`OK   ${slug} (${summary})`);
    }
  }

  if (only && checked === 0) {
    console.error(`FAIL ${only}: no lesson file`);
    failed++;
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
