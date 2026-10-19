import { expect, openRoute, test } from './fixtures';
import { withReduxStore } from './reactTree';

// After stage 4a the redux store holds only the router slice, which the React Router 7
// move drops. App state and sidebar messages live in zustand (App/appStore,
// App/messagesStore); UI settings and system status in react-query; the captcha and
// oAuth inputs keep their own state.

test('redux: only the router slice is left', async ({ page }) => {
  await openRoute(page, '/authors');

  const slices = await withReduxStore<string[]>(page, `
    return Object.keys(store.getState()).sort();
  `);

  expect(slices).toStrictEqual(['router']);
});
