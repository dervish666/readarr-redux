import { Page, Response } from '@playwright/test';
import { api, expect, openRoute, test } from './fixtures';
import { holdCommandRefetches, withQueryClient, withReduxStore } from './reactTree';

// Commands live in react-query (['/command']); pages not yet converted read the redux
// state.commands feed. These checks run real commands on the local backend: Check
// Health (fast, harmless) and one author refresh, the same one signalr-bridge runs.

interface Author {
  id: number;
  titleSlug: string;
}

interface Command {
  id: number;
  name: string;
  status: string;
}

function isCommandPost(response: Response) {
  return response.request().method() === 'POST' && new URL(response.url()).pathname.endsWith('/api/v1/command');
}

function queryCommandStatus(page: Page, id: number) {
  return withQueryClient<string | null>(page, `
    const command = (client.getQueryData(['/command']) || []).find((c) => c.id === ${id});
    return command ? command.status : null;
  `);
}

function reduxCommandStatus(page: Page, id: number) {
  return withReduxStore<string | null>(page, `
    const command = store.getState().commands.items.find((c) => c.id === ${id});
    return command ? command.status : null;
  `);
}

async function openTasksInApp(page: Page) {
  // Client-side navigation keeps the same redux store and query cache.
  await page.locator('[class*="PageSidebarItem-link"]', { hasText: /^System/ }).first().click();
  await page.locator('[class*="PageSidebarItem-link"]', { hasText: /^Tasks/ }).click();
  await expect(page.getByRole('heading', { name: /System · Tasks/ })).toBeVisible();
}

test('commands: a task run spins, clears and completes in the react-query list', async ({ page }) => {
  await openRoute(page, '/system/tasks');

  const checkHealth = page.locator('tbody tr').filter({ hasText: 'Check Health' });
  const actions = checkHealth.locator('[class*="ScheduledTaskRow-actions"]');

  await expect(actions.locator('[class*="Icon-spinning"]')).toHaveCount(0);

  // The system/task message also refetches /command; hold that so only the
  // SignalR command messages can move this run along.
  const release = await holdCommandRefetches(page);

  // Check Health can finish in milliseconds, so watch for the spinner from before the click.
  await actions.evaluate((cell) => {
    const seen = { spun: false };
    (window as unknown as Record<string, unknown>).__commandSpin = seen;

    const check = () => {
      if (cell.querySelector('[class*="Icon-spinning"]')) {
        seen.spun = true;
      }
    };

    new MutationObserver(check).observe(cell, { subtree: true, childList: true, attributes: true });
  });

  const post = page.waitForResponse(isCommandPost);
  await actions.locator('button').click();
  const command = (await (await post).json()) as Command;
  expect(command.name).toBe('CheckHealth');

  await expect.poll(
    () => page.evaluate(() => ((window as unknown as Record<string, { spun: boolean }>).__commandSpin).spun),
    { message: 'the run button never spun' }
  ).toBe(true);

  await expect(actions.locator('[class*="Icon-spinning"]'), 'the spinner never cleared').toHaveCount(0, { timeout: 30_000 });

  // Only SignalR reports completion; the POST answered "queued".
  await expect.poll(() => queryCommandStatus(page, command.id), {
    timeout: 30_000,
    message: 'the react-query command list never showed the run as completed'
  }).toBe('completed');

  // The Queue table on the same page reads that list.
  const queued = page.locator('[class*="FieldSet-section"]').filter({ hasText: 'Queue' }).locator('tbody tr');
  await expect(queued.filter({ hasText: 'Check Health' }).first()).toBeVisible();

  // The redux feed for unconverted pages has the same command, also completed.
  await expect.poll(() => reduxCommandStatus(page, command.id), {
    timeout: 30_000,
    message: 'the redux command feed never saw the react-query run'
  }).toBe('completed');

  release();
});

test('commands: a redux-started author refresh shows on the converted Tasks page', async ({ page }) => {
  const [author] = await api<Author[]>(page, '/author');
  expect(author, 'the library has no authors').toBeTruthy();

  await openRoute(page, `/author/${author.titleSlug}`);
  const release = await holdCommandRefetches(page);

  const post = page.waitForResponse(isCommandPost);
  await page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: 'Refresh & Scan' }).click();
  const command = (await (await post).json()) as Command;
  expect(command.name).toBe('RefreshAuthor');

  // Started through redux executeCommand, so it is in the redux feed...
  await expect.poll(() => reduxCommandStatus(page, command.id)).not.toBeNull();

  // ...and in the react-query list the converted pages read.
  await expect.poll(() => queryCommandStatus(page, command.id), {
    message: 'the react-query command list never saw the redux-started refresh'
  }).not.toBeNull();

  await openTasksInApp(page);

  const queued = page.locator('[class*="FieldSet-section"]').filter({ hasText: 'Queue' }).locator('tbody tr');
  await expect(queued.filter({ hasText: 'Refresh Author' }).first()).toBeVisible();

  // Both sides end on the same final status.
  await expect.poll(() => queryCommandStatus(page, command.id), { timeout: 60_000 }).toBe('completed');
  await expect.poll(() => reduxCommandStatus(page, command.id), { timeout: 60_000 }).toBe('completed');

  release();
});

test('translations: the app waits for them and renders text, not key names', async ({ page }) => {
  // Slow the strings down so an app that renders before they arrive would show keys.
  await page.route((url) => url.pathname.endsWith('/api/v1/localization'), async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fallback();
  });

  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as Record<string, unknown>).__keyNamesSeen = seen;

    const scan = () => {
      // textContent, not innerText: table headers are text-transformed to upper case.
      const text = document.body?.textContent ?? '';

      for (const key of ['LastExecution', 'NextExecution', 'LastDuration', 'LogFiles']) {
        if (text.includes(key) && !seen.includes(key)) {
          seen.push(key);
        }
      }
    };

    new MutationObserver(scan).observe(document, { subtree: true, childList: true, characterData: true });
  });

  await openRoute(page, '/system/tasks');

  const header = page.locator('thead').first();
  await expect(header).toContainText('Last Execution');
  await expect(header).toContainText('Next Execution');

  expect(
    await page.evaluate(() => (window as unknown as Record<string, string[]>).__keyNamesSeen),
    'translation key names were rendered'
  ).toEqual([]);
});
