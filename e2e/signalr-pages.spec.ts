import { Page } from '@playwright/test';
import { api, expect, openRoute, test } from './fixtures';

// The author and book pages follow SignalR without a reload. Each test changes the
// monitored flag through page.request, outside the page and react-query, so the only
// way the open page can show the new value is the author or book SignalR message.
// Both tests put the original value back, so they are safe on the staging copy.

interface Author {
  id: number;
  titleSlug: string;
  monitored: boolean;
}

interface Book {
  id: number;
  titleSlug: string;
  monitored: boolean;
}

// A marker on window survives only while the page is not reloaded.
async function markPage(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { e2eNoReload: boolean }).e2eNoReload = true;
  });
}

async function expectNoReload(page: Page) {
  expect(
    await page.evaluate(() => (window as unknown as { e2eNoReload?: boolean }).e2eNoReload),
    'the page reloaded, so the update did not come over SignalR'
  ).toBe(true);
}

test('author page follows an author change made elsewhere', async ({ page }) => {
  const [first] = await api<Author[]>(page, '/author');
  expect(first, 'the library has no authors').toBeTruthy();

  const author = await api<Record<string, unknown> & Author>(page, `/author/${first.id}`);

  await openRoute(page, `/author/${author.titleSlug}`);
  await markPage(page);

  const chip = page.locator('[class*="AuthorDetails-header"] button[aria-pressed]');
  await expect(chip).toHaveAttribute('aria-pressed', String(author.monitored));

  try {
    await api(page, `/author/${author.id}`, { method: 'PUT', data: { ...author, monitored: !author.monitored } });
    await expect(chip).toHaveAttribute('aria-pressed', String(!author.monitored), { timeout: 15_000 });
  } finally {
    await api(page, `/author/${author.id}`, { method: 'PUT', data: author });
  }

  await expect(chip).toHaveAttribute('aria-pressed', String(author.monitored), { timeout: 15_000 });
  await expectNoReload(page);
});

test('book page follows a book change made elsewhere', async ({ page }) => {
  const [author] = await api<Author[]>(page, '/author');
  expect(author, 'the library has no authors').toBeTruthy();

  const [book] = await api<Book[]>(page, `/book?authorId=${author.id}`);
  expect(book, 'the first author has no books').toBeTruthy();

  await openRoute(page, `/book/${book.titleSlug}`);
  await markPage(page);

  const toggle = page.locator('[class*="BookDetails-header"] button[aria-pressed]').first();
  await expect(toggle).toHaveAttribute('aria-pressed', String(book.monitored));

  try {
    await api(page, '/book/monitor', { method: 'PUT', data: { bookIds: [book.id], monitored: !book.monitored } });
    await expect(toggle).toHaveAttribute('aria-pressed', String(!book.monitored), { timeout: 15_000 });
  } finally {
    await api(page, '/book/monitor', { method: 'PUT', data: { bookIds: [book.id], monitored: book.monitored } });
  }

  await expect(toggle).toHaveAttribute('aria-pressed', String(book.monitored), { timeout: 15_000 });
  await expectNoReload(page);
});
