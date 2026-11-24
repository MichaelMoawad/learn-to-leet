import type { CellInput, GridStructure, Lesson, Tone } from '../schema';

// 1 = land, 0 = water. Three islands: top left, middle right, and a lone cell touching the middle one only at a corner.
const MAP = [
  [1, 1, 0, 0, 0],
  [1, 0, 0, 1, 0],
  [0, 0, 1, 1, 0],
  [0, 0, 0, 0, 1],
];

const ISLAND_A = ['0,0', '0,1', '1,0'];
const ISLAND_B = ['1,3', '2,2', '2,3'];
const ISLAND_C = ['3,4'];

const grid = (tones: Record<string, Tone> = {}, scan?: [number, number], scanTone: Tone = 'active'): GridStructure => ({
  kind: 'grid',
  id: 'map',
  label: 'map',
  rows: MAP.map((row, r) =>
    row.map((v, c): CellInput => ({ value: v, tone: tones[`${r},${c}`], h: v === 1 ? 1 : 0 })),
  ),
  pointers: scan ? [{ id: 'scan', at: scan, tone: scanTone }] : [],
});

const paint = (keys: string[], tone: Tone): Record<string, Tone> =>
  Object.fromEntries(keys.map((k) => [k, tone]));

const lesson: Lesson = {
  slug: 'number-of-islands',
  title: 'Number of Islands',
  source: { leetcode: 200, name: 'Number of Islands' },
  pattern: 'Grid flood fill',
  difficulty: 'medium',
  minutes: 12,
  youllLearn: [
    'Why counting land cells does not count islands',
    'Scanning a grid and spotting the first cell of each island',
    'Flood filling an island so it is never counted twice',
    'Why corner-touching land is not connected',
  ],

  problem: {
    statement: [
      'You are given a `grid`, a list of rows, where each cell is the integer `1` (land) or `0` (water).',
      'An **island** is a group of land cells joined up, down, left or right. Cells that only touch at a corner are not joined. Return how many islands the grid has.',
    ],
    examples: [
      {
        input: 'grid = [[1, 1, 0, 0, 0], [1, 0, 0, 1, 0], [0, 0, 1, 1, 0], [0, 0, 0, 0, 1]]',
        output: '3',
        note: 'The last land cell touches another one only at a corner, so it stands alone.',
      },
      { input: 'grid = [[1, 0], [0, 1]]', output: '2', note: 'Diagonal neighbours are separate islands.' },
    ],
    constraints: [
      '1 <= rows, columns <= 300',
      'Every cell is 0 or 1.',
      'Only up, down, left and right count as neighbours.',
    ],
  },

  steps: [
    {
      kind: 'concept',
      title: 'The problem',
      body: [
        'The grid is a map. Tall blocks are land (`1`), flat tiles are water (`0`). A group of land cells that touch along an edge forms one island.',
        'This map has 7 land cells but only 3 islands, so we need to count groups, not cells.',
      ],
      leet: { pose: 'idle', says: "Hi, I'm Leet. Let's count the islands without counting any twice." },
      scene: { structures: [grid()], caption: 'Land stands tall, water lies flat.' },
    },
    {
      kind: 'concept',
      title: 'Counting land is not enough',
      body: [
        'A first idea: count every `1`. Here that gives 7, but the answer is 3.',
        'Land cells that belong to the same island all get counted, so the total says nothing about how many groups there are. We need a way to treat a whole island as a single thing.',
      ],
      scene: {
        structures: [grid({ ...paint(ISLAND_A, 'compare'), ...paint(ISLAND_B, 'compare'), ...paint(ISLAND_C, 'compare') })],
        vars: [{ name: 'land', value: 7, tone: 'bad' }],
        caption: '7 land cells, not 7 islands.',
      },
    },
    {
      kind: 'concept',
      title: 'Scan, then sink the island',
      body: [
        'Scan the grid row by row. The first time you meet land, you have found a new island, so add one to `islands`.',
        'Then flood fill: walk to every connected land cell and mark it visited. Visited land is skipped by the scan later, so an island is counted exactly once.',
      ],
      leet: { pose: 'hint', says: 'Count an island on its first land cell, then mark the whole thing visited.' },
      scene: {
        structures: [grid({}, [0, 0])],
        vars: [{ name: 'islands', value: 0 }],
        caption: 'The scan hits land at row 0, column 0.',
      },
    },
    {
      kind: 'concept',
      title: 'First island',
      body: [
        'The scan reached unvisited land, so `islands` becomes 1. Now flood fill from there: the land to the right and the land below are both neighbours, and each is marked visited.',
        'The fill stops at water and at grid edges. Three cells are done.',
      ],
      scene: {
        structures: [grid({ ...paint(ISLAND_A, 'compare'), '0,0': 'active' }, [0, 0])],
        vars: [{ name: 'islands', value: 1, tone: 'active' }],
        caption: 'Flooding all three connected cells.',
      },
    },
    {
      kind: 'concept',
      title: 'Second island',
      body: [
        'The scan keeps moving and skips the visited land and the water. At row 1, column 3 it meets fresh land, so `islands` becomes 2.',
        'The flood fill reaches the cell below it, then the cell to the left of that one. The fill goes in all four directions, so it can turn corners.',
      ],
      scene: {
        structures: [grid({ ...paint(ISLAND_A, 'visited'), ...paint(ISLAND_B, 'compare'), '1,3': 'active' }, [1, 3])],
        vars: [{ name: 'islands', value: 2, tone: 'active' }],
        caption: 'Island A stays visited. Island B floods.',
      },
    },
    {
      kind: 'concept',
      title: 'A corner does not connect',
      body: [
        'Later the scan reaches row 3, column 4. Its only neighbours up and left are water, and the nearby land at row 2, column 3 is only a diagonal touch.',
        'So this cell is unvisited land and starts a third island. Flood fill finds nothing else to sink.',
      ],
      scene: {
        structures: [
          grid({ ...paint(ISLAND_A, 'visited'), ...paint(ISLAND_B, 'visited'), '3,4': 'active' }),
        ],
        vars: [{ name: 'islands', value: 3, tone: 'active' }],
        caption: 'Diagonal land is a separate island.',
      },
    },
    {
      kind: 'challenge',
      title: 'Your turn',
      body: [
        'Write `num_islands` (Python) or `numIslands` (JS / TS). Scan every cell, count an island at each unvisited `1`, and flood fill it. Press **Run** to check your code.',
        'Stuck? Ask Leet for a hint.',
      ],
    },
    {
      kind: 'recap',
      title: 'Recap',
      body: ['You counted groups by sinking each island the first time the scan found it.'],
      takeaways: [
        '**Count on first contact.** Unvisited land at the scan position means a new island.',
        '**Flood fill the whole island.** Mark every connected land cell visited so it is never counted again.',
        '**Spread in four directions.** A fill that only goes right and down misses islands that curl back.',
        '**Corners do not connect.** Only up, down, left and right are neighbours.',
      ],
      complexity: { time: 'O(rows x cols)', space: 'O(rows x cols)' },
      scene: {
        structures: [grid({ ...paint(ISLAND_A, 'visited'), ...paint(ISLAND_B, 'visited'), ...paint(ISLAND_C, 'visited') })],
        vars: [{ name: 'islands', value: 3, tone: 'good' }],
        caption: 'Every island counted once.',
      },
    },
  ],

  challenge: {
    entry: { python: 'num_islands', typescript: 'numIslands' },
    params: [{ name: 'grid', type: 'json' }],
    returns: 'json',
    compare: 'exact',
    starter: {
      python: `def num_islands(grid: list[list[int]]) -> int:
    # grid cells are 1 (land) or 0 (water). Return the number of islands.
    return 0
`,
      typescript: `function numIslands(grid: number[][]): number {
  // grid cells are 1 (land) or 0 (water). Return the number of islands.
  return 0;
}
`,
    },
    solution: {
      python: `def num_islands(grid: list[list[int]]) -> int:
    rows, cols = len(grid), len(grid[0])
    visited = [[False] * cols for _ in range(rows)]
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1 and not visited[r][c]:
                islands += 1
                visited[r][c] = True
                stack = [(r, c)]
                while stack:
                    cr, cc = stack.pop()
                    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nr, nc = cr + dr, cc + dc
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1 and not visited[nr][nc]:
                            visited[nr][nc] = True
                            stack.append((nr, nc))
    return islands
`,
      typescript: `function numIslands(grid: number[][]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = grid.map((row) => row.map(() => false));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let islands = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1 && !visited[r][c]) {
        islands++;
        visited[r][c] = true;
        const stack: number[][] = [[r, c]];
        while (stack.length > 0) {
          const [cr, cc] = stack.pop()!;
          for (const [dr, dc] of dirs) {
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1 && !visited[nr][nc]) {
              visited[nr][nc] = true;
              stack.push([nr, nc]);
            }
          }
        }
      }
    }
  }
  return islands;
}
`,
    },
    tests: [
      {
        name: 'worked example',
        args: [[[1, 1, 0, 0, 0], [1, 0, 0, 1, 0], [0, 0, 1, 1, 0], [0, 0, 0, 0, 1]]],
        expected: 3,
      },
      { name: 'diagonal land is separate', args: [[[1, 0], [0, 1]]], expected: 2 },
      { name: 'single land cell', args: [[[1]]], expected: 1 },
      { name: 'single water cell', args: [[[0]]], expected: 0 },
      { name: 'all water', args: [[[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]], expected: 0 },
      { name: 'all land', args: [[[1, 1, 1], [1, 1, 1], [1, 1, 1]]], expected: 1 },
      {
        name: 'snake that curls back',
        args: [[[1, 1, 1, 0, 1], [0, 0, 1, 0, 1], [1, 1, 1, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]]],
        expected: 1,
      },
    ],
    hints: [
      'Scan every cell. When you meet a `1` you have not visited, that is a brand new island.',
      'Flood fill from that cell: visit its up, down, left and right neighbours that are land, and keep going from each.',
      'Spread in all four directions. Going only right and down splits a curling island into several pieces.',
    ],
  },
};

export default lesson;
