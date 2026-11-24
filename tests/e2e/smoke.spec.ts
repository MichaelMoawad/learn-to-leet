import { expect, test, type Page } from '@playwright/test';
import twoSum from '../../src/content/lessons/two-sum';

const STEPS = twoSum.steps.length;
const CHALLENGE = twoSum.steps.findIndex((s) => s.kind === 'challenge') + 1;
const RECAP = twoSum.steps.findIndex((s) => s.kind === 'recap') + 1;

const stepper = (page: Page) => page.getByRole('navigation', { name: 'Lesson steps' });

async function stepToChallenge(page: Page) {
  await page.goto('/learn/two-sum');
  await expect(page.getByRole('heading', { level: 1, name: twoSum.steps[0].title })).toBeVisible();
  await expect(stepper(page).getByText(`Step 1 / ${STEPS}`)).toBeVisible();

  for (let n = 2; n <= CHALLENGE; n++) {
    await page.getByRole('button', { name: 'Next step' }).click();
    await expect(page).toHaveURL(new RegExp(`[?&]step=${n}\\b`));
    await expect(stepper(page).getByText(`Step ${n} / ${STEPS}`)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: twoSum.steps[n - 1].title })).toBeVisible();
  }

  // Arriving on the challenge switches the pane to CODE.
  await expect(page.getByRole('tab', { name: 'Code', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('sandbox')).toBeVisible();
}

/** Replace the editor's text through the real editor: focus, select all, type the new code. */
async function replaceCode(page: Page, code: string) {
  const content = page.getByTestId('code-editor').getByRole('textbox');
  await content.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  // insertText sends one input event, so auto-indent and bracket closing cannot mangle it.
  await page.keyboard.insertText(code);
  await expect(content).toContainText(code.split('\n')[1].trim());
  // Wait for the debounced draft save, proof the edit reached the app and not only the DOM.
  // (Chrome Android emulation makes CodeMirror read DOM edits a frame late.)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('ltl:v1') ?? ''))
    .toContain(JSON.stringify(code).slice(1, 40));
}

async function solveIn(page: Page, tabName: string, code: string, timeout: number) {
  const tab = page.getByRole('tab', { name: tabName, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await replaceCode(page, code);

  const run = page.getByTestId('run-button');
  await expect(run).toHaveText('Run', { timeout });
  await expect(run).toBeEnabled();
  await run.click();
  await expect(page.getByText(`6 / 6 passed`)).toBeVisible({ timeout });
}

test('Two Sum: step to the challenge and solve it in JS / TS', async ({ page }) => {
  await stepToChallenge(page);
  await solveIn(page, 'JS / TS', twoSum.challenge.solution.typescript, 30_000);
});

test('Two Sum: solve it in Python', async ({ page }) => {
  test.setTimeout(180_000);
  await stepToChallenge(page);
  // Pyodide downloads about 6 MB on first run.
  await solveIn(page, 'Python', twoSum.challenge.solution.python, 150_000);
});

test('Two Sum: Ctrl/Cmd+Enter runs, and arrow keys stay in the editor', async ({ page }) => {
  await page.goto(`/learn/two-sum?step=${CHALLENGE}`);
  await page.getByRole('tab', { name: 'JS / TS', exact: true }).click();
  await replaceCode(page, twoSum.challenge.solution.typescript);

  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(new RegExp(`[?&]step=${CHALLENGE}\\b`));

  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.getByText(`6 / 6 passed`)).toBeVisible({ timeout: 30_000 });
});

test('Two Sum: stepping on reaches the recap', async ({ page }) => {
  await page.goto(`/learn/two-sum?step=${CHALLENGE}`);
  for (let n = CHALLENGE + 1; n <= RECAP; n++) await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]step=${RECAP}\\b`));
  await expect(page.getByRole('heading', { level: 1, name: twoSum.steps[RECAP - 1].title })).toBeVisible();
  await expect(stepper(page).getByText(`Step ${RECAP} / ${STEPS}`)).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Visual', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(stepper(page).getByRole('button', { name: /Next lesson|All lessons/ })).toBeVisible();
});

test('Two Sum: the Problem button shows on other steps, not on the challenge', async ({ page }) => {
  await page.goto(`/learn/two-sum?step=${CHALLENGE}`);
  await expect(page.getByTestId('sandbox')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Problem', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Previous step' }).click();
  await page.getByRole('tab', { name: 'Code', exact: true }).click();
  const problem = page.getByRole('button', { name: 'Problem', exact: true });
  await problem.click();
  await expect(problem).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('sandbox').getByRole('region', { name: 'Problem' })).toBeVisible();
});

// ---------- visual engine (phase 3) ----------

/** Blocks each Two Sum step shows once its choreography has landed. */
function expectedBlocks(step: number): number {
  const s = twoSum.steps[step - 1];
  const scene = s.kind === 'concept' ? s.scene : null;
  if (!scene) return expectedBlocks(step - 1);
  return scene.structures.reduce((n, st) => {
    if (st.kind === 'array') return n + st.cells.length;
    if (st.kind === 'hashmap') return n + st.entries.reduce((m, e) => m + (e.value === undefined ? 1 : 2), 0);
    return n;
  }, 0);
}

async function checkVisualStep(page: Page, n: number, viewBox?: string | null) {
  const visual = page.getByRole('tabpanel', { name: 'Visual' });
  if (n === CHALLENGE) {
    await page.getByRole('tab', { name: 'Visual', exact: true }).click();
  }
  const svg = visual.getByTestId('scene-svg');
  await expect(svg).toBeVisible();
  await expect(visual.locator('[data-block]')).toHaveCount(expectedBlocks(n));
  await expect(visual.getByTestId('visual')).toHaveAttribute('data-step', String(n));
  const vb = await svg.getAttribute('viewBox');
  if (viewBox !== undefined) expect(vb).toBe(viewBox);
  return vb;
}

test('Visual: Two Sum plays forward and back with a steady view', async ({ page }) => {
  await page.goto('/learn/two-sum');
  const viewBox = await checkVisualStep(page, 1);
  for (let n = 2; n <= STEPS; n++) {
    await page.getByRole('button', { name: 'Next step' }).click();
    await checkVisualStep(page, n, viewBox);
  }
  for (let n = STEPS - 1; n >= 1; n--) {
    await page.getByRole('button', { name: 'Previous step' }).click();
    await checkVisualStep(page, n, viewBox);
  }
});

test('Visual: step 4 flies a token into the map, then Replay and Pause work', async ({ page }) => {
  await page.goto('/learn/two-sum?step=3');
  const visual = page.getByTestId('visual');
  await expect(visual.locator('[data-block]')).toHaveCount(5);
  await page.getByRole('button', { name: 'Next step' }).click();
  // The plan flies 6 into the new key and index 0 into its value; the blocks land after.
  await expect(visual).toHaveAttribute('data-flights', 'seen/6 seen/6#value');
  await expect(visual.locator('[data-block]')).toHaveCount(7);
  await expect(visual.locator('[data-flight]')).toHaveCount(0);

  // Replay restarts from step 3's state; pausing straight away freezes it before the tokens land.
  await page.getByRole('button', { name: 'Replay step' }).click();
  await page.getByRole('button', { name: 'Pause scene' }).click();
  await expect(visual).toHaveAttribute('data-paused', 'true');
  await page.waitForTimeout(1500);
  await expect(visual.locator('[data-block]')).toHaveCount(5);
  await expect(visual).toHaveAttribute('data-playing', 'true');
  await page.getByRole('button', { name: 'Play scene' }).click();
  await expect(visual.locator('[data-block]')).toHaveCount(7);
  await expect(visual).not.toHaveAttribute('data-playing', 'true');
  await expect(visual.locator('[data-flight]')).toHaveCount(0);
});

test.describe('Visual: reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('steps swap to their end state with no choreography or idle loops', async ({ page }) => {
    await page.goto('/learn/two-sum?step=3');
    const visual = page.getByTestId('visual');
    await expect(visual.getByTestId('scene-svg')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Replay step' })).toHaveCount(0);
    for (const n of [4, 5, 6, 7]) {
      await page.getByRole('button', { name: 'Next step' }).click();
      await expect(visual).toHaveAttribute('data-step', String(n));
      expect(await visual.locator('[data-flight]').count()).toBe(0);
      await expect(visual.locator('[data-block]')).toHaveCount(expectedBlocks(n), { timeout: 1000 });
      expect(await visual.locator('.ltl-bob, .ltl-flow').count()).toBe(0);
    }
  });
});
