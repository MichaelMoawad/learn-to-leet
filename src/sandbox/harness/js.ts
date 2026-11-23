// JS / TS harness (SPEC 4.4). Shared by workers/js.worker.ts and scripts/check-content.ts.
// Transpile with Sucrase, evaluate with new Function, call the entry once per test.
import { transform } from 'sucrase';
import type { Json, ValueType } from '../../content/schema';
import type { Emit, ErrorInfo, RunRequest } from '../protocol';
import { STDOUT_LIMIT, STDOUT_TRUNCATED } from '../protocol';

// ---------- prelude ----------

export class ListNode {
  val: Json;
  next: ListNode | null;
  constructor(val: Json = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}

export class TreeNode {
  val: Json;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val: Json = 0, left: TreeNode | null = null, right: TreeNode | null = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

const MAX_NODES = 10000;

class EncodeError extends Error {}

type NodeCtor<T> = new (val: Json) => T;
interface ListLike { val: unknown; next: unknown }
interface TreeLike { val: unknown; left?: unknown; right?: unknown }

export function listFromJson(values: Json[], Ctor: NodeCtor<ListNode> = ListNode): ListNode | null {
  let head: ListNode | null = null;
  for (let i = values.length - 1; i >= 0; i--) {
    const node = new Ctor(values[i]);
    node.next = head;
    head = node;
  }
  return head;
}

export function listToJson(head: unknown): unknown[] {
  const out: unknown[] = [];
  let node = head as ListLike | null | undefined;
  while (node !== null && node !== undefined) {
    if (out.length >= MAX_NODES) throw new EncodeError('The returned linked list has more than 10,000 nodes. Is there a cycle?');
    if (typeof node !== 'object' || !('val' in node)) throw new EncodeError(`Expected a ListNode but found ${describe(node)}.`);
    out.push(node.val);
    node = node.next as ListLike | null | undefined;
  }
  return out;
}

export function treeFromJson(values: Json[], Ctor: NodeCtor<TreeNode> = TreeNode): TreeNode | null {
  if (values.length === 0 || values[0] === null) return null;
  const root = new Ctor(values[0]);
  const queue: TreeNode[] = [root];
  let i = 1;
  for (let q = 0; q < queue.length && i < values.length; q++) {
    const node = queue[q];
    if (i < values.length && values[i] !== null) queue.push((node.left = new Ctor(values[i])));
    i++;
    if (i < values.length && values[i] !== null) queue.push((node.right = new Ctor(values[i])));
    i++;
  }
  return root;
}

export function treeToJson(root: unknown): unknown[] {
  const out: unknown[] = [];
  const queue: unknown[] = [root];
  let seen = 0;
  for (let q = 0; q < queue.length; q++) {
    const node = queue[q] as TreeLike | null | undefined;
    if (node === null || node === undefined) {
      out.push(null);
      continue;
    }
    if (++seen > MAX_NODES) throw new EncodeError('The returned tree has more than 10,000 nodes. Is there a cycle?');
    if (typeof node !== 'object' || !('val' in node)) throw new EncodeError(`Expected a TreeNode but found ${describe(node)}.`);
    out.push(node.val);
    queue.push(node.left ?? null, node.right ?? null);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

export function decodeArg(value: Json, type: ValueType, ctors?: { ListNode?: NodeCtor<ListNode>; TreeNode?: NodeCtor<TreeNode> }): unknown {
  const fresh = JSON.parse(JSON.stringify(value)) as Json;
  if (type === 'linkedList') return listFromJson(fresh as Json[], ctors?.ListNode);
  if (type === 'tree') return treeFromJson(fresh as Json[], ctors?.TreeNode);
  return fresh;
}

// ---------- encoding ----------

function describe(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'bigint') return `a BigInt (${v}n)`;
  if (typeof v === 'function') return 'a function';
  if (typeof v === 'symbol') return 'a Symbol';
  if (typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return 'an array';
  if (v instanceof Map) return `a Map with ${v.size} entries`;
  if (v instanceof Set) return `a Set with ${v.size} items`;
  if (v instanceof Promise) return 'a Promise (the function must not be async)';
  const name = (Object.getPrototypeOf(v) as { constructor?: { name?: string } } | null)?.constructor?.name;
  return name && name !== 'Object' ? `a ${name} object` : 'an object';
}

function toJson(v: unknown, root: unknown, depth = 0): Json {
  const bad = () => {
    let msg = `Your function returned ${describe(root)}, which cannot be turned into JSON.`;
    if (v !== root) msg += ` The problem is ${describe(v)} inside it.`;
    if (root instanceof Set || root instanceof Map) msg += ' Convert it to an array first.';
    return new EncodeError(msg);
  };
  if (depth > 1000) throw new EncodeError('The returned value is nested more than 1,000 levels deep.');
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw bad();
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => toJson(x, root, depth + 1));
  if (ArrayBuffer.isView(v) && !(v instanceof DataView)) {
    return Array.from(v as unknown as ArrayLike<number>, (x) => toJson(x, root, depth + 1));
  }
  if (typeof v === 'object') {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) throw bad();
    const out: { [k: string]: Json } = {};
    for (const [k, x] of Object.entries(v)) out[k] = toJson(x, root, depth + 1);
    return out;
  }
  throw bad();
}

export function encodeResult(value: unknown, returns: ValueType): string {
  if (value === undefined) throw new EncodeError('Your function returned undefined.');
  let v = value;
  if (returns === 'linkedList') v = listToJson(value);
  else if (returns === 'tree') v = treeToJson(value);
  return JSON.stringify(toJson(v, v));
}

// ---------- console shim ----------

function format(v: unknown, depth = 0): string {
  if (typeof v === 'string') return depth ? JSON.stringify(v) : v;
  if (typeof v === 'number' || typeof v === 'boolean' || v === null || v === undefined) return String(v);
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'function') return `[Function ${v.name || 'anonymous'}]`;
  if (typeof v === 'symbol') return v.toString();
  if (depth > 3) return Array.isArray(v) ? '[Array]' : '[Object]';
  if (Array.isArray(v)) return '[' + v.map((x) => format(x, depth + 1)).join(', ') + ']';
  if (v instanceof Map) return `Map(${v.size}) {` + [...v].map(([k, x]) => `${format(k, depth + 1)} => ${format(x, depth + 1)}`).join(', ') + '}';
  if (v instanceof Set) return `Set(${v.size}) {` + [...v].map((x) => format(x, depth + 1)).join(', ') + '}';
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  const name = (Object.getPrototypeOf(v) as { constructor?: { name?: string } } | null)?.constructor?.name;
  const body = '{ ' + Object.entries(v as object).map(([k, x]) => `${k}: ${format(x, depth + 1)}`).join(', ') + ' }';
  return name && name !== 'Object' ? `${name} ${body}` : body;
}

class Capture {
  private parts: string[] = [];
  private size = 0;
  private cut = false;
  write(line: string) {
    if (this.cut) return;
    const room = STDOUT_LIMIT - this.size;
    if (line.length > room) {
      this.parts.push(line.slice(0, room));
      this.size = STDOUT_LIMIT;
      this.cut = true;
    } else {
      this.parts.push(line);
      this.size += line.length;
    }
  }
  value() {
    return this.parts.join('') + (this.cut ? STDOUT_TRUNCATED : '');
  }
}

function makeConsole(target: () => Capture) {
  const log = (...args: unknown[]) => target().write(args.map((a) => format(a)).join(' ') + '\n');
  return { log, info: log, warn: log, error: log, debug: log, trace: log, table: log, dir: log };
}

// ---------- errors and line numbers ----------

const SOURCE_URL = 'solution.js';
let lineOffset: number | null = null;

/** How many lines new Function puts before the body. Measured once, so it holds in any engine. */
function bodyLineOffset(): number {
  if (lineOffset !== null) return lineOffset;
  lineOffset = 2;
  try {
    new Function('a', 'b', 'throw new Error("probe")\n//# sourceURL=ltl-probe.js')();
  } catch (e) {
    const m = /ltl-probe\.js:(\d+)/.exec(String((e as Error).stack));
    if (m) lineOffset = Number(m[1]) - 1;
  }
  return lineOffset;
}

function errorInfo(e: unknown): ErrorInfo {
  if (!(e instanceof Error)) return { message: `Uncaught ${describe(e)}` };
  const info: ErrorInfo = { message: e.message ? `${e.name}: ${e.message}` : e.name };
  const m = new RegExp(`${SOURCE_URL.replace('.', '\\.')}:(\\d+)`).exec(String(e.stack));
  if (m) {
    const line = Number(m[1]) - bodyLineOffset();
    if (line >= 1) info.line = line;
  }
  return info;
}

const IDENT = /^[A-Za-z_$][\w$]*$/;
const declares = (code: string, name: string) => new RegExp(`\\b(class|function|const|let|var)\\s+${name}\\b`).test(code);

// ---------- run ----------

export function runJs(req: RunRequest, emit: Emit, now: () => number = () => performance.now()): void {
  const { runId, entry } = req;
  const compileError = (err: ErrorInfo) => emit({ type: 'compile-error', runId, message: err.message, line: err.line });

  if (!IDENT.test(entry)) return compileError({ message: `Invalid entry name "${entry}".` });

  let js: string;
  try {
    js = transform(req.code, { transforms: ['typescript', 'imports'] }).code;
  } catch (e) {
    const err = e as Error & { loc?: { line: number } };
    return compileError({ message: `SyntaxError: ${err.message.replace(/\s*\(\d+:\d+\)$/, '')}`, line: err.loc?.line });
  }

  // Provide ListNode and TreeNode unless the user declares their own (a duplicate would be a SyntaxError).
  const injected: [string, unknown][] = [];
  if (!declares(req.code, 'ListNode')) injected.push(['ListNode', ListNode]);
  if (!declares(req.code, 'TreeNode')) injected.push(['TreeNode', TreeNode]);

  let current = new Capture();
  const shim = makeConsole(() => current);
  const exportsObj: Record<string, unknown> = {};
  let fn: unknown;
  // If the user declared their own node classes, inputs are built with them.
  const ctors: { ListNode?: NodeCtor<ListNode>; TreeNode?: NodeCtor<TreeNode> } = {};
  try {
    const factory = new Function(
      'exports',
      'console',
      ...injected.map(([n]) => n),
      `${js}\n;return { fn: typeof ${entry} !== "undefined" ? ${entry} : exports.${entry}, ` +
        `ListNode: typeof ListNode !== "undefined" ? ListNode : exports.ListNode, ` +
        `TreeNode: typeof TreeNode !== "undefined" ? TreeNode : exports.TreeNode };\n//# sourceURL=${SOURCE_URL}`,
    );
    const out = factory(exportsObj, shim, ...injected.map(([, v]) => v)) as { fn: unknown; ListNode: unknown; TreeNode: unknown };
    fn = out.fn;
    if (typeof out.ListNode === 'function') ctors.ListNode = out.ListNode as NodeCtor<ListNode>;
    if (typeof out.TreeNode === 'function') ctors.TreeNode = out.TreeNode as NodeCtor<TreeNode>;
  } catch (e) {
    return compileError(errorInfo(e));
  }
  if (typeof fn !== 'function') return compileError({ message: `Define a function named \`${entry}\`.` });

  const call = fn as (...args: unknown[]) => unknown;

  req.tests.forEach((t, index) => {
    emit({ type: 'test-start', runId, index });
    current = new Capture();
    const args = t.args.map((a, i) => decodeArg(a, req.params[i]?.type ?? 'json', ctors));
    const start = now();
    let result: unknown;
    try {
      result = call(...args);
    } catch (e) {
      const ms = round(now() - start);
      emit({ type: 'test-end', runId, index, ok: false, error: errorInfo(e), stdout: current.value(), ms });
      return;
    }
    const ms = round(now() - start);
    try {
      emit({ type: 'test-end', runId, index, ok: true, actualJson: encodeResult(result, req.returns), stdout: current.value(), ms });
    } catch (e) {
      const error = e instanceof EncodeError ? { message: e.message } : errorInfo(e);
      emit({ type: 'test-end', runId, index, ok: false, error, stdout: current.value(), ms });
    }
  });
  emit({ type: 'done', runId });
}

const round = (ms: number) => Math.round(ms * 100) / 100;
