import { expect, openRoute, test } from './fixtures';
import { withReduxStore } from './reactTree';

// After stage 3 the redux store holds only what stage 4 removes: app state, the
// captcha and oAuth form inputs, the UI settings feed (RelativeDateCellConnector) and
// system status (page shell). The library data (authors, books, files, tags, root
// folders, profiles, custom filters, commands) lives in react-query only.

test('redux: only the stage 4 slices are left', async ({ page }) => {
  await openRoute(page, '/authors');

  const slices = await withReduxStore<{ top: string[]; settings: string[]; system: string[] }>(page, `
    const state = store.getState();
    return {
      top: Object.keys(state).sort(),
      settings: Object.keys(state.settings).sort(),
      system: Object.keys(state.system).sort()
    };
  `);

  expect(slices).toStrictEqual({
    top: ['app', 'captcha', 'oAuth', 'router', 'settings', 'system'],
    settings: ['ui'],
    system: ['status']
  });
});
