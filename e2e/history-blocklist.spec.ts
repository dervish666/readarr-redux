import { Page, Request } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { expect, openRoute, test } from './fixtures';

// The local library has no history and an empty blocklist, so the fixture checks
// serve /history and /blocklist (Readarr v1 shapes) and cancel every dialog that
// would write. The empty-state checks use the real, empty API.

function readFixture(name: string) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

const HISTORY = readFixture('history.json');
const BLOCKLIST = readFixture('blocklist.json');

const GRABBED_TITLE = 'Fixture.Author-Fixture.Book.Grabbed.epub';
const BLOCKED_ONE = 'Fixture.Author-Fixture.Book.Blocked.One.epub';

const json = { status: 200, contentType: 'application/json' };

async function serveFixture(page: Page, apiPath: string, body: string) {
  await page.route((url) => url.pathname.endsWith(`/api/v1${apiPath}`), (route) => {
    return route.fulfill({ ...json, body });
  });
}

// Anything that would change history or the blocklist on the server.
function isActivityWrite(request: Request) {
  const url = request.url();

  return request.method() !== 'GET' &&
    (url.includes('/api/v1/history') || url.includes('/api/v1/blocklist') ||
      (url.includes('/api/v1/command') && (request.postData() ?? '').includes('ClearBlocklist')));
}

// Records every history or blocklist write, and stubs it so that even a failing
// test never deletes or clears anything on the backend.
async function recordWrites(page: Page) {
  const writes: string[] = [];

  page.on('request', (request) => {
    if (isActivityWrite(request)) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.route((url) => /\/api\/v1\/(history|blocklist|command)/.test(url.pathname), (route) => {
    return isActivityWrite(route.request()) ? route.fulfill({ ...json, body: '{}' }) : route.fallback();
  });

  return writes;
}

function row(page: Page, text: string) {
  return page.locator('tbody tr').filter({ hasText: text });
}

function modal(page: Page) {
  return page.locator('[class*="ModalContent-modalContent"]');
}

test('history fixture: rows render with their event icons', async ({ page }) => {
  await serveFixture(page, '/history', HISTORY);
  await openRoute(page, '/activity/history');

  await expect(page.getByRole('heading', { name: /Activity · History/ })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(3);

  // Author and book come from the row itself (includeAuthor/includeBook), not redux.
  const grabbed = row(page, 'Fixture Book Grabbed');
  await expect(grabbed.getByRole('link', { name: 'Fixture Author' })).toBeVisible();
  await expect(grabbed.getByRole('link', { name: 'Fixture Book Grabbed' })).toBeVisible();
  await expect(grabbed.getByText('EPUB')).toBeVisible();

  // One icon per Readarr event type, and the failed download in the danger colour.
  const eventIcon = (text: string) => row(page, text).locator('[class*="HistoryEventTypeCell-cell"] svg');
  await expect(eventIcon('Fixture Book Grabbed')).toHaveClass(/lucide-cloud-download/);
  await expect(eventIcon('Fixture Book Imported')).toHaveClass(/lucide-download/);
  await expect(eventIcon('Fixture Book Failed')).toHaveClass(/lucide-cloud-download/);
  await expect(eventIcon('Fixture Book Failed')).toHaveClass(/Icon-danger/);
  await expect(eventIcon('Fixture Book Grabbed')).not.toHaveClass(/Icon-danger/);
});

test('history fixture: the details modal shows the grab and closes without a write', async ({ page }) => {
  const writes = await recordWrites(page);

  await serveFixture(page, '/history', HISTORY);
  await openRoute(page, '/activity/history');

  await row(page, 'Fixture Book Grabbed').locator('[class*="HistoryRow-details"] button').click();

  await expect(modal(page)).toContainText(GRABBED_TITLE);
  await expect(modal(page)).toContainText('Fixture Indexer');
  await expect(modal(page)).toContainText('FIXGRP');
  await expect(modal(page)).toContainText('Fixture Client');
  await expect(modal(page)).toContainText('FIXTURE-GRABBED');
  await expect(modal(page)).toContainText('3 days');
  await expect(modal(page).getByRole('link', { name: 'https://example.invalid/fixture' })).toBeVisible();

  // A grab can be marked failed; leave it alone and close.
  await expect(modal(page).getByRole('button', { name: 'Mark as Failed' })).toBeVisible();
  await modal(page).getByRole('button', { name: 'Close' }).click();
  await expect(modal(page)).toHaveCount(0);

  // An import shows where the file came from and went, and has no Mark as Failed.
  await row(page, 'Fixture Book Imported').locator('[class*="HistoryRow-details"] button').click();
  await expect(modal(page)).toContainText('/downloads/Fixture.Book.Imported/fixture.epub');
  await expect(modal(page)).toContainText('/books/Fixture Author/Fixture Book Imported/fixture.epub');
  await expect(modal(page).getByRole('button', { name: 'Mark as Failed' })).toHaveCount(0);
  await modal(page).getByRole('button', { name: 'Close' }).click();
  await expect(modal(page)).toHaveCount(0);

  expect(writes, 'opening history details sent a write').toEqual([]);
});

test('blocklist fixture: rows, details, and remove and clear dialogs cancel', async ({ page }) => {
  const writes = await recordWrites(page);

  await serveFixture(page, '/blocklist', BLOCKLIST);
  await openRoute(page, '/activity/blocklist');

  await expect(page.getByRole('heading', { name: /Activity · Blocklist/ })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(2);

  const first = row(page, BLOCKED_ONE);
  await expect(first.getByRole('link', { name: 'Fixture Author' })).toBeVisible();

  // Details: protocol, indexer and the reason it was blocklisted.
  await first.locator('[class*="BlocklistRow-actions"] button').first().click();
  await expect(modal(page)).toContainText(BLOCKED_ONE);
  await expect(modal(page)).toContainText('torrent');
  await expect(modal(page)).toContainText('Fixture blocklist reason');
  await modal(page).getByRole('button', { name: 'Close' }).click();
  await expect(modal(page)).toHaveCount(0);

  // Remove Selected is off until a row is ticked, then asks first; Cancel sends nothing.
  const removeSelected = page.getByRole('button', { name: 'Remove Selected' });
  await expect(removeSelected).toBeDisabled();
  await first.locator('[class*="TableSelectCell"] input, [class*="TableSelectCell"] label').first().click();
  await expect(removeSelected).toBeEnabled();
  await removeSelected.click();
  await expect(modal(page)).toContainText('remove the selected items from the blocklist');
  await modal(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(modal(page)).toHaveCount(0);

  // Clear asks first too; Cancel sends no ClearBlocklist command.
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(modal(page)).toBeVisible();
  await modal(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(modal(page)).toHaveCount(0);

  expect(writes, 'a cancelled dialog sent a history or blocklist write').toEqual([]);
});

test('history and blocklist: the real, empty API shows the empty messages', async ({ page }) => {
  await openRoute(page, '/activity/history');
  await expect(page.getByText('No history.', { exact: true })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);

  await openRoute(page, '/activity/blocklist');
  await expect(page.getByText('No history blocklist', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled();
});
