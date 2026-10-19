import { Page, Request } from '@playwright/test';
import { authorSlug } from './env';
import { api, expect, openRoute, test } from './fixtures';

// The mass editors: the author index footer (PUT and DELETE /author/editor) and the
// book editor footer on the author page (PUT and DELETE /book/editor). Every write is
// stubbed with page.route and its body compared field for field with
// toStrictEqual, so nothing reaches the server (safe on staging).

interface Author {
  id: number;
  authorName: string;
  titleSlug: string;
  monitored: boolean;
  monitorNewItems: string;
  tags: number[];
}

interface Book {
  id: number;
  title: string;
  monitored: boolean;
}

interface Write {
  method: string;
  path: string;
  body: unknown;
}

const json = { status: 200, contentType: 'application/json' };

// Not a real tag: served by a GET /tag route, so the tag input finds it.
const FIXTURE_TAG = { id: 990001, label: 'e2e-editor-tag' };

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

function footer(page: Page) {
  return page.locator('[class*="PageContentFooter"]');
}

function modal(page: Page) {
  return page.locator('[class*="ModalContent-modalContent"]');
}

async function pressToolbarAction(page: Page, label: string) {
  const button = page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: new RegExp(`^${label}$`) });

  if (await button.count()) {
    await button.click();
    return;
  }

  await page.locator('[class*="ToolbarMenuButton-menuButton"]', { hasText: 'More' }).click();
  await page.locator('[class*="MenuItem-menuItem"]', { hasText: new RegExp(`^${label}$`) }).click();
}

test('author editor: monitored, monitor new items, tags and delete send the AuthorEditorResource fields', async ({ page }) => {
  const authors = await api<Author[]>(page, '/author');
  expect(authors.length, 'the library needs an author').toBeGreaterThan(0);

  const writes = await stubWrites(page, ({ method, path, body }) => {
    if (method === 'PUT' && path === '/author/editor') {
      const { authorIds, applyTags, ...changes } = body as Record<string, unknown> & { authorIds: number[] };

      // Replace is the only mode the check uses.
      expect(applyTags === undefined || applyTags === 'replace').toBe(true);

      return authors.filter((a) => authorIds.includes(a.id)).map((a) => ({ ...a, ...changes }));
    }

    if (method === 'DELETE' && path === '/author/editor') {
      return {};
    }

    return undefined;
  });

  await page.route((url) => url.pathname.endsWith('/api/v1/tag'), async (route) => {
    if (route.request().method() !== 'GET') {
      return route.fallback();
    }

    const response = await route.fetch();
    const tags = await response.json();

    return route.fulfill({ response, json: [...tags, FIXTURE_TAG] });
  });

  await openRoute(page, '/authors');

  // The first poster on the page is the author the check edits (posters are
  // virtualized, so on a large library a given author may not be rendered).
  await pressToolbarAction(page, 'Author Editor');
  const poster = page.locator('[class*="AuthorIndexPoster-posterContainer"]').first();
  const authorName = await poster.getAttribute('title');
  const author = authors.find((a) => a.authorName === authorName) as Author;
  expect(author, `poster "${authorName}" is in GET /author`).toBeTruthy();

  await poster.locator('[class*="AuthorIndexPosterSelect-checkButton"]').click();
  await expect(footer(page).getByText('1 Author(s) Selected')).toBeVisible();

  const save = async (select: () => Promise<unknown>) => {
    const request = page.waitForRequest((r) => r.method() === 'PUT' && apiPath(r) === '/author/editor');
    await select();

    return (await request).postDataJSON();
  };

  // Monitored: the select saves at once, then returns to No Change.
  const monitoredSelect = footer(page).locator('select[name="monitored"]');
  const monitored = !author.monitored;

  expect(await save(() => monitoredSelect.selectOption(monitored ? 'monitored' : 'unmonitored')))
    .toStrictEqual({ authorIds: [author.id], monitored });
  await expect(monitoredSelect).toHaveValue('noChange');

  // Monitor new items: any value other than the author's.
  const monitorNewItems = author.monitorNewItems === 'new' ? 'none' : 'new';

  expect(await save(() => footer(page).locator('select[name="monitorNewItems"]').selectOption(monitorNewItems)))
    .toStrictEqual({ authorIds: [author.id], monitorNewItems });

  // Tags: replace the author's tags with the fixture tag.
  await footer(page).getByRole('button', { name: 'Set Readarr Tags' }).click();
  await expect(modal(page)).toBeVisible();

  const tagInput = modal(page).locator('[class*="TagInput"] input').first();
  await tagInput.fill(FIXTURE_TAG.label);
  await tagInput.press('Enter');
  await expect(modal(page).locator('[class*="TagInput"]', { hasText: FIXTURE_TAG.label }).first()).toBeVisible();

  // Apply Tags is an EnhancedSelectInput, not a native select.
  await modal(page).locator('[class*="EnhancedSelectInput-enhancedSelect"]').click();
  await page.locator('[class*="EnhancedSelectInput-options-"] [class*="EnhancedSelectInputOption-option"]')
    .getByText('Replace', { exact: true })
    .click();

  expect(await save(() => modal(page).getByRole('button', { name: 'Apply', exact: true }).click()))
    .toStrictEqual({ authorIds: [author.id], tags: [FIXTURE_TAG.id], applyTags: 'replace' });

  // Delete: the modal lists the author; files stay unless asked.
  await footer(page).getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(modal(page).getByText(author.authorName, { exact: true })).toBeVisible();

  const deleteRequest = page.waitForRequest((r) => r.method() === 'DELETE' && apiPath(r) === '/author/editor');
  await modal(page).getByRole('button', { name: 'Delete', exact: true }).click();
  expect((await deleteRequest).postDataJSON()).toStrictEqual({ authorIds: [author.id], deleteFiles: false });

  expect(writes.map((w) => `${w.method} ${w.path}`)).toEqual([
    'PUT /author/editor',
    'PUT /author/editor',
    'PUT /author/editor',
    'DELETE /author/editor'
  ]);
});

test('book editor: monitor, unmonitor and delete the selected books on the author page', async ({ page }) => {
  const authors = await api<Author[]>(page, '/author');
  const author = authorSlug ? authors.find((a) => a.titleSlug === authorSlug) : authors[0];
  expect(author, 'the library needs an author').toBeTruthy();

  const { id: authorId, titleSlug } = author as Author;
  const books = await api<Book[]>(page, `/book?authorId=${authorId}`);
  expect(books.length, 'the author needs two books').toBeGreaterThan(1);

  const selected = books.slice(0, 2);
  const bookIds = selected.map((b) => b.id).sort((a, b) => a - b);

  const writes = await stubWrites(page, ({ method, path, body }) => {
    if (method === 'PUT' && path === '/book/editor') {
      const { bookIds: ids, monitored } = body as { bookIds: number[]; monitored: boolean };

      return books.filter((b) => ids.includes(b.id)).map((b) => ({ ...b, monitored }));
    }

    if (method === 'DELETE' && path === '/book/editor') {
      return {};
    }

    return undefined;
  });

  await openRoute(page, `/author/${titleSlug}`);
  await pressToolbarAction(page, 'Book Editor');

  for (const book of selected) {
    const row = page.locator('tbody tr').filter({ has: page.getByRole('link', { name: book.title, exact: true }) }).first();
    await row.locator('[class*="TableSelectCell"] label').first().click();
  }

  await expect(footer(page).getByText('2 Book(s) Selected')).toBeVisible();

  const monitoredSelect = footer(page).locator('select[name="monitored"]');

  for (const monitored of [true, false]) {
    const request = page.waitForRequest((r) => r.method() === 'PUT' && apiPath(r) === '/book/editor');
    await monitoredSelect.selectOption(monitored ? 'monitored' : 'unmonitored');
    expect((await request).postDataJSON()).toStrictEqual({ bookIds, monitored });
    await expect(monitoredSelect).toHaveValue('noChange');
  }

  await footer(page).getByRole('button', { name: 'Delete', exact: true }).click();

  for (const book of selected) {
    await expect(modal(page).locator('li', { hasText: book.title }).first()).toBeVisible();
  }

  const deleteRequest = page.waitForRequest((r) => r.method() === 'DELETE' && apiPath(r) === '/book/editor');
  await modal(page).getByRole('button', { name: 'Delete', exact: true }).click();
  expect((await deleteRequest).postDataJSON()).toStrictEqual({ bookIds, deleteFiles: false, addImportListExclusion: true });

  expect(writes.map((w) => `${w.method} ${w.path}`)).toEqual([
    'PUT /book/editor',
    'PUT /book/editor',
    'DELETE /book/editor'
  ]);
});
