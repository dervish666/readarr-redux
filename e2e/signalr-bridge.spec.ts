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
  // A refresh of a big author against a slow metadata source can run for minutes.
  test.setTimeout(420_000);

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

  // An author message, made on purpose. A Refresh & Scan only sends one when the metadata
  // changed (RefreshEntityServiceBase publishes AuthorUpdatedEvent only if updated), so on an
  // unchanged library it never comes and this check used to fail on every commit. A PUT of the
  // unchanged author always broadcasts. It goes through page.request, outside react-query,
  // so only SignalR can put the author back into the emptied list.
  const fullAuthor = await api<Record<string, unknown>>(page, `/author/${author.id}`);
  await api(page, `/author/${author.id}`, { method: 'PUT', data: fullAuthor });

  await expect.poll(
    () => withQueryClient<boolean>(page, `
      return (client.getQueryData(['/author']) || []).some((a) => a.id === ${author.id});
    `),
    { timeout: 30_000, message: 'SignalR never wrote the author into the /author list' }
  ).toBe(true);

  const commandPost = page.waitForResponse(
    (r) => r.url().includes('/api/v1/command') && r.request().method() === 'POST'
  );
  await page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: 'Refresh & Scan' }).click();
  const posted = (await (await commandPost).json()) as Command;
  // The POST can answer after the command has started; either way it is not complete yet,
  // so reaching 'completed' below can only come from SignalR.
  expect(['queued', 'started']).toContain(posted.status);

  await expect.poll(
    () => withQueryClient<string | undefined>(page, `
      return (client.getQueryData(['/command']) || []).find((c) => c.id === ${posted.id})?.status;
    `),
    { timeout: 360_000, message: 'SignalR never wrote the command progress into react-query' }
  ).toBe('completed');

  release();
});
