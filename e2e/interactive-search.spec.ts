import fs from 'fs';
import path from 'path';
import { Page, Request } from '@playwright/test';
import { authorSlug } from './env';
import { api, expect, openRoute, test, waitForPage } from './fixtures';

// Interactive search on the book and author pages. GET /release is answered from
// e2e/fixtures/releases.json and every write is stubbed with page.route, so these
// checks never run an indexer search or grab anything, on staging or locally.

interface Release {
  guid: string;
  indexerId: number;
  title: string;
  releaseWeight: number;
  rejections: string[];
  downloadAllowed: boolean;
  discography: boolean;
}

interface Author {
  id: number;
  titleSlug: string;
}

interface Book {
  id: number;
  titleSlug: string;
}

interface Write {
  method: string;
  path: string;
  body: unknown;
}

const RELEASES: Release[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'releases.json'), 'utf8')
);

function apiPath(request: Request) {
  return new URL(request.url()).pathname.replace(/^.*\/api\/v1/, '');
}

// Answers GET /release from the fixture and POST /release with the posted body.
// Any other write is answered 500 and recorded, so a stray one fails the test.
async function stubReleases(page: Page) {
  const searches: URLSearchParams[] = [];
  const writes: Write[] = [];

  await page.route((url) => url.pathname.includes('/api/v1/'), (route) => {
    const request = route.request();
    const requestPath = apiPath(request);

    if (request.method() === 'GET') {
      if (requestPath !== '/release') {
        return route.fallback();
      }

      searches.push(new URL(request.url()).searchParams);

      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RELEASES) });
    }

    const write = { method: request.method(), path: requestPath, body: request.postDataJSON() };
    writes.push(write);

    return write.method === 'POST' && write.path === '/release' ?
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(write.body) }) :
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });

  return { searches, writes };
}

async function pickAuthor(page: Page) {
  const authors = await api<Author[]>(page, '/author');
  const author = authorSlug ? authors.find((a) => a.titleSlug === authorSlug) : authors[0];

  expect(author, 'the library needs an author').toBeTruthy();

  return author as Author;
}

async function pickBook(page: Page) {
  const author = await pickAuthor(page);
  const books = await api<Book[]>(page, `/book?authorId=${author.id}`);

  expect(books.length, 'the author needs books').toBeGreaterThan(0);

  return books[0];
}

async function openSearchTab(page: Page) {
  await page.getByRole('tab', { name: 'Search', exact: true }).click();
  await waitForPage(page);
}

function releaseTitles(page: Page) {
  return page.locator('tbody tr a[href*="indexer.invalid"]');
}

function releaseRow(page: Page, release: Release) {
  return page.locator('tbody tr', { hasText: release.title });
}

function titlesBy(compare: (a: Release, b: Release) => number) {
  return [...RELEASES].sort(compare).map((r) => r.title);
}

const rejected = RELEASES.find((r) => r.rejections.length > 0) as Release;
const allowed = RELEASES.find((r) => r.downloadAllowed) as Release;

test('interactive search: book search lists, sorts and explains rejections', async ({ page }) => {
  const book = await pickBook(page);
  const { searches, writes } = await stubReleases(page);

  await openRoute(page, `/book/${book.titleSlug}`);
  await openSearchTab(page);

  // One search, for this book only.
  await expect(releaseTitles(page)).toHaveCount(RELEASES.length);
  expect(searches.map((s) => s.toString())).toEqual([`bookId=${book.id}`]);

  // The server's order (release weight) until a header is pressed.
  await expect(releaseTitles(page)).toHaveText(titlesBy((a, b) => a.releaseWeight - b.releaseWeight));

  await page.locator('th', { hasText: /^Title$/i }).click();
  await expect(releaseTitles(page)).toHaveText(titlesBy((a, b) => (a.title < b.title ? -1 : 1)));

  await page.locator('th', { hasText: /^Title$/i }).click();
  await expect(releaseTitles(page)).toHaveText(titlesBy((a, b) => (a.title < b.title ? 1 : -1)));

  // Only the rejected release has the rejection icon; hovering it lists the reasons.
  await expect(page.locator('[class*="InteractiveSearchRow-rejected"] svg')).toHaveCount(1);
  await releaseRow(page, rejected).locator('[class*="InteractiveSearchRow-rejected"] svg').hover();

  const popover = page.locator('[class*="Popover-body"]');
  await expect(popover).toBeVisible();

  for (const reason of rejected.rejections) {
    await expect(popover).toContainText(reason);
  }

  // The predefined Discography filter keeps the discography release only.
  await page.locator('[class*="PageMenuButton-menuButton"]', { hasText: 'Filter' }).click();
  await page.locator('[class*="FilterMenuItem-menuItem"], [class*="MenuItem-menuItem"]', { hasText: /^Discography$/ }).click();
  await expect(releaseTitles(page)).toHaveText(RELEASES.filter((r) => r.discography).map((r) => r.title));

  // Switching tabs keeps the releases; it doesn't search again.
  await page.getByRole('tab', { name: /^History/ }).click();
  await openSearchTab(page);
  await expect(releaseTitles(page)).toHaveCount(RELEASES.filter((r) => r.discography).length);
  expect(searches).toHaveLength(1);

  expect(writes).toEqual([]);
});

test('interactive search: grabbing posts the release, and the book for a rejected one', async ({ page }) => {
  const book = await pickBook(page);
  const { writes } = await stubReleases(page);

  await openRoute(page, `/book/${book.titleSlug}`);
  await openSearchTab(page);
  await expect(releaseTitles(page)).toHaveCount(RELEASES.length);

  // An allowed release is grabbed straight away with its guid and indexer.
  await releaseRow(page, allowed).getByRole('button', { name: 'Grab' }).click();
  await expect.poll(() => writes.length).toBe(1);

  expect(writes[0]).toStrictEqual({
    method: 'POST',
    path: '/release',
    body: { guid: allowed.guid, indexerId: allowed.indexerId }
  });

  // A release the server can't place asks first, then names the searched book.
  await releaseRow(page, rejected).getByRole('button', { name: 'Grab' }).click();

  const modal = page.locator('[class*="ModalContent-modalContent"]');
  await expect(modal).toBeVisible();
  expect(writes).toHaveLength(1);

  await modal.getByRole('button', { name: 'Grab' }).click();
  await expect.poll(() => writes.length).toBe(2);

  expect(writes[1]).toStrictEqual({
    method: 'POST',
    path: '/release',
    body: { guid: rejected.guid, indexerId: rejected.indexerId, bookId: book.id }
  });
});

test('interactive search: author search asks for the author', async ({ page }) => {
  const author = await pickAuthor(page);
  const { searches, writes } = await stubReleases(page);

  await openRoute(page, `/author/${author.titleSlug}`);
  await openSearchTab(page);

  await expect(releaseTitles(page)).toHaveCount(RELEASES.length);
  expect(searches.map((s) => s.toString())).toEqual([`authorId=${author.id}`]);

  await releaseRow(page, rejected).getByRole('button', { name: 'Grab' }).click();
  await page.locator('[class*="ModalContent-modalContent"]').getByRole('button', { name: 'Grab' }).click();
  await expect.poll(() => writes.length).toBe(1);

  expect(writes[0]).toStrictEqual({
    method: 'POST',
    path: '/release',
    body: { guid: rejected.guid, indexerId: rejected.indexerId, authorId: author.id }
  });
});

test('interactive search: a book row on the author page opens the search modal', async ({ page }) => {
  const author = await pickAuthor(page);
  const books = await api<Book[]>(page, `/book?authorId=${author.id}`);
  const { searches, writes } = await stubReleases(page);

  await openRoute(page, `/author/${author.titleSlug}`);
  await page.getByRole('button', { name: 'Interactive Search' }).first().click();

  const modal = page.locator('[class*="ModalContent-modalContent"]');
  await expect(modal.locator('tbody tr a[href*="indexer.invalid"]')).toHaveCount(RELEASES.length);

  expect(searches).toHaveLength(1);
  const bookId = Number(searches[0].get('bookId'));
  expect(books.map((b) => b.id)).toContain(bookId);

  await modal.getByRole('button', { name: 'Close' }).click();
  await expect(modal).toHaveCount(0);
  expect(writes).toEqual([]);
});
