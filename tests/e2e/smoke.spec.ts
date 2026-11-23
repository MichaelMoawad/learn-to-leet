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
