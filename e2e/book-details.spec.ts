import fs from 'fs';
import path from 'path';
import { Locator, Page, Request } from '@playwright/test';
import { authorSlug, baseUrl } from './env';
import { api, expect, openRoute, test, waitForPage } from './fixtures';

// The book page's edit modal (the book PUT, the monitored edition and the metadata
// set by hand, PR #20) and its Files tab. The payload checks stub every write with
// page.route, so they are safe on staging. The two checks that really save (a title
// set by hand, a book file deleted and put back) only run against a local backend.

type Resource = Record<string, unknown> & { id: number };

interface Book extends Resource {
  title: string;
  titleSlug: string;
  authorId: number;
  anyEditionOk: boolean;
  statistics?: { bookFileCount: number };
}

interface Edition extends Resource {
  foreignEditionId: string;
  monitored: boolean;
}

interface SeriesLink {
  seriesId: number;
  seriesTitle?: string;
  position?: string;
  isManual: boolean;
}

interface BookMetadata {
  title?: string;
  releaseDate?: string;
  overview?: string;
  pageCount?: number;
  series?: SeriesLink[];
  availableSeries?: { id: number; title: string }[];
}

interface BookFile extends Resource {
  bookId: number;
  path: string;
}

interface Write {
  method: string;
  path: string;
  body: unknown;
}

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(baseUrl);

// The local throwaway library (see the T-156 brief): the Wings file and its backup.
const WINGS_FILE = 'Wings.epub';
const BOOKS_BACKUP = process.env.READARR_BOOKS_BACKUP ?? '/tmp/t156/books-backup';

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

async function authorBooks(page: Page) {
  const authors = await api<{ id: number; titleSlug: string }[]>(page, '/author');
  const author = authorSlug ? authors.find((a) => a.titleSlug === authorSlug) : authors[0];

  expect(author, 'the library needs an author').toBeTruthy();

  const books = await api<Book[]>(page, `/book?authorId=${author?.id}`);
  expect(books.length, 'the author needs books').toBeGreaterThan(0);

  return books;
}

// The book exactly as the edit modal reads it (GET /book?bookIds=, no author).
async function getBook(page: Page, bookId: number) {
  const [book] = await api<Book[]>(page, `/book?bookIds=${bookId}`);

  return book;
}

// What useSaveBook sends: the book minus statistics, which BookResource.ToModel ignores.
function withoutStatistics(book: Book) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { statistics, ...rest } = book;

  return rest;
}

// The JS modal's toMetadataRequest applied to what GET /book/{id}/metadata sent.
function metadataRequest(saved: BookMetadata) {
  return {
    title: saved.title || null,
    releaseDate: saved.releaseDate ? `${saved.releaseDate.substring(0, 10)}T00:00:00Z` : null,
    overview: saved.overview || null,
    pageCount: saved.pageCount || null,
    series: (saved.series ?? []).map((row) => ({
      seriesId: row.seriesId,
      newSeriesTitle: null,
      position: row.position
    }))
  };
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

async function openEditModal(page: Page) {
  await pressToolbarAction(page, 'Edit');

  const modal = page.locator('[class*="ModalContent-modalContent"]');
  await expect(modal).toBeVisible();

  // The metadata fields show once GET /book/{id}/metadata has answered.
  await expect(modal.locator('input[name="title"]')).toBeVisible();

  return modal;
}

function bookTitle(page: Page) {
  return page.locator('[class*="BookDetails-title-"]');
}

async function saveAndClose(modal: Locator) {
  await modal.getByRole('button', { name: 'Save' }).click();
  await expect(modal).toHaveCount(0);
}

test('book details: changing the monitored edition sends the book and every edition', async ({ page }) => {
  const books = await authorBooks(page);

  let book: Book | undefined;
  let editions: Edition[] = [];

  for (const candidate of books) {
    editions = await api<Edition[]>(page, `/edition?bookId=${candidate.id}`);

    if (editions.length > 1 && editions.some((e) => e.monitored)) {
      book = await getBook(page, candidate.id);
      break;
    }
  }

  test.skip(!book, 'no book with more than one edition');

  const current = book as Book;
  const target = editions.find((e) => !e.monitored) as Edition;

  const writes = await stubWrites(page, ({ method, path: writePath, body }) => {
    return method === 'PUT' && writePath === `/book/${current.id}` ? body : undefined;
  });

  await openRoute(page, `/book/${current.titleSlug}`);
  const modal = await openEditModal(page);

  // A book with a file only lets the edition change once Automatically Switch Edition
  // is off.
  const select = modal.locator('select[name="editions"]');

  if (current.anyEditionOk) {
    if ((current.statistics?.bookFileCount ?? 0) > 0) {
      await expect(select).toBeDisabled();
    }

    await modal.locator('input[name="anyEditionOk"]').locator('..').click();
  }

  await expect(select).toBeEnabled();
  await select.selectOption(target.foreignEditionId);

  const put = page.waitForRequest((r) => r.method() === 'PUT' && apiPath(r) === `/book/${current.id}`);
  await saveAndClose(modal);
  const payload = (await put).postDataJSON() as Book & { editions: Edition[] };

  // Named first so a failure says which part went.
  expect(payload.anyEditionOk).toBe(false);
  expect(payload.editions.filter((e) => e.monitored).map((e) => e.id)).toEqual([target.id]);

  expect(payload).toStrictEqual({
    ...withoutStatistics(current),
    anyEditionOk: false,
    editions: editions.map((e) => ({ ...e, monitored: e.id === target.id }))
  });

  // The metadata was left alone, so only the book was saved.
  expect(writes.map((w) => `${w.method} ${w.path}`)).toEqual([`PUT /book/${current.id}`]);
});

test('book details: a metadata edit sends the PR #20 payload, then the book unchanged', async ({ page }) => {
  const books = await authorBooks(page);
  const book = await getBook(page, books[0].id);
  const saved = await api<BookMetadata>(page, `/book/${book.id}/metadata`);

  const title = `e2e-bd-title-${Date.now()}`;
  const newSeries = `e2e-bd-series-${Date.now()}`;

  const writes = await stubWrites(page, ({ method, path: writePath, body }) => {
    if (method === 'PUT' && writePath === `/book/${book.id}/metadata`) {
      return { ...saved, title };
    }

    return method === 'PUT' && writePath === `/book/${book.id}` ? body : undefined;
  });

  await openRoute(page, `/book/${book.titleSlug}`);
  const modal = await openEditModal(page);

  await modal.locator('input[name="title"]').fill(title);
  await modal.locator('input[name="pageCount"]').fill('4242');

  // A series of the user's own: the new row's series select set to New series.
  const rows = saved.series?.length ?? 0;
  await modal.getByRole('button', { name: 'Add to series' }).click();
  await modal.locator(`select[name="series${rows}"]`).selectOption('new');
  await modal.locator(`input[name="newSeries${rows}"]`).fill(newSeries);
  await modal.locator(`input[name="position${rows}"]`).fill('7');

  const metadataPut = page.waitForRequest((r) => r.method() === 'PUT' && apiPath(r) === `/book/${book.id}/metadata`);
  const bookPut = page.waitForRequest((r) => r.method() === 'PUT' && apiPath(r) === `/book/${book.id}`);
  await saveAndClose(modal);

  const expected = metadataRequest(saved);

  expect((await metadataPut).postDataJSON()).toStrictEqual({
    ...expected,
    title,
    pageCount: 4242,
    series: [...expected.series, { seriesId: 0, newSeriesTitle: newSeries, position: '7' }]
  });

  expect((await bookPut).postDataJSON()).toStrictEqual(withoutStatistics(book));

  expect(writes.map((w) => `${w.method} ${w.path}`)).toEqual([
    `PUT /book/${book.id}/metadata`,
    `PUT /book/${book.id}`
  ]);
});

test('book details: a title set by hand survives a reload, and clearing it leaves the original', async ({ page }) => {
  test.skip(!isLocal, 'saves metadata; local backend only');

  const books = await authorBooks(page);
  let book: Book | undefined;
  let saved: BookMetadata = {};

  for (const candidate of books) {
    saved = await api<BookMetadata>(page, `/book/${candidate.id}/metadata`);

    if (!saved.title) {
      book = candidate;
      break;
    }
  }

  test.skip(!book, 'every book already has a title set by hand');

  const current = book as Book;
  const original = current.title;
  const title = `e2e-bd-title-${Date.now()}`;

  try {
    await openRoute(page, `/book/${current.titleSlug}`);
    await expect(bookTitle(page)).toHaveText(original);

    let modal = await openEditModal(page);
    await modal.locator('input[name="title"]').fill(title);
    await saveAndClose(modal);

    await page.reload();
    await waitForPage(page);
    await expect(bookTitle(page)).toHaveText(title);
    expect((await api<BookMetadata>(page, `/book/${current.id}/metadata`)).title).toBe(title);

    // The local metadata source is a dead stub, so the refresh a cleared title starts
    // can't bring the original back: set it by hand first, then clear the override.
    modal = await openEditModal(page);
    await expect(modal.locator('input[name="title"]')).toHaveValue(title);
    await modal.locator('input[name="title"]').fill(original);
    await saveAndClose(modal);

    modal = await openEditModal(page);
    await modal.locator('input[name="title"]').fill('');
    await saveAndClose(modal);

    await page.reload();
    await waitForPage(page);
    await expect(bookTitle(page)).toHaveText(original);
    expect((await api<BookMetadata>(page, `/book/${current.id}/metadata`)).title).toBeUndefined();
  } finally {
    const after = await api<BookMetadata>(page, `/book/${current.id}/metadata`);

    if (after.title) {
      const restore = metadataRequest(saved);
      await api(page, `/book/${current.id}/metadata`, { method: 'PUT', data: { ...restore, title: original } });
      await api(page, `/book/${current.id}/metadata`, { method: 'PUT', data: restore });
    }
  }
});

test('book details: deleting a book file from the Files tab', async ({ page }) => {
  // Deletes a real file; local backend only, with a backup to put it back from.
  const backup = path.join(BOOKS_BACKUP, WINGS_FILE);
  test.skip(!isLocal || !fs.existsSync(backup), 'deletes a file; local backend with a backup only');

  const books = await authorBooks(page);
  const authorId = books[0].authorId;
  const filesBefore = await api<BookFile[]>(page, `/bookfile?authorId=${authorId}`);
  const file = filesBefore.find((f) => path.basename(f.path) === WINGS_FILE);

  test.skip(!file, `no ${WINGS_FILE} in the library`);

  const bookFile = file as BookFile;
  const book = books.find((b) => b.id === bookFile.bookId) as Book;

  // Re-importing the file lets a book with Automatically Switch Edition on move to
  // the edition the file matches best, so the monitored edition is put back as well.
  const editionsBefore = await api<Edition[]>(page, `/edition?bookId=${book.id}`);

  try {
    await openRoute(page, `/book/${book.titleSlug}`);
    await page.getByRole('tab', { name: /^Files/ }).click();

    const row = page.locator('tbody tr').filter({ hasText: bookFile.path });
    await expect(row).toHaveCount(1);

    const deleted = page.waitForResponse((r) => r.request().method() === 'DELETE' && apiPath(r.request()) === `/bookfile/${bookFile.id}`, { timeout: 15_000 });
    await row.getByRole('button', { name: 'Delete Book File' }).click();
    await page.locator('[class*="ModalContent-modalContent"]').getByRole('button', { name: 'Delete', exact: true }).click();
    expect((await deleted).ok()).toBeTruthy();

    await expect(row).toHaveCount(0);
    // The table goes once its last file does (the empty message is a new en.json key,
    // which a running backend doesn't serve until it restarts).
    await expect(page.locator('[class*="BookFileEditorTable-filesTable"]')).toHaveCount(0);
    expect(fs.existsSync(bookFile.path)).toBe(false);
    expect((await api<BookFile[]>(page, `/bookfile?bookId=${book.id}`)).length).toBe(0);
  } finally {
    // Put the file back and rescan, so the library has its files again.
    if (!fs.existsSync(bookFile.path)) {
      fs.copyFileSync(backup, bookFile.path);
    }

    await api(page, '/command', { method: 'POST', data: { name: 'RescanFolders' } });

    await expect.poll(async () => {
      const files = await api<BookFile[]>(page, `/bookfile?authorId=${authorId}`);

      return files.map((f) => `${f.bookId} ${f.path}`).sort();
    }, { timeout: 60_000 }).toEqual(filesBefore.map((f) => `${f.bookId} ${f.path}`).sort());

    const monitoredEdition = (editions: Edition[]) => editions.filter((e) => e.monitored).map((e) => e.id);
    const editionsAfter = await api<Edition[]>(page, `/edition?bookId=${book.id}`);

    if (monitoredEdition(editionsAfter).join() !== monitoredEdition(editionsBefore).join()) {
      const before = new Set(monitoredEdition(editionsBefore));

      await api(page, `/book/${book.id}`, {
        method: 'PUT',
        data: {
          ...withoutStatistics(await getBook(page, book.id)),
          editions: editionsAfter.map((e) => ({ ...e, monitored: before.has(e.id) }))
        }
      });
    }

    expect(monitoredEdition(await api<Edition[]>(page, `/edition?bookId=${book.id}`))).toEqual(monitoredEdition(editionsBefore));
  }
});
