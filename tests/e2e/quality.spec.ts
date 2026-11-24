// Phase 5A quality checks: phone and tablet layout, reduced motion, keyboard-only use and the
// home page bundle.
import { expect, test, type Page } from '@playwright/test';
import twoSum from '../../src/content/lessons/two-sum';

const CHALLENGE = twoSum.steps.findIndex((s) => s.kind === 'challenge') + 1;
const RECAP = twoSum.steps.findIndex((s) => s.kind === 'recap') + 1;

const noHorizontalScroll = (page: Page) =>
  expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

// ---------- layout below 1024px ----------

for (const width of [390, 768]) test.describe(`Layout: ${width}px`, () => {
  test.use({ viewport: { width, height: width === 390 ? 844 : 1024 } });
  test.skip(({ isMobile }) => isMobile, 'the viewport is set here; one run is enough');

  test('no horizontal scroll on home and lessons, including the CODE tab', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Learn to Leet' })).toBeVisible();
    await noHorizontalScroll(page);

    for (const url of ['/learn/two-sum?step=4', '/learn/number-of-islands?step=3', '/learn/course-schedule?step=6', '/learn/maximum-depth-of-binary-tree?step=5']) {
      await page.goto(url);
      await expect(page.getByTestId('scene-svg')).toBeVisible();
      await noHorizontalScroll(page);
      await page.getByRole('tab', { name: 'Code', exact: true }).click();
      await expect(page.getByTestId('code-editor')).toBeVisible();
      await noHorizontalScroll(page);
    }
  });

  test('tap targets are at least 40px tall', async ({ page }) => {
    await page.goto(`/learn/two-sum?step=${CHALLENGE}`);
    await expect(page.getByTestId('code-editor')).toBeVisible();
    const plain = [
      page.getByRole('link', { name: 'Learn to Leet' }),
      page.getByRole('button', { name: /^Motion:/ }),
      page.getByRole('button', { name: 'Course', exact: true }),
      page.getByRole('tab', { name: 'Visual', exact: true }),
      page.getByRole('tab', { name: 'Python', exact: true }),
      page.getByTestId('sandbox').getByRole('listitem').first().getByRole('button'),
      page.getByRole('button', { name: /^Step 1:/ }),
    ];
    for (const target of plain) expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(40);

    // 3D buttons keep their drawn size and grow an invisible hit layer to 40px.
    for (const name of ['Reset', 'Run', 'Next step']) {
      const hits = await page.getByRole('button', { name, exact: true }).evaluate((el) => {
        el.scrollIntoView({ block: 'center' });
        const b = el.getBoundingClientRect();
        const reach = Math.max(0, (40 - b.height) / 2) - 1;
        const x = b.left + b.width / 2;
        return [b.top - reach, b.bottom + reach].every((y) => el.contains(document.elementFromPoint(x, y)));
      });
      expect(hits, name).toBe(true);
    }
  });
});

// ---------- reduced motion ----------

async function expectStill(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  // Leet shows a still frame: no SVG frame animation anywhere on the page.
  await expect(page.locator('svg[data-leet-pose]').first()).toBeVisible();
  await expect(page.locator('svg animate')).toHaveCount(0);
  // The hero title does not glow, and 3D buttons move with no transition.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('text-shadow', 'none');
  const front = page.locator('.btn3d-front').first();
  await expect(front).toHaveCSS('transition-duration', '0s');
}

test.describe('Reduced motion', () => {
  test('the stored preference stills the home page', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ltl:v1', JSON.stringify({ state: { progress: {}, drafts: {}, prefs: { language: 'python', motion: 'reduced' } }, version: 1 }));
    });
    await page.goto('/');
    await expectStill(page);
  });

  test.describe('from the OS setting', () => {
    test.use({ reducedMotion: 'reduce' });
    test('the home page is still', async ({ page }) => {
      await page.goto('/');
      await expectStill(page);
    });
  });

  test('the lesson header toggle stores prefs.motion and stills the page', async ({ page }) => {
    await page.goto('/learn/two-sum?step=1');
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', 'reduced');
    const toggle = page.getByRole('button', { name: /^Motion:/ });
    await expect(toggle).toHaveAttribute('data-motion-pref', 'auto');
    await toggle.click();
    await expect(toggle).toHaveAttribute('data-motion-pref', 'reduced');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('ltl:v1')))!).state.prefs.motion).toBe('reduced');
    await expect(page.getByRole('button', { name: 'Replay step' })).toHaveCount(0);
    await expect(page.locator('svg animate')).toHaveCount(0);
  });
});

// ---------- bundle ----------

test('home does not download the lesson page or the code editor', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(new URL(r.url()).pathname);
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(scripts.filter((s) => /\/assets\/(Editor|LessonPage)-/.test(s))).toEqual([]);

  await page.getByRole('link', { name: /Two Sum/ }).click();
  await expect(page.getByTestId('code-editor')).toBeAttached();
  expect(scripts.some((s) => /\/assets\/LessonPage-/.test(s))).toBe(true);
  expect(scripts.some((s) => /\/assets\/Editor-/.test(s))).toBe(true);
});

// ---------- keyboard only ----------

/** Presses Tab until `match` holds for the focused element. Fails after `max` presses. */
async function tabTo(page: Page, match: (el: Element) => boolean, max = 60) {
  const src = match.toString();
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    // eslint-disable-next-line no-new-func
    if (await page.evaluate((s) => !!document.activeElement && new Function(`return (${s})`)()(document.activeElement), src)) return;
  }
  throw new Error(`Tab never reached ${src}`);
}

const focusRing = (page: Page) =>
  page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement!);
    return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`;
  });

test.describe('Keyboard only', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.skip(({ isMobile }) => isMobile, 'keyboard run is a desktop flow');

  test('home to a solved run and on to the next lesson', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/');
    await tabTo(page, (el) => el.textContent?.trim() === 'Start learning');
    expect(await focusRing(page)).toBe('solid 2px rgb(255, 79, 216)');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/learn\/two-sum/);
    await expect(page.getByRole('heading', { level: 1, name: twoSum.steps[0].title })).toBeVisible();

    // Arrow keys step through the lesson.
    for (let n = 2; n <= CHALLENGE; n++) {
      await page.keyboard.press('ArrowRight');
      await expect(page).toHaveURL(new RegExp(`[?&]step=${n}\\b`));
    }

    // Pick JS / TS with the arrow keys inside the language tabs.
    await tabTo(page, (el) => el.id === 'sandbox-tab-python');
    expect(await focusRing(page)).toBe('solid 2px rgb(255, 79, 216)');
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'JS / TS', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(new RegExp(`[?&]step=${CHALLENGE}\\b`));

    // Into the editor, write the answer, then Escape and Tab leave it for Run.
    await tabTo(page, (el) => !!el.closest('.cm-editor'));
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(twoSum.challenge.solution.typescript);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('run-button')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByText('6 / 6 passed')).toBeVisible({ timeout: 30_000 });
    // Focus stays on Run through the run, so the results are one Tab away.
    await expect(page.getByTestId('run-button')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('.cm-content')).toBeFocused();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('run-button')).toBeFocused();

    // On to the recap and the next lesson.
    for (let n = CHALLENGE + 1; n <= RECAP; n++) await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(new RegExp(`[?&]step=${RECAP}\\b`));
    await tabTo(page, (el) => /Next lesson|All lessons/.test(el.textContent ?? ''));
    expect(await focusRing(page)).toBe('solid 2px rgb(255, 79, 216)');
    await page.keyboard.press('Enter');
    await expect(page).not.toHaveURL(/\/learn\/two-sum/);
  });
});
