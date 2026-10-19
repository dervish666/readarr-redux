import { Page, Request, Response } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { api, expect, openRoute, test } from './fixtures';

// System pages on react-query. These run against the local backend's real data
// (status, health, tasks, log files, events) and create then delete one real
// backup in the throwaway data dir. Updates has no real releases locally, so that
// one check serves a fixture. Restore is never allowed to reach the backend.

interface SystemStatus {
  version: string;
}

interface Health {
  message: string;
}

interface Backup {
  id: number;
  name: string;
}

interface LogFile {
  filename: string;
}

interface LogPage {
  totalRecords: number;
  records: { message: string }[];
}

interface Task {
  taskName: string;
  lastExecution: string;
}

const json = { status: 200, contentType: 'application/json' };

function row(page: Page, text: string) {
  return page.locator('tbody tr').filter({ hasText: text });
}

// FieldSet renders a div with a section heading, not a <fieldset>.
function section(page: Page, text: string) {
  return page.locator('[class*="FieldSet-section"]').filter({ hasText: text });
}

function modal(page: Page) {
  return page.locator('[class*="ModalContent-modalContent"]');
}

function isApiGet(response: Response, apiPath: string) {
  const url = new URL(response.url());

  return response.request().method() === 'GET' && url.pathname.endsWith(`/api/v1${apiPath}`);
}

// Any restore request is stubbed and recorded, so even a failing test can't restore.
async function blockRestores(page: Page) {
  const restores: string[] = [];

  await page.route((url) => url.pathname.includes('/api/v1/system/backup/restore'), (route) => {
    restores.push(`${route.request().method()} ${route.request().url()}`);

    return route.fulfill({ ...json, body: '{"restartRequired":true}' });
  });

  return restores;
}

// Marks the window, so a later check can tell the page was never reloaded.
async function markWindow(page: Page) {
  await page.evaluate(() => {
    (window as unknown as Record<string, boolean>).__systemSpecMark = true;
  });
}

async function expectSameWindow(page: Page) {
  expect(
    await page.evaluate(() => (window as unknown as Record<string, boolean>).__systemSpecMark),
    'the page reloaded'
  ).toBe(true);
}

test('status: real version, health and disk space', async ({ page }) => {
  const status = await api<SystemStatus>(page, '/system/status');
  const health = await api<Health[]>(page, '/health');

  await openRoute(page, '/system/status');

  await expect(page.getByRole('heading', { name: /System · Status/ })).toBeVisible();

  const about = section(page, 'Startup Directory');
  await expect(about).toContainText(status.version);

  expect(health.length, 'the local backend reports no health checks').toBeGreaterThan(0);

  for (const item of health) {
    await expect(page.locator('tbody tr').filter({ hasText: item.message })).toHaveCount(1);
  }

  // The sidebar badge counts the same health items.
  const statusLink = page.locator('[class*="PageSidebarItem-link"]', { hasText: /^Status/ });
  await expect(statusLink.locator('[class*="PageSidebarItem-status"]')).toHaveText(String(health.length));

  await expect(section(page, 'Free Space').locator('tbody tr').first()).toBeVisible();
});

test('tasks: running Check Health spins and the row updates over SignalR', async ({ page }) => {
  const taskFrames: string[] = [];

  page.on('websocket', (socket) => {
    socket.on('framereceived', ({ payload }) => {
      const text = String(payload);

      if (text.includes('"system/task"')) {
        taskFrames.push(text);
      }
    });
  });

  // The first task list says Check Health last ran in 2020, so any newer run is
  // visible in the row. Later fetches are the backend's real answer.
  let served = false;

  await page.route((url) => url.pathname.endsWith('/api/v1/system/task'), async (route) => {
    if (served || route.request().method() !== 'GET') {
      return route.fallback();
    }

    served = true;
    const response = await route.fetch();
    const tasks = (await response.json()) as Task[];
    const aged = tasks.map((t) => (t.taskName === 'CheckHealth' ? { ...t, lastExecution: '2020-01-01T00:00:00Z' } : t));

    return route.fulfill({ response, json: aged });
  });

  await openRoute(page, '/system/tasks');
  await expect(page.getByRole('heading', { name: /System · Tasks/ })).toBeVisible();

  const checkHealth = row(page, 'Check Health');
  const lastExecution = checkHealth.locator('[class*="ScheduledTaskRow-lastExecution"]');
  await expect(lastExecution).toContainText('years ago');

  await markWindow(page);

  // The command can finish in milliseconds, so watch for the spinner from before the click.
  await checkHealth.locator('[class*="ScheduledTaskRow-actions"]').evaluate((cell) => {
    const seen = { spun: false };
    (window as unknown as Record<string, unknown>).__taskSpin = seen;

    const check = () => {
      if (cell.querySelector('[class*="Icon-spinning"]')) {
        seen.spun = true;
      }
    };

    new MutationObserver(check).observe(cell, { subtree: true, childList: true, attributes: true });
  });

  await checkHealth.locator('[class*="ScheduledTaskRow-actions"] button').click();

  await expect.poll(
    () => page.evaluate(() => ((window as unknown as Record<string, { spun: boolean }>).__taskSpin).spun),
    { message: 'the run button never spun' }
  ).toBe(true);

  await expect(lastExecution).not.toContainText('years ago', { timeout: 30_000 });
  await expect(lastExecution).toContainText(/seconds? ago|minute ago/);

  expect(taskFrames.length, 'no system/task SignalR message arrived').toBeGreaterThan(0);
  await expectSameWindow(page);

  const tasks = await api<Task[]>(page, '/system/task');
  const real = tasks.find((t) => t.taskName === 'CheckHealth');
  expect(new Date(real?.lastExecution ?? 0).getTime()).toBeGreaterThan(Date.now() - 5 * 60_000);
});

test('backups: create through the UI, restore dialogs cancel, then delete it', async ({ page }) => {
  const restores = await blockRestores(page);
  const before = await api<Backup[]>(page, '/system/backup');

  await openRoute(page, '/system/backup');
  await expect(page.getByRole('heading', { name: /System · Backups/ })).toBeVisible();
  await markWindow(page);

  // The toolbar restore opens the upload form, with Restore disabled until a file is picked.
  await page.getByRole('button', { name: 'Restore Backup' }).first().click();
  await expect(modal(page).locator('input[type="file"]')).toHaveCount(1);
  await expect(modal(page).getByRole('button', { name: 'Restore' })).toBeDisabled();
  await modal(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(modal(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Backup Now' }).click();

  // The new backup shows up without a reload once the Backup command finishes.
  await expect(page.locator('tbody tr')).toHaveCount(before.length + 1, { timeout: 60_000 });
  await expectSameWindow(page);

  const after = await api<Backup[]>(page, '/system/backup');
  const created = after.find((b) => !before.some((o) => o.id === b.id));
  expect(created, 'no new backup on the server').toBeTruthy();

  const createdRow = row(page, created!.name);
  await expect(createdRow).toHaveCount(1);

  // The row's restore asks about this backup by name; cancel it.
  await createdRow.getByRole('button', { name: 'Restore Backup' }).click();
  await expect(modal(page)).toContainText(`Would you like to restore the backup '${created!.name}'?`);
  await modal(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(modal(page)).toHaveCount(0);

  // Delete the backup this test made.
  await createdRow.getByRole('button', { name: 'Delete Backup' }).click();
  await expect(modal(page)).toContainText(created!.name);
  await modal(page).getByRole('button', { name: 'Delete' }).click();

  await expect(createdRow).toHaveCount(0);
  await expect(page.locator('tbody tr')).toHaveCount(before.length);
  await expectSameWindow(page);

  const final = await api<Backup[]>(page, '/system/backup');
  expect(final.map((b) => b.id)).toEqual(before.map((b) => b.id));
  expect(restores, 'a restore request left the browser').toEqual([]);
});

test('log files and updater log files list the real files', async ({ page }) => {
  const files = await api<LogFile[]>(page, '/log/file');
  expect(files.length, 'the local backend has no log files').toBeGreaterThan(0);

  await openRoute(page, '/system/logs/files');
  await expect(page.getByRole('heading', { name: /System · Log Files/ })).toBeVisible();
  await expect(page.getByText('Log files are located in:')).toContainText('logs');

  for (const file of files) {
    await expect(row(page, file.filename).getByRole('link', { name: 'Download' })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Log Files' }).first().click();
  await page.getByRole('link', { name: 'Updater Log Files' }).click();

  const updateFiles = await api<LogFile[]>(page, '/log/file/update');
  await expect(page.getByRole('heading', { name: /System · Updater Log Files/ })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(updateFiles.length);

  if (!updateFiles.length) {
    await expect(page.getByText('No log files')).toBeVisible();
  }
});

test('events: the table shows the logged events and their details', async ({ page }) => {
  const logResponse = page.waitForResponse((response) => isApiGet(response, '/log'));

  await openRoute(page, '/system/events');
  const logPage = (await (await logResponse).json()) as LogPage;

  expect(logPage.records.length, 'the local backend has no events').toBeGreaterThan(0);

  await expect(page.getByRole('heading', { name: /System · Events/ })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(logPage.records.length);

  const first = logPage.records[0];
  await expect(page.locator('tbody tr').first()).toContainText(first.message);

  await page.locator('tbody tr').first().click();
  await expect(modal(page)).toContainText(first.message);
  await modal(page).getByRole('button', { name: 'Close' }).click();
  await expect(modal(page)).toHaveCount(0);

  // Filtering to errors asks the server for level=error.
  const errorResponse = page.waitForResponse((response) => isApiGet(response, '/log') && response.url().includes('level=error'));
  await page.locator('[class*="FilterMenu"] button').first().click();
  await page.getByRole('button', { name: 'Error', exact: true }).click();
  await errorResponse;

  await page.locator('[class*="FilterMenu"] button').first().click();
  await page.getByRole('button', { name: 'All', exact: true }).click();
});

test('updates fixture: releases, changes and the installed label', async ({ page }) => {
  const status = await api<SystemStatus>(page, '/system/status');
  const updates = fs.readFileSync(path.join(__dirname, 'fixtures', 'updates.json'), 'utf8')
    .replace('__CURRENT_VERSION__', status.version);

  const commands: Request[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/v1/command')) {
      commands.push(request);
    }
  });

  await page.route((url) => url.pathname.endsWith('/api/v1/update'), (route) => {
    return route.fulfill({ ...json, body: updates });
  });

  await openRoute(page, '/system/updates');
  await expect(page.getByRole('heading', { name: /System · Updates/ })).toBeVisible();

  await expect(page.getByText('99.0.0.990001')).toBeVisible();
  await expect(page.getByText('Fixture change: a new thing')).toBeVisible();
  await expect(page.getByText('Fixture fix: a broken thing')).toBeVisible();
  await expect(page.getByText('Currently Installed')).toBeVisible();
  await expect(page.getByText('Maintenance Release')).toBeVisible();

  // Nothing installable, so no install button and no command.
  await expect(page.getByRole('button', { name: 'Install Latest' })).toHaveCount(0);
  expect(commands).toEqual([]);
});
