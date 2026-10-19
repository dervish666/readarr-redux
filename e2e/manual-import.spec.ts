import fs from 'fs';
import path from 'path';
import { Locator, Page, Request } from '@playwright/test';
import { authorSlug, baseUrl } from './env';
import { api, expect, openRoute, test } from './fixtures';

// Manual import (the folder picker, the file list, the Select Edition modal, the
// ManualImport command) and the unmapped files page. GET /manualimport and
// POST /manualimport only read and re-evaluate files; every check stubs or refuses
// POST /command, so nothing is ever imported. The checks against the real import
// folder only run on a local backend; the others use fixtures and are staging-safe.

type Resource = Record<string, unknown> & { id: number };

interface ImportItem extends Resource {
  path: string;
  name?: string;
  author?: Resource & { authorName: string };
  book?: Resource & { title: string };
  foreignEditionId?: string;
  quality?: unknown;
  releaseGroup?: string;
  indexerFlags: number;
  downloadId?: string;
  additionalFile: boolean;
  replaceExistingFiles: boolean;
  disableReleaseSwitching: boolean;
}

interface Edition extends Resource {
  bookId: number;
  foreignEditionId: string;
  title: string;
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

// The local throwaway library (see the T-156 brief): two EPUBs to import by hand and
// one unmapped file in the author's folder.
const IMPORT_FOLDER = process.env.READARR_IMPORT_FOLDER ?? '/tmp/t156/import';
const UNMAPPED_FILE = 'Some Unknown Book.epub';

const json = { contentType: 'application/json' };

const importFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'manual-import.json'), 'utf8')
) as ImportItem[];

const unmappedFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'unmapped-files.json'), 'utf8')
) as BookFile[];

function apiPath(request: Request) {
  return new URL(request.url()).pathname.replace(/^.*\/api\/v1/, '');
}

// Records every non-GET API request. `answer` gives [status, body] for the writes a
// test expects; anything else gets a 500 (still recorded), so a stray write, a
// ManualImport command above all, fails the test without reaching the server.
async function stubWrites(page: Page, answer: (write: Write) => [number, unknown] | undefined) {
  const writes: Write[] = [];

  await page.route((url) => url.pathname.includes('/api/v1/'), (route) => {
    const request = route.request();

    if (request.method() === 'GET') {
      return route.fallback();
    }

    const write = { method: request.method(), path: apiPath(request), body: request.postDataJSON() };
    writes.push(write);

    const result = answer(write);

    return result === undefined ?
      route.fulfill({ ...json, status: 500, body: '{}' }) :
      route.fulfill({ ...json, status: result[0], body: JSON.stringify(result[1]) });
  });

  return writes;
}

// A queued command as POST /command answers it.
function fakeCommand(body: { name: string }) {
  const now = new Date().toISOString();

  return {
    id: 990900,
    name: body.name,
    commandName: body.name,
    body: { ...body, sendUpdatesToClient: true },
    priority: 'normal',
    status: 'queued',
    queued: now,
    trigger: 'manual',
    sendUpdatesToClient: true,
    updateScheduledTask: true
  };
}

// What the modal sends back to POST /manualimport for an item (ManualImportUpdateResource
// without the rejections, which the server ignores).
function updateItem(item: ImportItem) {
  return {
    id: item.id,
    path: item.path,
    name: item.name,
    authorId: item.author?.id,
    bookId: item.book?.id,
    foreignEditionId: item.foreignEditionId,
    quality: item.quality,
    releaseGroup: item.releaseGroup,
    indexerFlags: item.indexerFlags,
    downloadId: item.downloadId,
    additionalFile: item.additionalFile,
    replaceExistingFiles: item.replaceExistingFiles,
    disableReleaseSwitching: item.disableReleaseSwitching
  };
}

// JSON drops undefined, so compare against what goes over the wire.
function wire<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

function importModal(page: Page) {
  return page.locator('[class*="ModalContent-modalContent"]').first();
}

function importRows(modal: Locator) {
  return modal.locator('tbody tr');
}

// Wanted > Missing > Manual Import, then the folder picker's Interactive Import.
async function openFolderImport(page: Page, folder: string) {
  await openRoute(page, '/wanted/missing');
  await pressToolbarAction(page, 'Manual Import');

  const modal = importModal(page);
  const folderInput = modal.locator('input[name="folder"]');

  // The path input reports its value on blur (Tab would pick a suggestion instead).
  await folderInput.fill(folder);
  await folderInput.blur();
  await modal.getByRole('button', { name: 'Interactive Import' }).click();

  return modal;
}

async function localImportItems(page: Page) {
  const query = new URLSearchParams({
    folder: IMPORT_FOLDER,
    filterExistingFiles: 'true',
    replaceExistingFiles: 'false'
  });

  return api<ImportItem[]>(page, `/manualimport?${query.toString()}`);
}

test.describe('manual import against the local import folder', () => {
  test.skip(!isLocal || !fs.existsSync(IMPORT_FOLDER), 'lists a real folder; local backend only');

  test('lists every file of the folder with its author and book, selected', async ({ page }) => {
    const expected = await localImportItems(page);
    expect(expected.length, 'the import folder needs files').toBeGreaterThan(0);

    const writes = await stubWrites(page, () => undefined);
    const modal = await openFolderImport(page, IMPORT_FOLDER);

    const rows = importRows(modal);
    await expect(rows).toHaveCount(expected.length);

    for (const item of expected) {
      const row = rows.filter({ hasText: item.path });

      // Cells: select, path, author, book. The path holds the title too, so check
      // the author and book cells themselves.
      await expect(row).toHaveCount(1);
      await expect(row.locator('td').nth(2)).toHaveText(item.author?.authorName ?? '');
      await expect(row.locator('td').nth(3)).toHaveText(item.book?.title ?? '');

      // A file with author, book, edition and quality starts selected.
      await expect(row.locator('input[type="checkbox"]')).toBeChecked();
    }

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toHaveCount(0);

    expect(writes).toEqual([]);
  });

  test('picking an edition sends the book\'s files back for re-evaluation and never imports', async ({ page }) => {
    const items = await localImportItems(page);
    const target = items.find((item) => item.book);

    expect(target, 'the import folder needs a file matched to a book').toBeTruthy();

    const item = target as ImportItem;
    const bookId = item.book?.id as number;
    const bookItems = items.filter((i) => i.book?.id === bookId);

    // The local books have one edition each, so the book gets a made-up second one.
    const [realEdition] = await api<Edition[]>(page, `/edition?bookId=${bookId}`);
    const extraEdition = {
      ...realEdition,
      id: 990501,
      foreignEditionId: 'e2e-edition-990501',
      title: 'E2E Edition',
      monitored: false
    };

    await page.route((url) => url.pathname.endsWith('/api/v1/edition'), async (route) => {
      const response = await route.fetch();
      const editions = (await response.json()) as Edition[];

      await route.fulfill({ response, json: [...editions, extraEdition] });
    });

    const writes = await stubWrites(page, ({ method, path: writePath, body }) => {
      if (method === 'POST' && writePath === '/manualimport') {
        return [202, (body as ImportItem[]).map((sent) => {
          const original = items.find((i) => i.id === sent.id) as ImportItem;

          return { ...original, foreignEditionId: sent.foreignEditionId, disableReleaseSwitching: true, rejections: [] };
        })];
      }

      return undefined;
    });

    const modal = await openFolderImport(page, IMPORT_FOLDER);
    await expect(importRows(modal)).toHaveCount(items.length);

    await modal.locator('select[name="select"]').selectOption('edition');

    // By header: the import modal's own bulk select also has a Select Edition option.
    const editionModal = page.locator('[class*="ModalContent-modalContent"]').filter({
      has: page.locator('[class*="ModalHeader-modalHeader"]', { hasText: 'Select Edition' })
    });
    const editionSelect = editionModal.locator(`select[name="${bookId}"]`);

    await expect(editionSelect).toHaveValue(item.foreignEditionId as string);
    await editionSelect.selectOption(extraEdition.foreignEditionId);
    await expect(editionModal).toHaveCount(0);

    await expect.poll(() => writes.length).toBe(1);

    expect(writes[0].method).toBe('POST');
    expect(writes[0].path).toBe('/manualimport');
    expect(writes[0].body).toStrictEqual(wire(bookItems.map((i) => updateItem({
      ...i,
      foreignEditionId: extraEdition.foreignEditionId,
      disableReleaseSwitching: true
    }))));

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(importModal(page)).toHaveCount(0);

    // Only the re-evaluation went out: no ManualImport command.
    expect(writes.filter((w) => w.path === '/command')).toEqual([]);
    expect(writes).toHaveLength(1);
  });
});

test('manual import: Import sends the ManualImport command with every selected file', async ({ page }) => {
  const authors = await api<{ id: number; titleSlug: string; path: string }[]>(page, '/author');
  const author = authorSlug ? authors.find((a) => a.titleSlug === authorSlug) : authors[0];

  expect(author, 'the library needs an author').toBeTruthy();

  // The author page's Manual Import lists the author's folder; the fixture answers instead.
  await page.route((url) => url.pathname.endsWith('/api/v1/manualimport'), (route) => {
    return route.request().method() === 'GET' ?
      route.fulfill({ ...json, status: 200, body: JSON.stringify(importFixture) }) :
      route.fallback();
  });

  const writes = await stubWrites(page, ({ method, path: writePath, body }) => {
    return method === 'POST' && writePath === '/command' ? [201, fakeCommand(body as { name: string })] : undefined;
  });

  await openRoute(page, `/author/${author?.titleSlug}`);
  await pressToolbarAction(page, 'Manual Import');

  const modal = importModal(page);
  const rows = importRows(modal);
  await expect(rows).toHaveCount(importFixture.length);

  for (const row of await rows.all()) {
    await expect(row.locator('input[type="checkbox"]')).toBeChecked();
  }

  await modal.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(modal).toHaveCount(0);

  expect(writes).toHaveLength(1);
  expect(writes[0].path).toBe('/command');

  // The author page has no import mode select, so the server picks (auto). Files go
  // out in the list's order (path ascending).
  expect(writes[0].body).toStrictEqual(wire({
    name: 'ManualImport',
    files: [...importFixture].sort((a, b) => a.path.localeCompare(b.path)).map((item) => ({
      path: item.path,
      authorId: item.author?.id,
      bookId: item.book?.id,
      foreignEditionId: item.foreignEditionId,
      quality: item.quality,
      indexerFlags: item.indexerFlags,
      downloadId: undefined,
      disableReleaseSwitching: item.disableReleaseSwitching
    })),
    importMode: 'auto',
    replaceExistingFiles: false
  }));
});

test('unmapped files lists the files that match no book', async ({ page }) => {
  const unmapped = (await api<BookFile[]>(page, '/bookfile?unmapped=true')).filter((f) => f.bookId === 0);

  await openRoute(page, '/unmapped');

  const rows = page.locator('[class*="PageContentBody-contentBody"] tbody tr');

  if (!unmapped.length) {
    await expect(page.locator('[class*="PageContentBody-contentBody"] [class*="Alert-info"]')).toBeVisible();
    await expect(rows).toHaveCount(0);
    return;
  }

  await expect(rows).toHaveCount(unmapped.length);

  for (const file of unmapped) {
    await expect(rows.filter({ hasText: file.path })).toHaveCount(1);
  }

  if (isLocal && fs.existsSync(IMPORT_FOLDER)) {
    // The local library's one unmapped file.
    await expect(rows.filter({ hasText: UNMAPPED_FILE })).toHaveCount(1);
  }
});

test('unmapped files: Delete Selected sends the selected file ids', async ({ page }) => {
  await page.route((url) => url.pathname.endsWith('/api/v1/bookfile'), (route) => {
    const url = new URL(route.request().url());

    return route.request().method() === 'GET' && url.searchParams.get('unmapped') === 'true' ?
      route.fulfill({ ...json, status: 200, body: JSON.stringify(unmappedFixture) }) :
      route.fallback();
  });

  const writes = await stubWrites(page, ({ method, path: writePath }) => {
    return method === 'DELETE' && writePath === '/bookfile/bulk' ? [200, {}] : undefined;
  });

  await openRoute(page, '/unmapped');

  const rows = page.locator('[class*="PageContentBody-contentBody"] tbody tr');
  await expect(rows).toHaveCount(unmappedFixture.length);

  const target = unmappedFixture[1];
  const targetRow = rows.filter({ hasText: target.path });

  await targetRow.locator('input[type="checkbox"]').locator('..').click();
  await expect(targetRow.locator('input[type="checkbox"]')).toBeChecked();

  await pressToolbarAction(page, 'Delete Selected');

  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toStrictEqual({
    method: 'DELETE',
    path: '/bookfile/bulk',
    body: { bookFileIds: [target.id] }
  });

  // The deleted file leaves the list without a refetch.
  await expect(rows).toHaveCount(unmappedFixture.length - 1);
  await expect(rows.filter({ hasText: target.path })).toHaveCount(0);
});
