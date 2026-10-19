import { api, expect, openRoute, test } from './fixtures';
import { withQueryClient } from './reactTree';

// A failed series monitor toggle must put every book back to its own value. The
// series toggle sends all of the series' books, some of which may already be in the
// target state, so "flip them all back" corrupts the cache. The check sets a series
// to a mixed state through page.request, fails the page's PUT /book/monitor with a
// stubbed 500, then puts the books back as they were. Safe on the staging copy.

interface Author {
  id: number;
  titleSlug: string;
  monitored: boolean;
}

interface Book {
  id: number;
  monitored: boolean;
}

interface Series {
  title: string;
  links: { bookId: number }[];
}

test('a failed series monitor toggle restores each book', async ({ page, problems }) => {
  const [listed] = await api<Author[]>(page, '/author');
  expect(listed, 'the library has no authors').toBeTruthy();

  // Series toggles are disabled while the author is unmonitored, so monitor it for
  // the test and put it back after.
  const author = await api<Record<string, unknown> & Author>(page, `/author/${listed.id}`);

  const books = await api<Book[]>(page, `/book?authorId=${author.id}`);
  const series = (await api<Series[]>(page, `/series?authorId=${author.id}`))
    .find((s) => s.links.length >= 3 && s.links.every((l) => books.some((b) => b.id === l.bookId)));
  expect(series, 'the author needs a series of three or more books').toBeTruthy();

  const seriesBooks = series!.links.map((l) => books.find((b) => b.id === l.bookId)!);
  const original = new Map(seriesBooks.map((b) => [b.id, b.monitored]));

  // Mixed: the first book monitored, the rest not. The series then reads as
  // unmonitored and its toggle sends monitored: true for all of them.
  const [first, ...rest] = seriesBooks.map((b) => b.id);
  if (!author.monitored) {
    await api(page, `/author/${author.id}`, { method: 'PUT', data: { ...author, monitored: true } });
  }

  await api(page, '/book/monitor', { method: 'PUT', data: { bookIds: [first], monitored: true } });
  await api(page, '/book/monitor', { method: 'PUT', data: { bookIds: rest, monitored: false } });

  try {
    await page.route((url) => url.pathname.endsWith('/api/v1/book/monitor'), (route) => (
      route.request().method() === 'PUT' ?
        route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"e2e"}' }) :
        route.fallback()
    ));

    await openRoute(page, `/author/${author.titleSlug}`);
    await page.getByRole('tab', { name: /^Series/ }).click();

    const panel = page.locator('[class*="AuthorDetailsSeries-bookType"]')
      .filter({ has: page.locator('[class*="AuthorDetailsSeries-bookTypeLabel"]', { hasText: new RegExp(`^${series!.title}$`) }) })
      .first();

    const failed = page.waitForResponse((r) => r.url().includes('/api/v1/book/monitor') && r.status() === 500);
    await panel.locator('button').first().click();
    await failed;

    const cached = () => withQueryClient<Record<number, boolean>>(page, `
      const ids = ${JSON.stringify([first, ...rest])};
      const out = {};
      client.getQueriesData({ queryKey: ['/book'] }).forEach(([, list]) => {
        (Array.isArray(list) ? list : []).forEach((b) => {
          if (ids.includes(b.id) && !(b.id in out)) out[b.id] = b.monitored;
        });
      });
      return out;
    `);

    const expected = Object.fromEntries([[first, true], ...rest.map((id) => [id, false])]);
    await expect.poll(cached, { message: 'the cache did not go back to each book\'s own value' }).toEqual(expected);
  } finally {
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    for (const monitored of [true, false]) {
      const ids = [...original].filter(([, m]) => m === monitored).map(([id]) => id);

      if (ids.length) {
        await api(page, '/book/monitor', { method: 'PUT', data: { bookIds: ids, monitored } });
      }
    }

    if (!author.monitored) {
      await api(page, `/author/${author.id}`, { method: 'PUT', data: author });
    }
  }

  // The stubbed 500 is the point of the test, not a problem.
  const unexpected = problems.filter((p) => !p.text.includes('/api/v1/book/monitor') && !p.text.includes('status of 500'));
  problems.splice(0, problems.length, ...unexpected);
});
