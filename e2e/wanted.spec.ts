import { Page, Request } from '@playwright/test';
import { api, expect, openRoute, test } from './fixtures';

// Wanted > Missing against the library's own books, with every write stubbed: the
// search commands and the monitor toggle are answered here and never reach the server.
// The checks follow whichever filter has books (the local library's author and books are
// unmonitored, so its 126 missing books are under Unmonitored).

interface Book {
  id: number;
  title: string;
  monitored: boolean;
}

interface Paged {
  page: number;
  totalRecords: number;
  records: Book[];
}

interface Write {
  method: string;
  path: string;
  body: unknown;
}

const json = { status: 200, contentType: 'application/json' };

function apiPath(request: Request) {
  return new URL(request.url()).pathname.replace(/^.*\/api\/v1/, '');
}

// Records and answers every non-GET API request; anything `answer` doesn't expect gets a
// 500, which fails the test without touching the server.
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

let nextCommandId = 990100;

// A queued command as POST /command answers it.
function fakeCommand(body: { name: string }) {
  const now = new Date().toISOString();

  nextCommandId += 1;

  return {
    id: nextCommandId,
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

// Monitored when that filter has missing books, otherwise Unmonitored.
async function pickFilter(page: Page) {
  const monitored = await api<Paged>(page, '/wanted/missing?monitored=true&pageSize=1');

  return monitored.totalRecords > 0 ?
    { label: 'Monitored', monitored: true } :
    { label: 'Unmonitored', monitored: false };
}

async function openMissing(page: Page, filter: { label: string; monitored: boolean }) {
  await openRoute(page, '/wanted/missing');

  if (!filter.monitored) {
    const response = page.waitForResponse(
      (r) => r.url().includes('/api/v1/wanted/missing') && r.url().includes('monitored=false')
    );

    await page.locator('[class*="ToolbarMenuButton-menuButton"]', { hasText: 'Filter' }).click();
    await page.locator('[class*="MenuItem-menuItem"]', { hasText: 'Unmonitored' }).click();
    await response;
  }
}

function rows(page: Page) {
  return page.locator('tbody tr');
}

function toolbarButton(page: Page, label: string | RegExp) {
  return page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: label });
}

async function selectRow(page: Page, index: number) {
  await rows(page).nth(index).locator('input[type="checkbox"]').locator('..').click();
}

test('wanted missing: rows, sort and paging', async ({ page }) => {
  const filter = await pickFilter(page);
  const query = `monitored=${filter.monitored}&includeAuthor=true&pageSize=20`;
  const firstPage = await api<Paged>(page, `/wanted/missing?${query}&page=1&sortKey=releaseDate&sortDirection=descending`);

  expect(firstPage.totalRecords, 'the library has no missing books').toBeGreaterThan(0);

  await openMissing(page, filter);

  await expect(page.getByRole('heading', { name: /Wanted · Missing/ })).toBeVisible();
  await expect(rows(page)).toHaveCount(Math.min(20, firstPage.totalRecords));
  await expect(rows(page).first()).toContainText(firstPage.records[0].title);
  await expect(page.locator('[class*="TablePager-records-"]')).toHaveText(`Total records: ${firstPage.totalRecords}`);

  // Sort by book title: the request carries the sort and the first row follows it.
  const sorted = page.waitForResponse(
    (r) => r.url().includes('/api/v1/wanted/missing') && r.url().includes('sortKey=books.title')
  );
  await page.locator('thead').getByText('Book', { exact: true }).click();

  const sortedPage = (await (await sorted).json()) as Paged;
  const bySortedTitle = await api<Paged>(
    page,
    `/wanted/missing?${query}&page=1&sortKey=books.title&sortDirection=${new URL((await sorted).url()).searchParams.get('sortDirection')}`
  );

  expect(sortedPage.records.map((b) => b.id)).toEqual(bySortedTitle.records.map((b) => b.id));
  await expect(rows(page).first()).toContainText(bySortedTitle.records[0].title);

  if (firstPage.totalRecords <= 20) {
    return;
  }

  // Next page asks for page 2 and shows its rows.
  const nextPage = page.waitForResponse(
    (r) => r.url().includes('/api/v1/wanted/missing') && r.url().includes('page=2')
  );
  await page.locator('[class*="TablePager-controls"] button').nth(3).click();

  const second = (await (await nextPage).json()) as Paged;

  expect(second.page).toBe(2);
  await expect(page.locator('[class*="TablePager-pageNumber"]')).toContainText('2 /');
  await expect(rows(page).first()).toContainText(second.records[0].title);
});

test('wanted missing: search all and search selected post their commands', async ({ page }) => {
  const filter = await pickFilter(page);
  const writes = await stubWrites(page, ({ method, path, body }) => {
    return method === 'POST' && path === '/command' ? fakeCommand(body as { name: string }) : undefined;
  });

  await openMissing(page, filter);
  await expect(rows(page).first()).toBeVisible();

  // Search selected posts BookSearch with the ids of the ticked rows.
  const records = (await api<Paged>(
    page,
    `/wanted/missing?monitored=${filter.monitored}&pageSize=20&page=1&sortKey=releaseDate&sortDirection=descending`
  )).records;

  await selectRow(page, 0);
  await selectRow(page, 1);
  await toolbarButton(page, /^Search Selected$/).click();

  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toEqual({
    method: 'POST',
    path: '/command',
    // Ids go in the order the selection holds them (ascending), as before.
    body: { name: 'BookSearch', bookIds: [records[0].id, records[1].id].sort((a, b) => a - b) }
  });

  // Search all asks first, then posts MissingBookSearch. It goes second: a queued
  // MissingBookSearch disables Search Selected, as it did before.
  await toolbarButton(page, /^Search All$/).click();

  const confirm = page.locator('[class*="ModalContent-modalContent"]');
  await expect(confirm).toContainText('missing books');
  await confirm.getByRole('button', { name: 'Search', exact: true }).click();

  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]).toEqual({ method: 'POST', path: '/command', body: { name: 'MissingBookSearch' } });
});

test('wanted missing: (un)monitor selected puts /book/monitor', async ({ page }) => {
  const filter = await pickFilter(page);
  const records = (await api<Paged>(
    page,
    `/wanted/missing?monitored=${filter.monitored}&pageSize=20&page=1&sortKey=releaseDate&sortDirection=descending`
  )).records;

  const writes = await stubWrites(page, ({ method, path, body }) => {
    if (method === 'PUT' && path === '/book/monitor') {
      const { bookIds, monitored } = body as { bookIds: number[]; monitored: boolean };

      return records.filter((b) => bookIds.includes(b.id)).map((b) => ({ ...b, monitored }));
    }

    return undefined;
  });

  await openMissing(page, filter);
  await expect(rows(page).first()).toBeVisible();

  await selectRow(page, 0);
  await selectRow(page, 2);

  // Showing monitored books offers Unmonitor Selected, and the other way round.
  await toolbarButton(page, filter.monitored ? /^Unmonitor Selected$/ : /^Monitor Selected$/).click();

  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0]).toEqual({
    method: 'PUT',
    path: '/book/monitor',
    body: { bookIds: [records[0].id, records[2].id].sort((a, b) => a - b), monitored: !filter.monitored }
  });
});
