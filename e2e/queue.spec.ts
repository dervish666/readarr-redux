import { Page, Request } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { expect, openRoute, test } from './fixtures';

// The local library's queue is empty, so these checks serve a fixture for the queue
// requests (Readarr v1 shapes) and stub the one write they press, Import anyway.
// Every dialog that would remove or import is cancelled before it submits.

function readFixture(name: string) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

const QUEUE = readFixture('queue.json');
const QUEUE_STATUS = readFixture('queue-status.json');
const QUEUE_DESTINATIONS = readFixture('queue-destinations.json');

const DOWNLOADING_TITLE = 'Fixture.Author-Fixture.Book.Downloading.epub';
const BLOCKED_TITLE = 'Fixture.Author-Fixture.Book.Blocked.epub';

async function serveQueueFixture(page: Page) {
  const json = { status: 200, contentType: 'application/json' };

  await page.route((url) => url.pathname.endsWith('/api/v1/queue'), (route) => {
    return route.request().method() === 'GET' ? route.fulfill({ ...json, body: QUEUE }) : route.fallback();
  });

  await page.route((url) => url.pathname.endsWith('/api/v1/queue/status'), (route) => {
    return route.fulfill({ ...json, body: QUEUE_STATUS });
  });

  await page.route((url) => url.pathname.endsWith('/api/v1/queue/990002/destinations'), (route) => {
    return route.fulfill({ ...json, body: QUEUE_DESTINATIONS });
  });
}

// Anything that would change the queue on the server. None may leave the browser
// unless a test stubbed it on purpose.
function isQueueWrite(request: Request) {
  return request.url().includes('/api/v1/queue') && request.method() !== 'GET';
}

function row(page: Page, title: string) {
  return page.locator('tbody tr').filter({ hasText: title });
}

function modal(page: Page) {
  return page.locator('[class*="ModalContent-modalContent"]');
}

test('queue fixture: rows, status chips and the sidebar count', async ({ page }) => {
  await serveQueueFixture(page);
  await openRoute(page, '/activity/queue');

  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: /Activity · Queue/ })).toBeVisible();

  // The downloading row: author and book links, no triage chips or buttons.
  const downloading = row(page, 'Fixture Book Downloading');
  await expect(downloading.getByRole('link', { name: 'Fixture Author' })).toBeVisible();
  await expect(downloading.locator('[class*="QueueStatusCell-content"] [class*="Label-label"]')).toHaveCount(0);
  await expect(downloading.getByRole('button', { name: 'Import anyway' })).toHaveCount(0);
  await expect(downloading.getByRole('cell', { name: '00:10:00', exact: true })).toBeVisible();

  // The import-blocked row: one chip per kind of problem, and the triage buttons that fit them.
  const blocked = row(page, 'Fixture Book Blocked');
  const chips = blocked.locator('[class*="QueueStatusCell-content"] [class*="Label-label"]');
  await expect(chips).toHaveText(['Match 72.5%', 'Destination exists']);
  await expect(blocked.getByRole('button', { name: 'Import anyway' })).toBeVisible();
  await expect(blocked.getByRole('button', { name: 'Blocklist and Search' })).toBeVisible();
  await expect(blocked.getByRole('button', { name: 'Compare' })).toBeVisible();

  // The sidebar count comes from /queue/status, which says 2.
  const queueLink = page.locator('[class*="PageSidebarItem-link"]', { hasText: /^Queue/ });
  await expect(queueLink.locator('[class*="PageSidebarItem-status"]')).toHaveText('2');
});

test('queue fixture: remove, blocklist and compare dialogs open and cancel', async ({ page }) => {
  const writes: string[] = [];
  page.on('request', (request) => {
    if (isQueueWrite(request)) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });

  await serveQueueFixture(page);
  await openRoute(page, '/activity/queue');

  // Remove: the dialog names the release and offers the removal choices, then Close.
  await row(page, 'Fixture Book Downloading').getByTitle('Remove from queue').click();
  await expect(modal(page)).toContainText(`Remove - ${DOWNLOADING_TITLE}`);
  await expect(modal(page).locator('select, [class*="EnhancedSelectInput"]').first()).toBeVisible();
  await modal(page).getByRole('button', { name: 'Close' }).click();
  await expect(modal(page)).toHaveCount(0);

  const blocked = row(page, 'Fixture Book Blocked');

  // Blocklist and Search asks first; Cancel leaves the download alone.
  await blocked.getByRole('button', { name: 'Blocklist and Search' }).click();
  await expect(modal(page)).toContainText(`Remove '${BLOCKED_TITLE}' from the download client`);
  await modal(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(modal(page)).toHaveCount(0);

  // Compare lists where each file would land, from /queue/{id}/destinations.
  await blocked.getByRole('button', { name: 'Compare' }).click();
  await expect(modal(page)).toContainText(`Compare - ${BLOCKED_TITLE}`);
  await expect(modal(page)).toContainText('1 file(s) would land on a file that');
  await expect(modal(page).getByRole('button', { name: 'Import and replace' })).toBeEnabled();
  await modal(page).getByRole('button', { name: 'Close' }).click();
  await expect(modal(page)).toHaveCount(0);

  expect(writes, 'a cancelled dialog sent a queue write').toEqual([]);
});

test('queue fixture: Import anyway posts ignoreMatchThreshold', async ({ page }) => {
  await serveQueueFixture(page);

  // Stub the import so nothing reaches the backend; the test checks what the button sends.
  const posted: unknown[] = [];
  await page.route((url) => url.pathname.endsWith('/api/v1/queue/990002/import'), (route) => {
    posted.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await openRoute(page, '/activity/queue');
  await row(page, 'Fixture Book Blocked').getByRole('button', { name: 'Import anyway' }).click();

  await expect.poll(() => posted).toEqual([{ ignoreMatchThreshold: true, replaceDestination: false }]);
});
