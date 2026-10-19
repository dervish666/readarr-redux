import { api, expect, openRoute, test } from './fixtures';
import { holdCommandRefetches, withQueryClient } from './reactTree';

// Proves the SignalR listener feeds react-query, not only redux: the author message
// writes the author into the ['/author'] list (emptied first, and with no observer on
// the author details page to refetch it), and command progress is written into the
// ['/command'] list. The POST response only ever says "queued", so a "completed"
// entry can only have come from SignalR.

interface Author {
  id: number;
  titleSlug: string;
}

interface QueryState {
  isInvalidated: boolean;
}

interface Command {
  id: number;
  status: string;
}

test('SignalR messages update react-query caches', async ({ page }) => {
  const [author] = await api<Author[]>(page, '/author');
  expect(author, 'the library has no authors').toBeTruthy();

  await openRoute(page, `/author/${author.titleSlug}`);

  // A system/task message also refetches /command; hold that so the "completed"
  // below can only come from the command messages.
  const release = await holdCommandRefetches(page);

  await withQueryClient(page, `
    client.setQueryData(['/author'], []);
  `);

  const before = await withQueryClient<QueryState>(page, `
    return client.getQueryState(['/author']);
  `);
  expect(before.isInvalidated).toBe(false);

  const commandPost = page.waitForResponse(
    (r) => r.url().includes('/api/v1/command') && r.request().method() === 'POST'
  );
  await page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: 'Refresh & Scan' }).click();
  const posted = (await (await commandPost).json()) as Command;
  // The POST can answer after the command has started; either way it is not complete yet,
  // so reaching 'completed' below can only come from SignalR.
  expect(['queued', 'started']).toContain(posted.status);

  // The refresh sends command progress and an author update over SignalR.
  await expect.poll(
    () => withQueryClient<boolean>(page, `
      return (client.getQueryData(['/author']) || []).some((a) => a.id === ${author.id});
    `),
    { timeout: 60_000, message: 'SignalR never wrote the author into the /author list' }
  ).toBe(true);

  await expect.poll(
    () => withQueryClient<string | undefined>(page, `
      return (client.getQueryData(['/command']) || []).find((c) => c.id === ${posted.id})?.status;
    `),
    { timeout: 60_000, message: 'SignalR never wrote the command progress into react-query' }
  ).toBe('completed');

  release();
});
