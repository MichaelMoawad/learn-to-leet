import { describe, expect, it } from 'vitest';
import { compareValues, judge } from '../../src/sandbox/compare';

describe('compare: exact', () => {
  it('deep-equals JSON values', () => {
    expect(compareValues([1, [2, 3], { a: null, b: 'x' }], [1, [2, 3], { b: 'x', a: null }])).toBe(true);
    expect(compareValues([1, 2], [2, 1])).toBe(false);
    expect(compareValues([1, 2], [1, 2, 3])).toBe(false);
    expect(compareValues({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(compareValues(null, [])).toBe(false);
    expect(compareValues(true, 1)).toBe(false);
    expect(compareValues('1', 1)).toBe(false);
  });
  it('treats numbers within 1e-9 as equal', () => {
    expect(compareValues(0.1 + 0.2, 0.3)).toBe(true);
    expect(compareValues([1.0000000001], [1])).toBe(true);
    expect(compareValues(1.00001, 1)).toBe(false);
  });
});

describe('compare: anyOrder', () => {
  it('ignores the order of the outer array', () => {
    expect(compareValues([3, 1, 2], [1, 2, 3], 'anyOrder')).toBe(true);
    expect(compareValues([[1, 2], [3]], [[3], [1, 2]], 'anyOrder')).toBe(true);
    expect(compareValues([{ b: 1, a: 2 }, 5], [5, { a: 2, b: 1 }], 'anyOrder')).toBe(true);
  });
  it('keeps the inner order and counts duplicates', () => {
    expect(compareValues([[2, 1], [3]], [[3], [1, 2]], 'anyOrder')).toBe(false);
    expect(compareValues([1, 1, 2], [1, 2, 2], 'anyOrder')).toBe(false);
  });
  it('needs arrays on both sides', () => {
    expect(compareValues(1, 1, 'anyOrder')).toBe(false);
    expect(compareValues(null, [], 'anyOrder')).toBe(false);
  });
});

describe('compare: anyOrderNested', () => {
  it('ignores order at both levels', () => {
    expect(
      compareValues([['tan', 'nat'], ['bat'], ['eat', 'tea', 'ate']], [['bat'], ['ate', 'eat', 'tea'], ['nat', 'tan']], 'anyOrderNested'),
    ).toBe(true);
    expect(compareValues([[1, 2], [2]], [[2], [2, 2]], 'anyOrderNested')).toBe(false);
  });
});

describe('judge', () => {
  const test = { name: 't', args: [], expected: [0, 1] };
  it('passes, fails and errors', () => {
    expect(judge(test, { type: 'test-end', runId: 1, index: 0, ok: true, actualJson: '[0,1]', stdout: '', ms: 1 }).status).toBe('pass');
    const fail = judge(test, { type: 'test-end', runId: 1, index: 0, ok: true, actualJson: '[1,0]', stdout: 'hi', ms: 1 });
    expect(fail).toMatchObject({ status: 'fail', actual: [1, 0], stdout: 'hi' });
    const anyOrder = judge(test, { type: 'test-end', runId: 1, index: 0, ok: true, actualJson: '[1,0]', stdout: '', ms: 1 }, 'anyOrder');
    expect(anyOrder.status).toBe('pass');
    const err = judge(test, { type: 'test-end', runId: 1, index: 0, ok: false, error: { message: 'boom', line: 2 }, stdout: '', ms: 1 });
    expect(err).toMatchObject({ status: 'error', error: { message: 'boom', line: 2 } });
  });
});
