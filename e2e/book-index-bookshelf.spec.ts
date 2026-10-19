import { Page, Request } from '@playwright/test';
import { api, expect, openRoute, test, waitForPage } from './fixtures';

// The book index: views, sort, select mode and the editor's monitor save. Every
// write is stubbed with page.route, so nothing reaches the server (safe on staging);
// the stubbed answers only change page caches.

interface Book {
  id: number;
  title: string;
  authorId: number;
  monitored: boolean;
}

interface Write {
  method: string;
  path: string;
  body: unknown;
}

function apiPath(request: Request) {
  return new URL(request.url()).pathname.replace(/^.*\/api\/v1/, '');
}

// Records and answers every non-GET API request. `answer` gives the stubbed body for
// the writes a test expects; anything else is answered 500 and still recorded, so a
// stray write fails the test without touching the server.
async function stubWrites(page: Page, answer: (write: Write) => unknown) {
  const writes: Write[] = [];

  await page.route((url) => url.pathname.includes('/api/v1/'), (route) => {
    const request = route.request();

    if (request.method() === 'GET') {
      return route.fallback();
    }

    const write = { method: request.method(), path: apiPath(request), body: request.postDataJSON() };
    writes.push(write);

    const body = answer(write);

    return body === undefined ?
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }) :
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  return writes;
}

async function openMenu(page: Page, label: string) {
  await page.locator('[class*="ToolbarMenuButton-menuButton"]', { hasText: label }).click();
  await expect(page.locator('[class*="MenuContent-menuContent"]').filter({ visible: true })).toHaveCount(1);
}

async function chooseView(page: Page, view: string) {
  await openMenu(page, 'View');
  await page.locator('[class*="MenuItem-menuItem"]', { hasText: view }).click();
  await waitForPage(page);
}

// The index sorts titles with lodash orderBy, which compares strings by code unit,
// the same order as a plain sort().
function titlesInOrder(books: Book[]) {
  return books.map((b) => b.title).sort();
}

test('book index: views, title sort and the editor monitor save', async ({ page }) => {
  const books = await api<Book[]>(page, '/book');
  expect(books.length, 'the library needs books').toBeGreaterThan(1);

  const titles = titlesInOrder(books);
  const first = titles[0];
  const last = titles[titles.length - 1];
  expect(first, 'the check needs two different titles').not.toBe(last);

  const writes = await stubWrites(page, ({ method, path, body }) => {
    if (method === 'PUT' && path === '/book/editor') {
      const { bookIds, monitored } = body as { bookIds: number[]; monitored: boolean };

      return books.filter((b) => bookIds.includes(b.id)).map((b) => ({ ...b, monitored }));
    }

    return undefined;
  });

  // A fresh browser context starts on the default options: posters, title ascending.
  await openRoute(page, '/books');

  await expect(page.locator('[class*="BookIndexPoster-title"]').first()).toHaveText(first);

  await chooseView(page, 'Table');
  await expect(page.locator('[class*="BookIndexRow-titleLink"]').first()).toHaveText(first);

  // Pressing the active sort again reverses it.
  await openMenu(page, 'Sort');
  await page.locator('[class*="MenuItem-menuItem"]', { hasText: /^Title$/ }).click();
  await expect(page.locator('[class*="BookIndexRow-titleLink"]').first()).toHaveText(last);

  await chooseView(page, 'Overview');
  const overviewTitle = page.locator('[class*="BookIndexOverview-title"]').first();
  await expect(overviewTitle).toHaveText(last);

  // The overview text is fetched per row from GET /book/{id}/overview.
  const lastBook = books.find((b) => b.title === last) as Book;
  const { overview } = await api<{ overview?: string }>(page, `/book/${lastBook.id}/overview`);

  if (overview) {
    await expect(page.locator('[class*="BookIndexOverview-synopsis"]').first()).not.toBeEmpty();
  }

  await chooseView(page, 'Posters');
  await expect(page.locator('[class*="BookIndexPoster-title"]').first()).toHaveText(last);

  // Select mode: pick the first cover, then the editor footer saves at once.
  await page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: 'Book Editor' }).click();
  await expect(page.getByRole('button', { name: 'Select All' })).toBeVisible();

  await page.locator('[class*="BookIndexPosterSelect-checkButton"]').first().click();
  await expect(page.locator('[class*="BookIndexPosterSelect-checkButton"]').first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('1 Book(s) Selected')).toBeVisible();

  const monitored = !lastBook.monitored;
  const put = page.waitForRequest((r) => r.method() === 'PUT' && apiPath(r) === '/book/editor');
  await page.locator('[class*="PageContentFooter"] select[name="monitored"]').selectOption(monitored ? 'monitored' : 'unmonitored');

  expect((await put).postDataJSON()).toStrictEqual({ bookIds: [lastBook.id], monitored });
  expect(writes.map((w) => `${w.method} ${w.path}`)).toEqual(['PUT /book/editor']);
});
