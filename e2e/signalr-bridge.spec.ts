import { Page } from '@playwright/test';
import { api, expect, openRoute, test } from './fixtures';

// Proves the SignalR listener feeds react-query, not only redux: a cached query
// under /command and /author goes stale when the matching SignalR message arrives.
// No page reads through react-query yet, so the test seeds the cache itself.

interface Author {
  id: number;
  titleSlug: string;
}

interface QueryState {
  isInvalidated: boolean;
}

// Finds the QueryClient by walking React's fiber tree from #root to the
// QueryClientProvider. Test-only, so the app ships no debug global.
async function withQueryClient<T>(page: Page, script: string): Promise<T> {
  return page.evaluate((body) => {
    const root = document.getElementById('root') as unknown as Record<string, unknown>;
    const containerKey = Object.keys(root).find((k) => k.startsWith('__reactContainer$'));

    if (!containerKey) {
      throw new Error('React root not found on #root');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stack: any[] = [root[containerKey]];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = null;

    while (stack.length && !client) {
      const fiber = stack.pop();

      if (!fiber) {
        continue;
      }

      if (fiber.memoizedProps?.client?.getQueryCache) {
        client = fiber.memoizedProps.client;
        break;
      }

      stack.push(fiber.sibling, fiber.child);
    }

    if (!client) {
      throw new Error('QueryClientProvider not found in the React tree');
    }

    // eslint-disable-next-line no-new-func
    return new Function('client', body)(client);
  }, script) as Promise<T>;
}

test('SignalR messages invalidate react-query caches', async ({ page }) => {
  const [author] = await api<Author[]>(page, '/author');
  expect(author, 'the library has no authors').toBeTruthy();

  await openRoute(page, `/author/${author.titleSlug}`);

  await withQueryClient(page, `
    client.setQueryData(['/command'], []);
    client.setQueryData(['/author'], []);
  `);

  const before = await withQueryClient<QueryState[]>(page, `
    return [client.getQueryState(['/command']), client.getQueryState(['/author'])];
  `);
  expect(before.map((s) => s.isInvalidated)).toEqual([false, false]);

  const commandPost = page.waitForResponse(
    (r) => r.url().includes('/api/v1/command') && r.request().method() === 'POST'
  );
  await page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: 'Refresh & Scan' }).click();
  await commandPost;

  // The refresh sends command progress and an author update over SignalR.
  await expect.poll(
    () => withQueryClient<boolean[]>(page, `
      return [['/command'], ['/author']].map((key) => client.getQueryState(key).isInvalidated);
    `),
    { timeout: 60_000, message: 'react-query caches never went stale from SignalR' }
  ).toEqual([true, true]);
});
