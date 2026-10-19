import { Locator, Page, Request } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { api, expect, openRoute, test, waitForPage } from './fixtures';
import { apiKey, baseUrl } from './env';
import { withQueryClient, withReduxStore } from './reactTree';

// Tags, root folders and custom filters moved to react-query, but author, book,
// calendar and settings pages still read state.tags, state.settings.rootFolders and
// state.customFilters from redux. These checks change things through the converted UI
// and then look on both sides. SignalR tag/rootfolder messages also refresh the feeds,
// so the UI checks mute them (muteSignalR) to prove the mutation itself does it; the
// SignalR path has its own check.

interface Tag {
  id: number;
  label: string;
}

interface RootFolder {
  id: number;
  name: string;
  path: string;
}

interface CustomFilter {
  id: number;
  label: string;
}

const PREFIX = 'e2e-g5';

// Adding a root folder writes to the server's library config, so it only runs against
// a local backend (or a path the staging run names explicitly). Elsewhere the check
// stops at the file browser listing the server's folders.
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(baseUrl);
const LOCAL_FOLDER_PARENT = path.join(os.tmpdir(), 'readarr-e2e');
const rootFolderTestPath =
  process.env.READARR_ROOTFOLDER_TEST_PATH ??
  (isLocal ? path.join(LOCAL_FOLDER_PARENT, 'rootfolder-test') : '');

function uniqueLabel(kind: string) {
  return `${PREFIX}-${kind}-${Date.now()}`;
}

function modal(page: Page, heading: string | RegExp) {
  return page.locator('[class*="ModalContent-modalContent"]').filter({
    has: page.locator('[class*="ModalHeader-modalHeader"]', { hasText: heading })
  });
}

function formGroup(scope: Locator, label: string) {
  return scope.locator('[class*="FormGroup-group"]').filter({
    has: scope.page().locator('label', { hasText: label })
  });
}

// Drops SignalR messages with these names before the page sees them. Must be set
// before the page loads.
async function muteSignalR(page: Page, names: string[]) {
  await page.routeWebSocket(/\/signalr\/messages/, (ws) => {
    const server = ws.connectToServer();

    ws.onMessage((message) => server.send(message));

    server.onMessage((message) => {
      if (typeof message !== 'string') {
        ws.send(message);
        return;
      }

      const kept = message.split('\x1e').filter((record) => {
        return !names.some((name) => record.includes(`"name":"${name}"`));
      });

      if (kept.some((record) => record.length)) {
        ws.send(kept.join('\x1e'));
      }
    });
  });
}

// Moves within the app without a reload, so redux and react-query keep their state.
async function clientNavigate(page: Page, route: string) {
  await page.evaluate((path) => {
    const urlBase = (window as unknown as { Readarr: { urlBase: string } }).Readarr.urlBase;
    window.history.pushState({}, '', `${urlBase}${path}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, route);
}

function reduxTagLabels(page: Page) {
  return withReduxStore<string[]>(page, `
    return store.getState().tags.items.map((tag) => tag.label);
  `);
}

function queryTagLabels(page: Page) {
  return withQueryClient<string[] | null>(page, `
    const tags = client.getQueryData(['/tag']);
    return tags ? tags.map((tag) => tag.label) : null;
  `);
}

function addAuthorRootFolder(page: Page) {
  return withReduxStore<string | undefined>(page, `
    return store.getState().search.authorDefaults.rootFolderPath;
  `);
}

async function deleteLeftovers(page: Page) {
  const tags = await api<Tag[]>(page, '/tag');

  for (const tag of tags.filter((t) => t.label.startsWith(PREFIX))) {
    await page.request.fetch(`${baseUrl}/api/v1/tag/${tag.id}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': apiKey }
    });
  }

  const customFilters = await api<CustomFilter[]>(page, '/customFilter');

  for (const filter of customFilters.filter((f) => f.label.startsWith(PREFIX))) {
    await page.request.fetch(`${baseUrl}/api/v1/customFilter/${filter.id}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': apiKey }
    });
  }

  if (rootFolderTestPath) {
    const rootFolders = await api<RootFolder[]>(page, '/rootFolder');

    for (const rootFolder of rootFolders.filter((r) => r.path.startsWith(rootFolderTestPath))) {
      await page.request.fetch(`${baseUrl}/api/v1/rootFolder/${rootFolder.id}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': apiKey }
      });
    }
  }
}

test.afterEach(async ({ page }) => {
  await deleteLeftovers(page);

  if (test.info().attachments.some((a) => a.name === 'made folder')) {
    fs.rmSync(LOCAL_FOLDER_PARENT, { recursive: true, force: true });
  }
});

test('tags: a tag made in a tag input reaches Settings > Tags and the redux feed, then deletes', async ({ page }) => {
  const label = uniqueLabel('tag');
  const rootFolderWrites: string[] = [];

  page.on('request', (request: Request) => {
    if (request.method() !== 'GET' && request.url().includes('/api/v1/rootFolder')) {
      rootFolderWrites.push(`${request.method()} ${request.url()}`);
    }
  });

  await muteSignalR(page, ['tag']);
  await openRoute(page, '/settings/mediamanagement');

  // The tag input in the add root folder modal creates tags as you type them.
  await page.getByRole('button', { name: 'Add Root Folder' }).click();
  const addModal = modal(page, 'Add Root Folder');
  await expect(addModal).toBeVisible();

  const tagGroup = formGroup(addModal, 'Default Readarr Tags');
  const created = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/tag') && response.request().method() === 'POST';
  });
  await tagGroup.locator('input').fill(label);
  await tagGroup.locator('input').press('Enter');
  expect((await created).ok()).toBeTruthy();
  await expect(tagGroup.getByText(label)).toBeVisible();

  // Nothing about the root folder itself is saved.
  await addModal.getByRole('button', { name: 'Cancel' }).click();
  await expect(addModal).toHaveCount(0);
  expect(rootFolderWrites).toEqual([]);

  // Both sides have it, with the SignalR tag message muted.
  await expect.poll(() => queryTagLabels(page)).toContain(label);
  await expect.poll(() => reduxTagLabels(page)).toContain(label);

  // A redux-fed page sees it without a reload: the author index filter builder's tag
  // value suggestions come from state.tags.
  await clientNavigate(page, '/authors');
  await page.locator('[class*="ToolbarMenuButton-menuButton"]', { hasText: 'Filter' }).click();
  await page.locator('[class*="MenuItem-menuItem"]', { hasText: 'Custom Filters' }).click();
  // With no saved author filters this opens the builder; with some (a real library
  // usually has them) it opens the list first, and Add Custom Filter opens the builder.
  const builder = modal(page, /^Custom Filter$/);
  const filterList = modal(page, 'Custom Filters');
  await expect(builder.or(filterList)).toBeVisible();

  if (await filterList.isVisible()) {
    await filterList.getByRole('button', { name: 'Add Custom Filter' }).click();
  }

  await expect(builder).toBeVisible();
  await builder.locator('select').first().selectOption({ label: 'Tags' });
  await builder.locator('[class*="TagInput"] input').last().fill(label.slice(0, 10));
  await expect(page.getByRole('option', { name: label })).toBeVisible();
  // Cancel goes back to the custom filter list; close that too, nothing saved.
  await builder.getByRole('button', { name: 'Cancel' }).click();
  await modal(page, 'Custom Filters').getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('[class*="ModalContent-modalContent"]')).toHaveCount(0);

  // Settings > Tags lists it (react-query) and deletes it.
  await clientNavigate(page, '/settings/tags');
  await expect(page.getByRole('heading', { name: /Settings · Tags/ })).toBeVisible();
  const card = page.getByRole('button', { name: `Tag Details - ${label}` });
  await expect(card).toBeVisible();
  await expect(page.locator('[class*="SettingsCard-card"]', { hasText: label })).toContainText('No links');

  await card.click();
  const details = modal(page, `Tag Details - ${label}`);
  await expect(details).toContainText('Tag is not used and can be deleted');
  await details.getByRole('button', { name: 'Delete' }).click();

  const confirm = modal(page, 'Delete Tag');
  await confirm.getByRole('button', { name: 'Delete' }).click();

  await expect(card).toHaveCount(0);
  await expect.poll(() => reduxTagLabels(page)).not.toContain(label);
  expect((await api<Tag[]>(page, '/tag')).map((t) => t.label)).not.toContain(label);
});

test('SignalR tag messages refresh react-query and the redux tags feed', async ({ page }) => {
  const label = uniqueLabel('signalr');

  await openRoute(page, '/settings/tags');
  // The page has loaded the tag list into react-query; the API write below is invisible
  // to the page except through SignalR.
  await expect.poll(() => queryTagLabels(page)).not.toBeNull();

  const tag = await api<Tag>(page, '/tag', { method: 'POST', data: { label } });

  await expect.poll(() => reduxTagLabels(page)).toContain(label);
  await expect.poll(() => queryTagLabels(page)).toContain(label);
  await expect(page.getByRole('button', { name: `Tag Details - ${label}` })).toBeVisible();

  await page.request.fetch(`${baseUrl}/api/v1/tag/${tag.id}`, {
    method: 'DELETE',
    headers: { 'X-Api-Key': apiKey }
  });

  await expect.poll(() => reduxTagLabels(page)).not.toContain(label);
  await expect(page.getByRole('button', { name: `Tag Details - ${label}` })).toHaveCount(0);
});

test('root folders: pick a folder in the file browser, add it, see free space, delete it', async ({ page }) => {
  const name = uniqueLabel('rootfolder');
  const rootFolderWrites: string[] = [];

  page.on('request', (request: Request) => {
    if (request.method() !== 'GET' && request.url().includes('/api/v1/rootFolder')) {
      rootFolderWrites.push(request.method());
    }
  });

  const madeFolder = isLocal && process.env.READARR_ROOTFOLDER_TEST_PATH === undefined;

  if (madeFolder) {
    fs.mkdirSync(rootFolderTestPath, { recursive: true });
    test.info().attach('made folder', { body: rootFolderTestPath });
  }

  await muteSignalR(page, ['rootfolder']);
  await openRoute(page, '/settings/mediamanagement');
  const rootFoldersBefore = await api<RootFolder[]>(page, '/rootFolder');

  await page.getByRole('button', { name: 'Add Root Folder' }).click();
  const addModal = modal(page, 'Add Root Folder');
  await expect(addModal).toBeVisible();

  // The file browser lists the server's own folders from /filesystem.
  await addModal.getByRole('button', { name: 'File Browser' }).click();
  const browser = modal(page, 'File Browser');
  await expect(browser).toBeVisible();
  const rows = browser.locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(0);

  if (!rootFolderTestPath) {
    // Remote target without a named path: look, then leave without writing.
    await browser.getByRole('button', { name: 'Cancel' }).click();
    await addModal.getByRole('button', { name: 'Cancel' }).click();
    expect(rootFolderWrites).toEqual([]);
    return;
  }

  const parent = rootFolderTestPath.replace(/[^/\\]+[/\\]?$/, '');
  const folderName = rootFolderTestPath.replace(/[/\\]$/, '').split(/[/\\]/).pop() as string;

  await browser.locator('input').first().fill(parent);
  const folderRow = rows.filter({ hasText: new RegExp(`^\\s*${folderName}\\s*$`) });
  await expect(folderRow).toBeVisible();
  await folderRow.click();
  await expect(browser.locator('input').first()).toHaveValue(new RegExp(`${folderName}[/\\\\]?$`));
  await browser.getByRole('button', { name: 'Ok' }).click();
  await expect(browser).toHaveCount(0);

  await expect(formGroup(addModal, 'Path').locator('input')).toHaveValue(new RegExp(`${folderName}[/\\\\]?$`));
  await formGroup(addModal, 'Name').locator('input').fill(name);
  await addModal.getByRole('button', { name: 'Save' }).click();
  await expect(addModal).toHaveCount(0);
  expect(rootFolderWrites).toEqual(['POST']);

  // Listed with the server's free space for it, not a blank.
  const card = page.locator('[class*="SettingsCard-card"]', { hasText: name });
  await expect(card).toBeVisible();
  await expect(card).toContainText(folderName);
  await expect(card).toContainText(/Free Space\s*·\s*[\d.]+\s*(B|KiB|MiB|GiB|TiB)/);

  // The redux feed has it too, with the SignalR rootfolder message muted.
  await expect.poll(() => withReduxStore<string[]>(page, `
    return store.getState().settings.rootFolders.items.map((r) => r.name);
  `)).toContain(name);

  expect((await api<RootFolder[]>(page, '/rootFolder')).length).toBe(rootFoldersBefore.length + 1);

  // Delete through the edit modal.
  await page.getByRole('button', { name: `Edit root folder ${name}` }).click();
  const editModal = modal(page, 'Edit Root Folder');
  await expect(editModal).toBeVisible();
  await editModal.getByRole('button', { name: 'Delete' }).click();
  await modal(page, 'Delete Root Folder').getByRole('button', { name: 'Delete' }).click();

  await expect(card).toHaveCount(0);
  await expect.poll(() => withReduxStore<string[]>(page, `
    return store.getState().settings.rootFolders.items.map((r) => r.name);
  `)).not.toContain(name);
  expect((await api<RootFolder[]>(page, '/rootFolder')).map((r) => r.name)).not.toContain(name);
});

// The author index keeps its options in a persisted zustand store
// (<instance>_author_index_options), not in redux.
const authorIndexFilterKey = (page: Page) => page.evaluate(() => {
  const key = Object.keys(localStorage).find((k) => k.endsWith('_author_index_options'));
  const stored = key ? JSON.parse(localStorage.getItem(key) ?? '{}') : {};

  return stored.state?.selectedFilterKey as string | number | undefined;
});

test('custom filters: save and delete through the builder on the author index', async ({ page }) => {
  const label = uniqueLabel('filter');

  await openRoute(page, '/authors');

  const reduxFilterLabels = () => withReduxStore<string[]>(page, `
    return store.getState().customFilters.items.map((f) => f.label);
  `);

  const openFilterMenu = async () => {
    await page.locator('[class*="ToolbarMenuButton-menuButton"]', { hasText: 'Filter' }).click();
  };

  await openFilterMenu();
  await page.locator('[class*="MenuItem-menuItem"]', { hasText: 'Custom Filters' }).click();

  // With no custom filters for authors yet the builder opens straight away; otherwise
  // go through the list.
  const list = modal(page, /^Custom Filters$/);

  if (await list.count()) {
    await list.getByRole('button', { name: 'Add Custom Filter' }).click();
  }

  const builder = modal(page, /^Custom Filter$/);
  await expect(builder).toBeVisible();
  await builder.locator('input[name="label"]').fill(label);
  await builder.getByRole('button', { name: 'Save' }).click();
  await expect(builder).toHaveCount(0);

  // The redux feed the unconverted pages read has it, and the index selected it.
  await expect.poll(reduxFilterLabels).toContain(label);
  const saved = (await api<CustomFilter[]>(page, '/customFilter')).find((f) => f.label === label);
  expect(saved, 'the filter reached the API').toBeTruthy();
  await expect.poll(() => authorIndexFilterKey(page)).toBe(saved?.id);

  await openFilterMenu();
  await expect(page.locator('[class*="MenuItem-menuItem"]', { hasText: label })).toBeVisible();

  // Delete it from the custom filters list.
  await page.locator('[class*="MenuItem-menuItem"]', { hasText: 'Custom Filters' }).click();
  await expect(list).toBeVisible();
  const row = list.locator('[class*="CustomFilter-customFilter"]', { hasText: label });
  await row.getByRole('button', { name: 'Remove filter' }).click();
  await expect(row).toHaveCount(0);
  await expect.poll(reduxFilterLabels).not.toContain(label);

  // The selected filter is gone, so the page falls back to all authors.
  await expect.poll(() => authorIndexFilterKey(page)).toBe('all');

  await list.getByRole('button', { name: 'Close' }).click();
  expect((await api<CustomFilter[]>(page, '/customFilter')).map((f) => f.label)).not.toContain(label);
});

test('root folders: the add author root folder default survives a failed root folder load', async ({ page, problems }) => {
  // The saved default lives in the redux-localstorage blob. Any path works: only the
  // failed load is under test, nothing is added.
  const savedPath = path.join(os.tmpdir(), `${PREFIX}-default-root`);

  await openRoute(page, '/add/search');
  await page.evaluate((rootFolderPath) => {
    const blob = JSON.parse(localStorage.getItem('readarr') ?? '{}');
    blob.search = { ...blob.search, authorDefaults: { ...blob.search?.authorDefaults, rootFolderPath } };
    localStorage.setItem('readarr', JSON.stringify(blob));
  }, savedPath);
  await page.reload();
  await waitForPage(page);
  await expect.poll(() => addAuthorRootFolder(page)).toBe(savedPath);

  const [author] = await api<Record<string, unknown>[]>(page, '/author');

  // A made-up author not in the library, so the result opens the add modal.
  await page.route((url) => url.pathname.endsWith('/api/v1/search'), (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{
      id: 1,
      foreignId: `${PREFIX}-author`,
      author: { ...author, id: 0, foreignAuthorId: `${PREFIX}-author`, titleSlug: `${PREFIX}-author`, authorName: `${PREFIX} author`, folder: `${PREFIX} author`, images: [] }
    }])
  }));

  // From here every /rootFolder load fails, and the list is dropped from the cache so
  // the select's own load is the one that fails. The select used to take a failed
  // load as an empty list and replace the saved default with a blank one.
  await page.route((url) => url.pathname.endsWith('/api/v1/rootFolder'), (route) => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: '{"message":"e2e"}'
  }));
  await withQueryClient(page, `client.removeQueries({ queryKey: ['/rootFolder'] });`);

  await page.getByPlaceholder(/^e\.g\./).fill(`${PREFIX} author`);
  await page.locator('[class*="AddNewAuthorSearchResult-searchResult"]').first().click();
  await expect(modal(page, 'Add New Author')).toBeVisible();

  await expect.poll(() => withQueryClient<string | undefined>(page, `
    return client.getQueryState(['/rootFolder'])?.status;
  `), { timeout: 30_000 }).toBe('error');

  // Give the select a render after the failure, which is when it used to pick a default.
  await page.waitForTimeout(500);
  expect(await addAuthorRootFolder(page)).toBe(savedPath);

  for (let i = problems.length - 1; i >= 0; i--) {
    const text = problems[i].text;

    if ((problems[i].kind === 'response' && text.startsWith('500') && text.includes('/api/v1/rootFolder')) ||
      (problems[i].kind === 'console' && text.includes('status of 500'))) {
      problems.splice(i, 1);
    }
  }
});
