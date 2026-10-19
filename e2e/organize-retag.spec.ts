import fs from 'fs';
import path from 'path';
import { Locator, Page, Request } from '@playwright/test';
import { authorSlug } from './env';
import { api, expect, openRoute, test } from './fixtures';

// The rename (organize) and retag previews on the author and book pages. GET /rename
// and GET /retag answer from e2e/fixtures (book file ids 9901xx and 9902xx), and the
// RenameFiles/RetagFiles commands are stubbed with page.route, so nothing is renamed
// or retagged, on staging or locally.

interface RenamePreview {
  bookFileId: number;
  existingPath: string;
  newPath: string;
}

interface RetagPreview {
  bookFileId: number;
  path: string;
  changes: { field: string; oldValue?: string; newValue?: string }[];
}

interface Author {
  id: number;
  titleSlug: string;
}

interface Book {
  id: number;
  authorId: number;
  titleSlug: string;
  statistics?: { bookFileCount: number };
}

interface Write {
  method: string;
  path: string;
  body: Record<string, unknown>;
}

function fixture<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));
}

const RENAMES = fixture<RenamePreview[]>('rename.json');
const RETAGS = fixture<RetagPreview[]>('retag.json');

function apiPath(request: Request) {
  return new URL(request.url()).pathname.replace(/^.*\/api\/v1/, '');
}

// Answers the previews from the fixtures and POST /command with a finished command.
// Any other write is answered 500 and recorded, so a stray one fails the test.
async function stubPreviews(page: Page) {
  const previews: { path: string; params: URLSearchParams }[] = [];
  const writes: Write[] = [];

  await page.route((url) => url.pathname.includes('/api/v1/'), (route) => {
    const request = route.request();
    const requestPath = apiPath(request);

    if (request.method() === 'GET') {
      const body = requestPath === '/rename' ? RENAMES : requestPath === '/retag' ? RETAGS : undefined;

      if (!body) {
        return route.fallback();
      }

      previews.push({ path: requestPath, params: new URL(request.url()).searchParams });

      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    }

    const write = { method: request.method(), path: requestPath, body: request.postDataJSON() };
    writes.push(write);

    if (write.method === 'POST' && write.path === '/command') {
      const command = {
        id: 990001,
        name: write.body.name,
        commandName: write.body.name,
        body: write.body,
        status: 'completed',
        queued: new Date().toISOString(),
        started: new Date().toISOString(),
        ended: new Date().toISOString(),
        trigger: 'manual'
      };

      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(command) });
    }

    return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });

  return { previews, writes };
}

async function pickAuthor(page: Page) {
  const authors = await api<Author[]>(page, '/author');
  const author = authorSlug ? authors.find((a) => a.titleSlug === authorSlug) : authors[0];

  expect(author, 'the library needs an author').toBeTruthy();

  return author as Author;
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

function modal(page: Page) {
  return page.locator('[class*="ModalContent-modalContent"]');
}

// CheckInput hides the real checkbox; the click lands on its label.
async function toggle(scope: Locator, name: string) {
  await scope.locator(`input[name="${name}"]`).locator('xpath=..').click();
}

test('organize: the author rename preview lists the files and renames the selected ones', async ({ page }) => {
  const author = await pickAuthor(page);
  const { previews, writes } = await stubPreviews(page);

  await openRoute(page, `/author/${author.titleSlug}`);
  await pressToolbarAction(page, 'Preview Rename');

  const rows = modal(page).locator('[class*="OrganizePreviewRow-row"]');
  await expect(rows).toHaveCount(RENAMES.length);

  for (const [index, rename] of RENAMES.entries()) {
    await expect(rows.nth(index)).toContainText(rename.existingPath);
    await expect(rows.nth(index)).toContainText(rename.newPath);
    await expect(rows.nth(index).locator(`input[name="${rename.bookFileId}"]`)).toBeChecked();
  }

  expect(previews.map((p) => `${p.path}?${p.params}`)).toEqual([`/rename?authorId=${author.id}`]);

  // Leave the second file out.
  await toggle(modal(page), String(RENAMES[1].bookFileId));
  await expect(modal(page).locator(`input[name="${RENAMES[1].bookFileId}"]`)).not.toBeChecked();

  await modal(page).getByRole('button', { name: 'Organize', exact: true }).click();
  await expect(modal(page)).toHaveCount(0);
  await expect.poll(() => writes.length).toBe(1);

  expect(writes[0]).toStrictEqual({
    method: 'POST',
    path: '/command',
    body: {
      name: 'RenameFiles',
      authorId: author.id,
      files: [RENAMES[0].bookFileId, RENAMES[2].bookFileId]
    }
  });
});

test('retag: the book retag preview lists the tag changes and retags the selected files', async ({ page }) => {
  const author = await pickAuthor(page);
  const books = await api<Book[]>(page, `/book?authorId=${author.id}`);
  const book = books.find((b) => (b.statistics?.bookFileCount ?? 0) > 0);

  test.skip(!book, 'the author has no book with files, so the preview buttons are disabled');

  const current = book as Book;
  const { previews, writes } = await stubPreviews(page);

  await openRoute(page, `/book/${current.titleSlug}`);
  await pressToolbarAction(page, 'Preview Retag');

  const rows = modal(page).locator('[class*="RetagPreviewRow-row"]');
  await expect(rows).toHaveCount(RETAGS.length);

  for (const [index, retag] of RETAGS.entries()) {
    await expect(rows.nth(index)).toContainText(retag.path);
    await expect(rows.nth(index)).toContainText(retag.changes[0].oldValue as string);
    await expect(rows.nth(index)).toContainText(retag.changes[0].newValue as string);
    // Image Size is shown in bytes.
    await expect(rows.nth(index)).toContainText('20 KiB');
  }

  expect(previews.map((p) => `${p.path}?${p.params}`)).toEqual([
    `/retag?authorId=${current.authorId}&bookId=${current.id}`
  ]);

  await toggle(modal(page), String(RETAGS[0].bookFileId));
  await toggle(modal(page), 'updateCovers');

  await modal(page).getByRole('button', { name: 'Retag', exact: true }).click();
  await expect(modal(page)).toHaveCount(0);
  await expect.poll(() => writes.length).toBe(1);

  expect(writes[0]).toStrictEqual({
    method: 'POST',
    path: '/command',
    body: {
      name: 'RetagFiles',
      authorId: current.authorId,
      updateCovers: true,
      embedMetadata: false,
      files: [RETAGS[1].bookFileId]
    }
  });
});
