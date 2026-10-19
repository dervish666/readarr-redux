import { expect, openRoute, test } from './fixtures';
import { withQueryClient } from './reactTree';

// The app loads authors, tags, custom filters and profiles before any page renders,
// and shows the error page if one of those first loads fails. A refetch that fails
// after a good load (SignalR invalidates these lists all the time, and a backend
// restart makes them fail for a while) must keep the page and its data instead.
// Read-only: the failing responses are stubbed.

// /system/status and /config/ui gate the shell too (stage 4: they left redux).
for (const path of ['/author', '/tag', '/system/status', '/config/ui']) {
  test(`a failed ${path} refetch after a good load keeps the page`, async ({ page, problems }) => {
    await openRoute(page, '/authors');
    await expect(page.locator('[class*="ErrorPage-page"]')).toHaveCount(0);

    await page.route((url) => url.pathname.endsWith(`/api/v1${path}`), (route) => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"message":"e2e"}'
    }));

    await withQueryClient(page, `client.invalidateQueries({ queryKey: ['${path}'], exact: true });`);

    // react-query retries three times before the query settles in error.
    await expect.poll(() => withQueryClient<string | undefined>(page, `
      return client.getQueryState(['${path}'])?.status;
    `), { timeout: 30_000 }).toBe('error');

    await page.waitForTimeout(500);
    await expect(page.locator('[class*="ErrorPage-page"]')).toHaveCount(0);
    await expect(page.locator('[class*="PageContentBody-contentBody"]').first()).toBeVisible();

    // The stubbed 500s are the point of the test.
    const unexpected = problems.filter((p) => !p.text.includes(`/api/v1${path}`) && !p.text.includes('status of 500'));
    problems.splice(0, problems.length, ...unexpected);
  });
}
