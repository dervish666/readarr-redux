import { expect, openRoute, test } from './fixtures';
import { withReduxStore } from './reactTree';

// After stage 4b the redux store is empty: React Router 7 took the router slice with
// connected-react-router. App state and sidebar messages live in zustand
// (App/appStore, App/messagesStore); UI settings and system status in react-query;
// the captcha and oAuth inputs keep their own state. Stage 4c deletes the store.

test('redux: no slice is left', async ({ page }) => {
  await openRoute(page, '/authors');

  const slices = await withReduxStore<string[]>(page, `
    return Object.keys(store.getState()).sort();
  `);

  expect(slices).toStrictEqual([]);
});
