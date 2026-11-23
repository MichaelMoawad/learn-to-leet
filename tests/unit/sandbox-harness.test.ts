// Harness behaviour in both languages: codecs and every error path (SPEC 4.4).
import { beforeAll, describe, expect, it } from 'vitest';
import type { Challenge, Json, ValueType } from '../../src/content/schema';
import type { FromWorker, RunRequest } from '../../src/sandbox/protocol';
import { STDOUT_LIMIT } from '../../src/sandbox/protocol';
import { ListNode, TreeNode, listFromJson, listToJson, runJs, treeFromJson, treeToJson } from '../../src/sandbox/harness/js';
import { runPython, type PyRuntime } from '../../src/sandbox/harness/python';

let py: PyRuntime;
beforeAll(async () => {
  const { loadPyodide } = await import('pyodide');
  py = (await loadPyodide({ stdout: () => {}, stderr: () => {} })) as unknown as PyRuntime;
}, 60000);

type Lang = 'python' | 'typescript';
function run(lang: Lang, code: string, opts: { entry?: string; params?: Challenge['params']; returns?: ValueType; tests?: { args: Json[] }[] } = {}) {
  const req: RunRequest = {
    type: 'run',
    runId: 7,
    code,
    entry: opts.entry ?? 'f',
    params: opts.params ?? [{ name: 'x', type: 'json' }],
    returns: opts.returns ?? 'json',
    tests: (opts.tests ?? [{ args: [1] }]).map((t, i) => ({ name: `t${i}`, args: t.args, expected: null })),
  };
  const msgs: FromWorker[] = [];
  if (lang === 'python') runPython(py, req, (m) => msgs.push(m));
  else runJs(req, (m) => msgs.push(m));
  return msgs;
}
const ends = (msgs: FromWorker[]) => msgs.filter((m) => m.type === 'test-end');
const first = (msgs: FromWorker[]) => {
  const e = ends(msgs)[0];
  if (!e) throw new Error('no test-end: ' + JSON.stringify(msgs));
  return e;
};
const compileErr = (msgs: FromWorker[]) => {
  const e = msgs.find((m) => m.type === 'compile-error');
  if (!e || e.type !== 'compile-error') throw new Error('no compile-error: ' + JSON.stringify(msgs));
  return e;
};

describe('JS codecs', () => {
  it('round-trips linked lists', () => {
    const head = listFromJson([1, 2, 3]);
    expect(head).toBeInstanceOf(ListNode);
    expect(head?.next?.next?.val).toBe(3);
    expect(listToJson(head)).toEqual([1, 2, 3]);
    expect(listFromJson([])).toBeNull();
    expect(listToJson(null)).toEqual([]);
  });
  it('round-trips level-order trees with gaps', () => {
    for (const t of [[3, 9, 20, null, null, 15, 7], [1, null, 2, 3], [1], [], [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]]) {
      expect(treeToJson(treeFromJson(t))).toEqual(t);
    }
    const root = treeFromJson([1, null, 2, 3]);
    expect(root).toBeInstanceOf(TreeNode);
    expect(root?.left).toBeNull();
    expect(root?.right?.left?.val).toBe(3);
  });
  it('rejects cycles', () => {
    const a = new ListNode(1);
    a.next = a;
    expect(() => listToJson(a)).toThrow(/cycle/);
  });
});

describe.each(['python', 'typescript'] as Lang[])('%s harness', (lang) => {
  const src = {
    python: {
      ok: 'def f(x):\n    print("hi", x)\n    return [x, x * 2]\n',
      syntax: 'def f(x)\n    return x\n',
      missing: 'def g(x):\n    return x\n',
      runtime: 'def f(x):\n    a = []\n    return a[x]\n',
      unserialisable: 'def f(x):\n    return {1, 2}\n',
      listRev: 'def f(head):\n    prev = None\n    while head:\n        head.next, prev, head = prev, head, head.next\n    return prev\n',
      treeMirror: 'def f(root):\n    if root:\n        root.left, root.right = f(root.right), f(root.left)\n    return root\n',
      spam: 'def f(x):\n    for _ in range(5000):\n        print("0123456789")\n    return 1\n',
    },
    typescript: {
      ok: 'function f(x: number): number[] {\n  console.log("hi", x);\n  return [x, x * 2];\n}\n',
      syntax: 'function f(x: number) {\n  return x +;\n}\n',
      missing: 'function g(x: number) {\n  return x;\n}\n',
      runtime: 'function f(x: any) {\n  const a: any = null;\n  return a.b;\n}\n',
      unserialisable: 'function f(x: number) {\n  return new Set([1, 2]);\n}\n',
      listRev: 'export function f(head: ListNode | null) {\n  let prev = null;\n  while (head) { const n = head.next; head.next = prev; prev = head; head = n; }\n  return prev;\n}\n',
      treeMirror: 'function f(root: TreeNode | null): TreeNode | null {\n  if (root) [root.left, root.right] = [f(root.right), f(root.left)];\n  return root;\n}\n',
      spam: 'function f(x: number) {\n  for (let i = 0; i < 5000; i++) console.log("0123456789");\n  return 1;\n}\n',
    },
  }[lang];

  it('runs tests, captures stdout and times them', () => {
    const msgs = run(lang, src.ok, { tests: [{ args: [2] }, { args: [5] }] });
    expect(msgs.map((m) => m.type)).toEqual(['test-start', 'test-end', 'test-start', 'test-end', 'done']);
    const e = first(msgs);
    expect(e).toMatchObject({ ok: true, actualJson: lang === 'python' ? '[2, 4]' : '[2,4]', stdout: 'hi 2\n' });
    expect(e.ms).toBeGreaterThanOrEqual(0);
  });

  it('turns a syntax error into compile-error with its line', () => {
    const e = compileErr(run(lang, src.syntax));
    expect(e.message).toMatch(/SyntaxError/);
    expect(e.line).toBe(lang === 'python' ? 1 : 2);
  });

  it('asks for the entry function when it is missing', () => {
    expect(compileErr(run(lang, src.missing)).message).toBe('Define a function named `f`.');
    expect(compileErr(run(lang, lang === 'python' ? 'f = 3\n' : 'const f = 3;\n')).message).toBe('Define a function named `f`.');
  });

  it('reports a runtime error with its line', () => {
    const e = first(run(lang, src.runtime));
    expect(e.ok).toBe(false);
    if (e.ok) return;
    expect(e.error.message).toMatch(lang === 'python' ? /^IndexError: list index out of range$/ : /^TypeError: /);
    expect(e.error.line).toBe(3);
  });

  it('reports a value that cannot be serialised, saying what it was', () => {
    const e = first(run(lang, src.unserialisable));
    expect(e.ok).toBe(false);
    if (e.ok) return;
    expect(e.error.message).toMatch(/cannot be turned into JSON/);
    expect(e.error.message).toMatch(lang === 'python' ? /\{1, 2\} \(set\)/ : /a Set with 2 items/);
  });

  it('decodes and encodes linked lists', () => {
    const msgs = run(lang, src.listRev, { params: [{ name: 'head', type: 'linkedList' }], returns: 'linkedList', tests: [{ args: [[1, 2, 3]] }, { args: [[]] }] });
    const [a, b] = ends(msgs);
    expect(a).toMatchObject({ ok: true });
    expect(JSON.parse((a as { actualJson: string }).actualJson)).toEqual([3, 2, 1]);
    expect(JSON.parse((b as { actualJson: string }).actualJson)).toEqual([]);
  });

  it('decodes and encodes trees', () => {
    const msgs = run(lang, src.treeMirror, { params: [{ name: 'root', type: 'tree' }], returns: 'tree', tests: [{ args: [[4, 2, 7, 1, 3, 6, 9]] }, { args: [[1, null, 2]] }] });
    const [a, b] = ends(msgs);
    expect(JSON.parse((a as { actualJson: string }).actualJson)).toEqual([4, 7, 2, 9, 6, 3, 1]);
    expect(JSON.parse((b as { actualJson: string }).actualJson)).toEqual([1, 2]);
  });

  it('caps stdout at 10 KB', () => {
    const e = first(run(lang, src.spam));
    expect(e.stdout.length).toBeLessThan(STDOUT_LIMIT + 100);
    expect(e.stdout).toMatch(/truncated/);
  });
});

describe('language-specific paths', () => {
  it('JS: undefined return is an error', () => {
    const e = first(run('typescript', 'function f(x: number) {\n  x + 1;\n}\n'));
    expect(e).toMatchObject({ ok: false, error: { message: 'Your function returned undefined.' } });
  });
  it('JS: an exported function works', () => {
    expect(first(run('typescript', 'export const f = (x: number) => x + 1;\n'))).toMatchObject({ ok: true, actualJson: '2' });
  });
  it('JS: a user-declared ListNode is used for inputs', () => {
    const code = 'class ListNode { val: number; next: ListNode | null; constructor(v = 0, n: ListNode | null = null) { this.val = v; this.next = n; } }\nfunction f(h: ListNode) { return h instanceof ListNode; }\n';
    expect(first(run('typescript', code, { params: [{ name: 'h', type: 'linkedList' }], tests: [{ args: [[1, 2]] }] }))).toMatchObject({ ok: true, actualJson: 'true' });
  });
  it('JS: top-level runtime error is a compile-error', () => {
    expect(compileErr(run('typescript', 'const a: any = null;\na.b;\nfunction f() { return 1; }\n')).message).toMatch(/TypeError/);
  });
  it('Python: None comes back as null and tuples as lists', () => {
    expect(first(run('python', 'def f(x):\n    return None\n'))).toMatchObject({ ok: true, actualJson: 'null' });
    expect(first(run('python', 'def f(x):\n    return (x, (x,))\n'))).toMatchObject({ ok: true, actualJson: '[1, [1]]' });
  });
  it('Python: each run gets a fresh namespace and fresh args', () => {
    run('python', 'leak = 1\ndef f(x):\n    return x\n');
    const e = first(run('python', 'def f(x):\n    return leak\n'));
    expect(e).toMatchObject({ ok: false, error: { message: "NameError: name 'leak' is not defined", line: 2 } });
    const msgs = run('python', 'def f(xs):\n    xs.append(9)\n    return xs\n', { tests: [{ args: [[1]] }, { args: [[1]] }] });
    expect(ends(msgs).map((m) => (m as { actualJson: string }).actualJson)).toEqual(['[1, 9]', '[1, 9]']);
  });
  it('Python: an exception at the top level is a compile-error with its line', () => {
    expect(compileErr(run('python', 'x = 1\nraise ValueError("nope")\n'))).toMatchObject({ message: 'ValueError: nope', line: 2 });
  });
});
