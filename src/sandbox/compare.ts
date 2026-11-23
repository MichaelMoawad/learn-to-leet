// The single pass or fail decision for both languages (SPEC 4.2). Runs on the main thread
// and in scripts/check-content.ts.
import type { Challenge, Json, TestCase } from '../content/schema';
import type { TestEndMessage, TestResult } from './protocol';

export type CompareMode = NonNullable<Challenge['compare']>;

const EPSILON = 1e-9;

export function jsonEqual(a: Json, b: Json): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b || Math.abs(a - b) <= EPSILON;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => jsonEqual(x, b[i]));
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && jsonEqual(a[k], b[k]));
}

/** JSON string with object keys sorted, so equal values always sort to the same place. */
export function canonical(v: Json): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}

const sortByJson = (xs: Json[]): Json[] =>
  xs
    .map((x) => [canonical(x), x] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, x]) => x);

export function compareValues(actual: Json, expected: Json, mode: CompareMode = 'exact'): boolean {
  if (mode === 'exact') return jsonEqual(actual, expected);
  if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
  if (mode === 'anyOrderNested') {
    const inner = (xs: Json[]) => xs.map((x) => (Array.isArray(x) ? sortByJson(x) : x));
    return jsonEqual(sortByJson(inner(actual)), sortByJson(inner(expected)));
  }
  return jsonEqual(sortByJson(actual), sortByJson(expected));
}

/** Turn a worker's test-end message into a judged result. */
export function judge(test: TestCase, msg: TestEndMessage, mode: CompareMode = 'exact'): TestResult {
  const base = { name: test.name, expected: test.expected, stdout: msg.stdout, ms: msg.ms };
  if (!msg.ok) return { ...base, status: 'error', error: msg.error };
  let actual: Json;
  try {
    actual = JSON.parse(msg.actualJson) as Json;
  } catch {
    return { ...base, status: 'error', error: { message: 'The returned value could not be read back as JSON.' } };
  }
  return { ...base, actual, status: compareValues(actual, test.expected, mode) ? 'pass' : 'fail' };
}

export function pendingResults(tests: TestCase[]): TestResult[] {
  return tests.map((t) => ({ name: t.name, status: 'pending', expected: t.expected, stdout: '' }));
}
