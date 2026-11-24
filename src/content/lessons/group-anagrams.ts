import type { ArrayStructure, HashMapStructure, Lesson, Pointer, Tone } from '../schema';

const WORDS = ['pot', 'top', 'cat', 'opt', 'act', 'sun'];

const words = (
  tones: Partial<Record<number, Tone>> = {},
  pointers: Pointer[] = [],
  subs: Partial<Record<number, string>> = {},
): ArrayStructure => ({
  kind: 'array',
  id: 'words',
  label: 'words',
  cells: WORDS.map((value, i) => ({ id: `w${i}`, value, tone: tones[i], sub: subs[i] })),
  pointers,
});

const groups = (entries: [string, number][], tones: Record<string, Tone> = {}): HashMapStructure => ({
  kind: 'hashmap',
  id: 'groups',
  label: 'groups',
  entries: entries.map(([key, value]) => ({ key, value, tone: tones[key] })),
});

const lesson: Lesson = {
  slug: 'group-anagrams',
  title: 'Group Anagrams',
  source: { leetcode: 49, name: 'Group Anagrams' },
  pattern: 'Hash map grouping by key',
  difficulty: 'medium',
  minutes: 10,
  youllLearn: [
    'Why comparing every pair of words is too slow',
    'How a canonical key makes equal things look identical',
    'Grouping items by key with a hash map of lists',
    'Why sorting the letters is a safe signature',
  ],

  problem: {
    statement: [
      'You are given a list of lowercase words `strs`. Two words are **anagrams** when they use exactly the same letters the same number of times, in any order.',
      'Return the words grouped so that every group holds mutually anagram words. The groups can come back in any order, and so can the words inside a group.',
    ],
    examples: [
      {
        input: 'strs = ["pot", "top", "cat", "opt", "act", "sun"]',
        output: '[["pot", "top", "opt"], ["cat", "act"], ["sun"]]',
        note: 'Any order of groups, and any order inside a group, is accepted.',
      },
      { input: 'strs = ["moon"]', output: '[["moon"]]', note: 'A lone word is its own group.' },
    ],
    constraints: [
      '1 <= strs.length <= 10,000',
      '1 <= strs[i].length <= 100',
      'Each word uses only lowercase letters a to z.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'You get a list of words and must bundle together the ones that are anagrams: same letters, different order.',
        'For `words = [pot, top, cat, opt, act, sun]` the bundles are `pot, top, opt`, then `cat, act`, then `sun` on its own.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Let's find a label that all anagrams share." },
      scene: {
        structures: [words({}, [], { 0: 'opt', 1: 'opt', 2: 'act', 3: 'opt', 4: 'act', 5: 'nsu' })],
      },
    },
    {
      kind: 'concept',
      title: 'Brute force: compare pairs',
      body: [
        'The direct plan: take a word, test it against every other word to see if the two are anagrams, and build the groups as you go.',
        'Each test needs its own letter check, and you repeat it for nearly every pair of words. With `n` words that is about `n²` anagram tests, far too slow for 10,000 words.',
      ],
      scene: {
        structures: [words({ 0: 'compare', 2: 'compare' }, [{ id: 'i', at: 0 }, { id: 'j', at: 2 }])],
        caption: 'pot vs cat: no match. Try the next j.',
      },
    },
    {
      kind: 'concept',
      title: 'Give anagrams one shared key',
      body: [
        'Anagrams are the same letters rearranged. So **sort the letters** of a word and every anagram collapses to the same string.',
        '`pot` sorts to `opt`, and so does `top`. `cat` sorts to `act`. If two words have the same sorted key they are anagrams, and a hash map can group by that key with no pair checks.',
      ],
      leet: { pose: 'hint', says: 'Sorted letters are a fingerprint. Same fingerprint, same group.' },
      scene: {
        structures: [words({ 0: 'active', 1: 'compare' }, [{ id: 'i', at: 0 }], { 0: 'opt', 1: 'opt' })],
        vars: [{ name: 'key', value: 'opt', tone: 'active' }],
        caption: 'pot and top both sort to opt.',
      },
    },
    {
      kind: 'concept',
      title: 'Index 0: a new group',
      body: [
        'Start with an empty map called `groups` from key to list of words. At `i = 0` the word is `pot`, so `key = opt`.',
        'The key is not in the map yet, so create a group for it holding `pot`. The map shows group sizes: `opt → 1`.',
      ],
      scene: {
        structures: [words({ 0: 'active' }, [{ id: 'i', at: 0 }], { 0: 'opt' }), groups([['opt', 1]], { opt: 'active' })],
        vars: [{ name: 'key', value: 'opt', tone: 'active' }],
      },
    },
    {
      kind: 'concept',
      title: 'Index 1: join the group',
      body: [
        'At `i = 1` the word is `top`, which sorts to `key = opt`.',
        'This time the key is already in `groups`, so `top` just joins that group and the size becomes 2. No comparison with `pot` was needed, the shared key did the matching.',
      ],
      scene: {
        structures: [
          words({ 0: 'visited', 1: 'active' }, [{ id: 'i', at: 1 }], { 0: 'opt', 1: 'opt' }),
          groups([['opt', 2]], { opt: 'good' }),
        ],
        vars: [{ name: 'key', value: 'opt', tone: 'good' }],
        caption: 'opt already exists, so top joins it.',
      },
    },
    {
      kind: 'concept',
      title: 'Finish the single pass',
      body: [
        'Keep going. `cat` sorts to `act` and opens a new group. Then `opt` joins the `opt` group, `act` joins the `act` group, and `sun` sorts to `nsu` and opens a third group.',
        'One pass, one sort per word, and the map ends with three groups: `opt` has 3 words, `act` has 2, `nsu` has 1. Return the lists.',
      ],
      leet: { pose: 'cheer', says: 'Three keys, three groups. No pair was ever compared.' },
      scene: {
        structures: [
          words({ 0: 'visited', 1: 'visited', 2: 'visited', 3: 'visited', 4: 'visited', 5: 'visited' }, [], {
            0: 'opt',
            1: 'opt',
            2: 'act',
            3: 'opt',
            4: 'act',
            5: 'nsu',
          }),
          groups(
            [
              ['opt', 3],
              ['act', 2],
              ['nsu', 1],
            ],
            { opt: 'good', act: 'good', nsu: 'good' },
          ),
        ],
        caption: 'Return the three lists.',
        leet: { pose: 'cheer' },
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `group_anagrams` (Python) or `groupAnagrams` (JS / TS). Build a map from sorted letters to a list of words. Press **Run** to check your code against the tests.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You replaced pairwise comparisons with a single pass that files each word under a shared key.'],
      takeaways: [
        '**Find the canonical key.** Sorting the letters turns every anagram into the same string.',
        '**Group with a map of lists.** Look up the key, create the list if missing, then append.',
        '**Equal key means same group.** There is no need to compare words with each other.',
        '**Spot the pattern.** "Bundle things that are equivalent" often means a hash map keyed by a signature.',
      ],
      complexity: { time: 'O(n · k log k)', space: 'O(n · k)' },
    },
  ],

  challenge: {
    entry: { python: 'group_anagrams', typescript: 'groupAnagrams' },
    params: [{ name: 'strs', type: 'json' }],
    returns: 'json',
    compare: 'anyOrderNested',
    starter: {
      python: `def group_anagrams(strs: list[str]) -> list[list[str]]:
    # Return the words grouped so each group holds only anagrams of each other.
    pass
`,
      typescript: `function groupAnagrams(strs: string[]): string[][] {
  // Return the words grouped so each group holds only anagrams of each other.
  return [];
}
`,
    },
    solution: {
      python: `def group_anagrams(strs: list[str]) -> list[list[str]]:
    groups = {}  # sorted letters -> words
    for word in strs:
        key = "".join(sorted(word))
        if key not in groups:
            groups[key] = []
        groups[key].append(word)
    return list(groups.values())
`,
      typescript: `function groupAnagrams(strs: string[]): string[][] {
  const groups = new Map<string, string[]>(); // sorted letters -> words
  for (const word of strs) {
    const key = word.split('').sort().join('');
    const list = groups.get(key);
    if (list) list.push(word);
    else groups.set(key, [word]);
  }
  return Array.from(groups.values());
}
`,
    },
    tests: [
      {
        name: 'worked example',
        args: [['pot', 'top', 'cat', 'opt', 'act', 'sun']],
        expected: [['pot', 'top', 'opt'], ['cat', 'act'], ['sun']],
      },
      { name: 'single word', args: [['moon']], expected: [['moon']] },
      { name: 'single letter words', args: [['b', 'a', 'b']], expected: [['b', 'b'], ['a']] },
      { name: 'no anagrams at all', args: [['cab', 'dog', 'pen']], expected: [['cab'], ['dog'], ['pen']] },
      { name: 'duplicate words', args: [['ab', 'ba', 'ab']], expected: [['ab', 'ba', 'ab']] },
      {
        name: 'different lengths stay apart',
        args: [['a', 'ab', 'ba', 'b', 'abb']],
        expected: [['a'], ['ab', 'ba'], ['b'], ['abb']],
      },
      {
        name: 'same letters, different counts',
        args: [['aab', 'abb', 'baa', 'bba']],
        expected: [['aab', 'baa'], ['abb', 'bba']],
      },
    ],
    hints: [
      'Two words are anagrams exactly when their letters, sorted, give the same string.',
      'Use that sorted string as a hash map key whose value is a list of words.',
      'For each word: compute the key, create an empty list if the key is new, then append the word.',
    ],
  },
};

export default lesson;
