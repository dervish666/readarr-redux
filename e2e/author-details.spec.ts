import { Page, Request } from '@playwright/test';
import { authorSlug } from './env';
import { api, expect, openRoute, test } from './fixtures';

// The author page's writes, checked against what the page read. Every write is
// stubbed with page.route and answered with the changed resource, so nothing reaches
// the server (safe on staging); the stubbed answers only change this page's caches.

type Resource = Record<string, unknown> & { id: number };

interface Book extends Resource {
  title: string;
  monitored: boolean;
}

interface Author extends Resource {
  titleSlug: string;
  monitored: boolean;
  monitorNewItems: string;
  metadataProfileId: number;
  rootFolderPath?: string;
  tags: number[];
}

interface Write {
  method: string;
  path: string;
  body: unknown;
}

const json = { status: 200, contentType: 'application/json' };

async function pickAuthor(page: Page) {
  const authors = await api<Author[]>(page, '/author');
  const listed = authorSlug ? authors.find((a) => a.titleSlug === authorSlug) : authors[0];

  expect(listed, 'the library needs an author').toBeTruthy();

  // The single GET is what the payload is compared against, field for field.
  return api<Author>(page, `/author/${(listed as Author).id}`);
}

// What the page should PUT: the author as read, minus statistics (useSaveAuthor
// leaves them out; AuthorResource.ToModel ignores them).
function withoutStatistics(author: Author) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { statistics, ...rest } = author;

  return rest;
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
      route.fulfill({ ...json, body: JSON.stringify(body) });
  });

  return writes;
}

function monitorChip(page: Page) {
  return page.locator('[class*="AuthorDetails-header"] button[aria-pressed]');
}

function bookRow(page: Page, title: string) {
  return page.locator('tbody tr').filter({ has: page.getByRole('link', { name: title, exact: true }) }).first();
}

// Toolbar buttons that don't fit the width move into the toolbar's More menu.
async function pressToolbarAction(page: Page, label: string) {
  const button = page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: new RegExp(`^${label}$`) });

  if (await button.count()) {
    await button.click();
    return;
  }

  await page.locator('[class*="ToolbarMenuButton-menuButton"]', { hasText: 'More' }).click();
  await page.locator('[class*="MenuItem-menuItem"]', { hasText: new RegExp(`^${label}$`) }).click();
}

test('author details: the author and book monitor toggles send what the page read', async ({ page }) => {
  const author = await pickAuthor(page);
  const books = await api<Book[]>(page, `/book?authorId=${author.id}`);
  expect(books.length, 'the author needs books').toBeGreaterThan(0);

  // The Books tab sorts by release date, newest first; any row will do.
  const book = books[0];

  const writes = await stubWrites(page, ({ method, path, body }) => {
    if (method === 'PUT' && path === `/author/${author.id}`) {
      return body;
    }

    if (method === 'PUT' && path === '/book/monitor') {
      const { bookIds, monitored } = body as { bookIds: number[]; monitored: boolean };

      return books.filter((b) => bookIds.includes(b.id)).map((b) => ({ ...b, monitored }));
    }

    return undefined;
  });

  await openRoute(page, `/author/${author.titleSlug}`);

  const chip = monitorChip(page);
  await expect(chip).toHaveAttribute('aria-pressed', String(author.monitored));

  const toggleAuthor = async (from: boolean) => {
    const put = page.waitForRequest((r) => r.method() === 'PUT' && apiPath(r) === `/author/${author.id}`);
    await chip.click();
    expect((await put).postDataJSON()).toEqual(withoutStatistics({ ...author, monitored: !from }));
    await expect(chip).toHaveAttribute('aria-pressed', String(!from));
  };

  const toggleBook = async () => {
    const row = bookRow(page, book.title);
    const toggle = row.locator('[class*="BookRow-monitored"] button');

    await expect(toggle).toBeEnabled();

    const put = page.waitForRequest((r) => r.method() === 'PUT' && apiPath(r) === '/book/monitor');
    await toggle.click();
    expect((await put).postDataJSON()).toEqual({ bookIds: [book.id], monitored: !book.monitored });
  };

  // A book's toggle only works while its author is monitored, so the book goes
  // first when the author starts monitored and second when it doesn't.
  if (author.monitored) {
    await toggleBook();
    await toggleAuthor(true);
  } else {
    await toggleAuthor(false);
    await toggleBook();
  }

  expect(writes.map((w) => `${w.method} ${w.path}`).sort()).toEqual(
    ['PUT /book/monitor', `PUT /author/${author.id}`].sort()
  );
});

test('author details: the edit modal saves every field it does not show', async ({ page }) => {
  const author = await pickAuthor(page);
  const monitorNewItems = author.monitorNewItems === 'none' ? 'new' : 'none';

  const writes = await stubWrites(page, ({ method, path, body }) => {
    return method === 'PUT' && path === `/author/${author.id}` ? body : undefined;
  });

  await openRoute(page, `/author/${author.titleSlug}`);
  await pressToolbarAction(page, 'Edit');

  const modal = page.locator('[class*="ModalContent-modalContent"]');
  await expect(modal).toBeVisible();

  // The overview override has loaded once its field shows; leaving it alone must not
  // PUT /author/{id}/metadata.
  await expect(modal.locator('textarea[name="overview"]')).toBeVisible();
  await modal.locator('select[name="monitorNewItems"]').selectOption(monitorNewItems);

  const put = page.waitForRequest((r) => r.method() === 'PUT' && apiPath(r) === `/author/${author.id}`);
  await modal.getByRole('button', { name: 'Save' }).click();
  const payload = (await put).postDataJSON() as Author;

  // The fields stage 3 must not lose, named so a failure says which one went.
  expect(payload.metadataProfileId).toBe(author.metadataProfileId);
  expect(payload.monitorNewItems).toBe(monitorNewItems);
  expect(payload.rootFolderPath).toBe(author.rootFolderPath);
  expect(payload.tags).toEqual(author.tags);

  // And everything else, field for field against the GET.
  expect(payload).toEqual(withoutStatistics({ ...author, monitorNewItems }));

  await expect(modal).toHaveCount(0);
  expect(writes.map((w) => `${w.method} ${w.path}`)).toEqual([`PUT /author/${author.id}`]);
});
