import { Page } from '@playwright/test';
import { api, appUrl, baselineScreenshot, expect, openRoute, test, waitForPage } from './fixtures';
import { authorSlug } from './env';

// Read-only by default: nothing here saves settings, grabs, imports or deletes.
// The one write is the Stage 0 refresh of a single author, which only touches
// the target's own database and its metadata source.

interface Author {
  id: number;
  authorName: string;
  titleSlug: string;
}

interface Book {
  id: number;
  title: string;
  titleSlug: string;
}

const STATIC_ROUTES = [
  '/authors',
  '/books',
  '/shelf',
  '/unmapped',
  '/add/search',
  '/calendar',
  '/activity/queue',
  '/activity/history',
  '/activity/blocklist',
  '/wanted/missing',
  '/wanted/cutoffunmet',
  '/settings',
  '/settings/mediamanagement',
  '/settings/profiles',
  '/settings/quality',
  '/settings/customformats',
  '/settings/indexers',
  '/settings/downloadclients',
  '/settings/importlists',
  '/settings/connect',
  '/settings/metadata',
  '/settings/metadatasource',
  '/settings/tags',
  '/settings/general',
  '/settings/ui',
  '/settings/development',
  '/system/status',
  '/system/tasks',
  '/system/backup',
  '/system/updates',
  '/system/events',
  '/system/logs/files',
  '/system/logs/files/update'
];

interface SignalRMessage {
  name: string;
  body?: { action?: string; resource?: { id?: number; status?: string } };
}

// SignalR's JSON protocol separates messages with 0x1E; app messages arrive as receiveMessage invocations.
function signalRMessages(frames: string[]): SignalRMessage[] {
  return frames
    .flatMap((frame) => frame.split('\u001e'))
    .filter(Boolean)
    .map((part) => JSON.parse(part))
    .filter((m) => m.type === 1 && m.target === 'receiveMessage')
    .map((m) => m.arguments[0] as SignalRMessage);
}

function screenshotName(route: string) {
  return route.replace(/^\//, '').replace(/\//g, '-') || 'root';
}

async function pickAuthor(page: Page): Promise<Author> {
  const authors = await api<Author[]>(page, '/author');

  expect(authors.length, 'the library has no authors, so the detail checks have nothing to open').toBeGreaterThan(0);

  if (authorSlug) {
    const match = authors.find((a) => a.titleSlug === authorSlug);
    expect(match, `READARR_AUTHOR_SLUG '${authorSlug}' is not in the library`).toBeTruthy();
    return match as Author;
  }

  return authors[0];
}

async function openMenu(page: Page, label: string) {
  await page.locator('[class*="ToolbarMenuButton-menuButton"]', { hasText: label }).click();
  await expect(page.locator('[class*="MenuContent-menuContent"]').filter({ visible: true })).toHaveCount(1);
}

// Toolbar buttons that don't fit the width move into the toolbar's More menu.
async function pressToolbarAction(page: Page, label: string) {
  const button = page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: new RegExp(`^${label}$`) });

  if (await button.count()) {
    await button.click();
    return;
  }

  await openMenu(page, 'More');
  await page.locator('[class*="MenuItem-menuItem"]', { hasText: new RegExp(`^${label}$`) }).click();
}

test.describe('every route renders', () => {
  for (const route of STATIC_ROUTES) {
    test(route, async ({ page, problems }) => {
      await openRoute(page, route);
      await expect(page.locator('[class*="PageContentError"]')).toHaveCount(0);
      await baselineScreenshot(page, screenshotName(route));
      expect(problems).toEqual([]);
    });
  }
});

test('author index views, sort, filter and select mode', async ({ page }) => {
  await openRoute(page, '/authors');

  for (const view of ['Table', 'Posters', 'Overview']) {
    await openMenu(page, 'View');
    await page.locator('[class*="MenuItem-menuItem"]', { hasText: view }).click();
    await waitForPage(page);
    await baselineScreenshot(page, `authors-${view.toLowerCase()}`);
  }

  await openMenu(page, 'Sort');
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);

  await openMenu(page, 'Filter');
  await page.mouse.click(5, 5);

  await page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: 'Author Editor' }).click();
  await expect(page.getByText(/Author\(s\) Selected/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select All' })).toBeVisible();
});

test('author details: books, series tab, edit modal', async ({ page }) => {
  const author = await pickAuthor(page);

  await openRoute(page, `/author/${author.titleSlug}`);
  await expect(page.getByText(author.authorName).first()).toBeVisible();
  await baselineScreenshot(page, 'author-details');

  await page.getByRole('tab', { name: /^Series/ }).click();
  await waitForPage(page);

  await pressToolbarAction(page, 'Edit');
  const modal = page.locator('[class*="ModalContent-modalContent"]');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Cancel' }).click();
  await expect(modal).toHaveCount(0);
});

test('book details: tabs and interactive search', async ({ page }) => {
  const author = await pickAuthor(page);
  const books = await api<Book[]>(page, `/book?authorId=${author.id}`);

  expect(books.length, `${author.authorName} has no books`).toBeGreaterThan(0);

  await openRoute(page, `/book/${books[0].titleSlug}`);
  await baselineScreenshot(page, 'book-details');

  for (const tab of ['History', 'Files']) {
    await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
    await waitForPage(page);
  }

  // The Search tab is interactive search. With grabbing disabled it only lists releases.
  await page.getByRole('tab', { name: 'Search', exact: true }).click();
  await waitForPage(page);
});

test('add new: author and book search return results', async ({ page }) => {
  const author = await pickAuthor(page);

  await openRoute(page, '/add/search');
  // The add page's own box, not the header search, which also has a placeholder.
  await page.getByPlaceholder(/^e\.g\./).fill(author.authorName);

  await expect(
    page.locator('[class*="AddNewAuthorSearchResult-searchResult"], [class*="AddNewBookSearchResult-searchResult"]').first()
  ).toBeVisible({ timeout: 45_000 });

  await baselineScreenshot(page, 'add-search-results');
});

test('queue renders rows or the empty message', async ({ page }) => {
  await openRoute(page, '/activity/queue');

  await expect(
    page.locator('[class*="Table-table"], [class*="Alert-alert"]').first()
  ).toBeVisible();
});

test('calendar month, agenda and today', async ({ page }) => {
  await openRoute(page, '/calendar');

  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await waitForPage(page);
  await baselineScreenshot(page, 'calendar-month');

  // Step a month forward, then Today brings the original month back.
  const title = page.locator('[class*="CalendarHeader-titleDesktop"]');
  const thisMonth = (await title.innerText()).trim();
  await page.locator('[class*="CalendarHeader-navigationButtons"] button').nth(1).click();
  await expect(title).not.toHaveText(thisMonth);
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(title).toHaveText(thisMonth);

  await page.getByRole('button', { name: 'Agenda', exact: true }).click();
  await waitForPage(page);
  await baselineScreenshot(page, 'calendar-agenda');
});

test('stage 0: refresh one author and the update arrives over SignalR', async ({ page }) => {
  // A refresh of a big author against a slow metadata source can run for minutes.
  test.setTimeout(420_000);

  const author = await pickAuthor(page);

  // Record SignalR frames so the test proves the update came over the socket.
  const frames: string[] = [];
  page.on('websocket', (ws) => {
    if (ws.url().includes('/signalr/messages')) {
      ws.on('framereceived', ({ payload }) => frames.push(String(payload)));
    }
  });

  await openRoute(page, `/author/${author.titleSlug}`);

  const refresh = page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: 'Refresh & Scan' });
  const commandPost = page.waitForResponse(
    (r) => r.url().includes('/api/v1/command') && r.request().method() === 'POST'
  );

  await refresh.click();

  const posted = await commandPost;
  expect(posted.status()).toBeLessThan(300);
  const { id: commandId } = await posted.json();

  const completed = () => signalRMessages(frames).some(
    (m) => m.name === 'command' && m.body?.resource?.id === commandId && m.body.resource.status === 'completed'
  );

  await expect.poll(completed, { timeout: 360_000, message: `no SignalR 'completed' message for command ${commandId}` }).toBe(true);

  // The finished command clears the toolbar spinner.
  await expect(refresh.locator('.fa-spin')).toHaveCount(0);
});
