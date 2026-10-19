import { expect, openRoute, test, waitForPage } from './fixtures';
import { withQueryClient, withReduxStore } from './reactTree';

// Stage 4c deleted redux. App state and sidebar messages live in zustand
// (App/appStore, App/messagesStore); UI settings and system status in react-query;
// the captcha and oAuth inputs keep their own state; the router is React Router 7.
// The tree walk that used to find the redux Provider must now come up empty, while
// the same walk still finds the QueryClientProvider, so an empty result is not a
// broken walk.

test('redux: no store is left in the React tree', async ({ page }) => {
  await openRoute(page, '/authors');
  await waitForPage(page);

  expect(await withQueryClient<boolean>(page, 'return !!client.getQueryCache();')).toBe(true);

  await expect(withReduxStore(page, 'return store;')).rejects.toThrow('No provider with a store prop');
});
