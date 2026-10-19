import { Locator, Page } from '@playwright/test';
import { api, expect, openRoute, test } from './fixtures';
import { apiKey, baseUrl } from './env';
import { withQueryClient, withReduxStore } from './reactTree';

// Settings > Profiles and Settings > Quality moved to react-query. Quality and metadata
// profiles stay in redux as read-only feeds for the author, book, add-new and import
// list pages, so the profile checks save through the converted UI and then look at
// both sides and at a redux-fed select. Everything made here is deleted, and the
// quality definition check restores the title it changes.

interface NamedItem {
  id: number;
  name: string;
}

interface Tag {
  id: number;
  label: string;
}

interface ReleaseProfile {
  id: number;
  required: string[];
}

interface DelayProfile {
  id: number;
  tags: number[];
}

interface QualityDefinition {
  id: number;
  title: string;
  quality: { id: number; name: string };
  weight: number;
  minSize: number | null;
  maxSize: number | null;
}


interface Author {
  id: number;
  titleSlug: string;
}

// Moves within the app without a reload, so redux and react-query keep their state.
async function clientNavigate(page: Page, route: string) {
  await page.evaluate((path) => {
    const urlBase = (window as unknown as { Readarr: { urlBase: string } }).Readarr.urlBase;
    window.history.pushState({}, '', `${urlBase}${path}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, route);
}

function reduxProfileNames(page: Page, section: 'qualityProfiles' | 'metadataProfiles') {
  return withReduxStore<string[]>(page, `
    return store.getState().settings.${section}.items.map((p) => p.name);
  `);
}

function queryProfileNames(page: Page, path: string) {
  return withQueryClient<string[] | null>(page, `
    const items = client.getQueryData(['${path}']);
    return items ? items.map((p) => p.name) : null;
  `);
}

// The author edit modal's profile selects are JS inputs fed by redux. Opens the modal
// on the library's first author, without a reload, and returns the select's options.
async function authorEditSelectOptions(page: Page, label: string) {
  const [author] = await api<Author[]>(page, '/author');
  expect(author, 'the smoke library needs an author').toBeTruthy();

  await clientNavigate(page, `/author/${author.titleSlug}`);
  // At the test viewport the author toolbar puts Edit in its More menu.
  const editButton = page.getByRole('button', { name: 'Edit', exact: true });

  if (!await editButton.isVisible()) {
    await page.getByRole('button', { name: 'More' }).click();
  }

  await page.locator('[class*="MenuItem-menuItem"], button').filter({ hasText: /^\s*Edit\s*$/ }).first().click();
  const editModal = page.locator('[class*="ModalContent-modalContent"]').first();
  await expect(editModal).toBeVisible();

  const options = await formGroup(editModal, label).locator('select option').allTextContents();

  await editModal.getByRole('button', { name: 'Cancel' }).click();
  await expect(editModal).toHaveCount(0);

  return options;
}

const PREFIX = 'e2e-g6';

function uniqueName(kind: string) {
  return `${PREFIX}-${kind}-${Date.now()}`;
}

function modal(page: Page, heading: string | RegExp) {
  return page.locator('[class*="ModalContent-modalContent"]').filter({
    has: page.locator('[class*="ModalHeader-modalHeader"]', { hasText: heading })
  });
}

function formGroup(scope: Locator, label: string | RegExp) {
  return scope.locator('[class*="FormGroup-group"]').filter({
    has: scope.page().locator('label', { hasText: label })
  });
}

function card(page: Page, text: string) {
  return page.locator('[class*="SettingsCard-card"]').filter({ hasText: text });
}

async function apiDelete(page: Page, route: string) {
  await page.request.fetch(`${baseUrl}/api/v1${route}`, {
    method: 'DELETE',
    headers: { 'X-Api-Key': apiKey }
  });
}

async function deleteLeftovers(page: Page) {
  for (const path of ['/qualityprofile', '/metadataprofile']) {
    const items = await api<NamedItem[]>(page, path);

    for (const item of items.filter((i) => i.name.startsWith(PREFIX))) {
      await apiDelete(page, `${path}/${item.id}`);
    }
  }

  const releaseProfiles = await api<ReleaseProfile[]>(page, '/releaseprofile');

  for (const profile of releaseProfiles.filter((p) => p.required.some((t) => t.startsWith(PREFIX)))) {
    await apiDelete(page, `/releaseprofile/${profile.id}`);
  }

  const tags = await api<Tag[]>(page, '/tag');
  const testTagIds = tags.filter((t) => t.label.startsWith(PREFIX)).map((t) => t.id);
  const delayProfiles = await api<DelayProfile[]>(page, '/delayprofile');

  for (const profile of delayProfiles.filter((p) => p.tags.some((t) => testTagIds.includes(t)))) {
    await apiDelete(page, `/delayprofile/${profile.id}`);
  }

  for (const id of testTagIds) {
    await apiDelete(page, `/tag/${id}`);
  }
}

test.afterEach(async ({ page }) => {
  await deleteLeftovers(page);
});

test('release profiles: add one with a required term, see its card, delete it', async ({ page }) => {
  const term = uniqueName('release');

  await openRoute(page, '/settings/profiles');

  await page.getByRole('button', { name: 'Add Release Profile' }).click();
  const addModal = modal(page, 'Add Release Profile');
  await expect(addModal).toBeVisible();

  const required = formGroup(addModal, 'Must Contain').locator('input');
  await required.fill(term);
  await required.press('Enter');

  const saved = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/releaseprofile') && response.request().method() === 'POST';
  });
  await addModal.getByRole('button', { name: 'Save' }).click();
  expect((await saved).ok()).toBeTruthy();
  await expect(addModal).toHaveCount(0);

  const profileCard = card(page, term);
  await expect(profileCard).toBeVisible();
  await expect(profileCard).toContainText('Enabled');

  const stored = (await api<ReleaseProfile[]>(page, '/releaseprofile')).find((p) => p.required.includes(term));
  expect(stored).toBeTruthy();

  // Delete from the card's own action.
  await profileCard.hover();
  await profileCard.getByRole('button', { name: 'Delete Release Profile' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(profileCard).toHaveCount(0);

  expect((await api<ReleaseProfile[]>(page, '/releaseprofile')).some((p) => p.required.includes(term))).toBe(false);
});

test('quality definitions: a title edit warns on leaving, saves only the changed row, survives a reload, and is restored', async ({ page }) => {
  const definitions = await api<QualityDefinition[]>(page, '/qualitydefinition');
  const original = definitions[0];
  const newTitle = uniqueName('title');

  expect(original.title.startsWith(PREFIX), 'a previous run left a test title behind').toBe(false);

  try {
    await openRoute(page, '/settings/quality');

    const titleInput = page.locator(`input[name="${original.id}.title"]`);
    await expect(titleInput).toHaveValue(original.title);

    // The toolbar button reads "No Changes" until something is pending.
    const noChanges = page.getByRole('button', { name: 'No Changes' });
    const saveButton = page.getByRole('button', { name: 'Save' });
    await expect(noChanges).toBeDisabled();

    await titleInput.fill(newTitle);
    await expect(saveButton).toBeEnabled();

    // Leaving with a pending change asks first.
    await page.locator('[class*="PageSidebarItem-link"]', { hasText: /^Profiles$/ }).click();
    const unsaved = modal(page, 'Unsaved Changes');
    await expect(unsaved).toBeVisible();
    await unsaved.getByRole('button', { name: 'Stay and review changes' }).click();
    await expect(unsaved).toHaveCount(0);
    await expect(titleInput).toHaveValue(newTitle);

    const saved = page.waitForRequest((request) => {
      return request.url().includes('/api/v1/qualitydefinition/update') && request.method() === 'PUT';
    });
    await saveButton.click();
    const body = (await saved).postDataJSON() as QualityDefinition[];
    expect(body.map((d) => [d.id, d.title])).toEqual([[original.id, newTitle]]);
    await expect(noChanges).toBeDisabled();
    await expect(titleInput).toHaveValue(newTitle);

    // The server answers from a 5 second cache that the bulk update leaves alone, so
    // wait for it to report the new title before reloading.
    await expect.poll(async () => {
      return (await api<QualityDefinition[]>(page, '/qualitydefinition')).find((d) => d.id === original.id)?.title;
    }, { timeout: 15000 }).toBe(newTitle);

    await page.reload();
    await expect(page.locator(`input[name="${original.id}.title"]`)).toHaveValue(newTitle);

    // Put it back through the UI as well.
    await page.locator(`input[name="${original.id}.title"]`).fill(original.title);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(noChanges).toBeDisabled();
    await expect.poll(async () => {
      return (await api<QualityDefinition[]>(page, '/qualitydefinition')).find((d) => d.id === original.id)?.title;
    }, { timeout: 15000 }).toBe(original.title);
  } finally {
    // Always write the original back: a read can come from the server's stale cache
    // and claim the title is already restored.
    await api(page, '/qualitydefinition/update', { method: 'PUT', data: [original] });
  }
});

test('quality definitions: an audio minimum in MB saves as kilobits and keeps the rest of the row', async ({ page }) => {
  const definitions = await api<QualityDefinition[]>(page, '/qualitydefinition');
  // Unknown Audio, MP3, FLAC and M4B are the size-checked qualities.
  const original = definitions.find((d) => [10, 11, 12, 13].includes(d.quality.id))!;
  const megabytes = original.minSize === 5 * 8192 ? 6 : 5;

  try {
    await openRoute(page, '/settings/quality');

    const minSizeInput = page.locator(`input[name="${original.id}.minSize"]`);
    await expect(minSizeInput).toBeVisible();
    await minSizeInput.fill(String(megabytes));
    await minSizeInput.blur();

    const saved = page.waitForRequest((request) => {
      return request.url().includes('/api/v1/qualitydefinition/update') && request.method() === 'PUT';
    });
    await page.getByRole('button', { name: 'Save' }).click();
    const body = (await saved).postDataJSON() as QualityDefinition[];

    expect(body).toEqual([{ ...original, minSize: megabytes * 8192 }]);
  } finally {
    await api(page, '/qualitydefinition/update', { method: 'PUT', data: [original] });
  }
});

test('metadata profiles: a new profile reaches the redux feed and the author edit select without a reload, then deletes', async ({ page }) => {
  const name = uniqueName('metadata');

  await openRoute(page, '/settings/profiles');

  await page.getByRole('button', { name: 'Add Metadata Profile' }).click();
  const addModal = modal(page, 'Add Metadata Profile');
  await expect(addModal).toBeVisible();
  await formGroup(addModal, /^Name$/).locator('input').fill(name);

  const saved = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/metadataprofile') && response.request().method() === 'POST';
  });
  await addModal.getByRole('button', { name: 'Save' }).click();
  expect((await saved).ok()).toBeTruthy();
  await expect(addModal).toHaveCount(0);
  await expect(card(page, name)).toBeVisible();

  // Both sides, then a redux-fed select on another page.
  await expect.poll(() => queryProfileNames(page, '/metadataprofile')).toContain(name);
  await expect.poll(() => reduxProfileNames(page, 'metadataProfiles')).toContain(name);
  expect(await authorEditSelectOptions(page, 'Metadata Profile')).toContain(name);

  await clientNavigate(page, '/settings/profiles');
  const profileCard = card(page, name);
  await profileCard.getByRole('button', { name: `Edit metadata profile ${name}` }).click();
  const editModal = modal(page, 'Edit Metadata Profile');
  await editModal.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await expect(profileCard).toHaveCount(0);

  await expect.poll(() => reduxProfileNames(page, 'metadataProfiles')).not.toContain(name);
  expect((await api<NamedItem[]>(page, '/metadataprofile')).map((p) => p.name)).not.toContain(name);
});

test('delay profiles: add one for a tag, see its row, delete it', async ({ page }) => {
  const tag = await api<Tag>(page, '/tag', { method: 'POST', data: { label: uniqueName('tag') } });

  await openRoute(page, '/settings/profiles');

  await page.getByRole('button', { name: 'Add Delay Profile' }).click();
  const addModal = modal(page, 'Add Delay Profile');
  await expect(addModal).toBeVisible();

  const tagInput = formGroup(addModal, /^Tags$/).locator('input');
  await tagInput.fill(tag.label);
  await tagInput.press('Enter');
  await expect(formGroup(addModal, /^Tags$/)).toContainText(tag.label);

  const saved = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/delayprofile') && response.request().method() === 'POST';
  });
  await addModal.getByRole('button', { name: 'Save' }).click();
  expect((await saved).ok()).toBeTruthy();
  await expect(addModal).toHaveCount(0);

  const row = page.locator('[class*="DelayProfile-delayProfile"]').filter({ hasText: tag.label });
  await expect(row).toBeVisible();
  expect((await api<DelayProfile[]>(page, '/delayprofile')).some((p) => p.tags.includes(tag.id))).toBe(true);

  await row.getByRole('button', { name: 'Delete Delay Profile' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(row).toHaveCount(0);
  expect((await api<DelayProfile[]>(page, '/delayprofile')).some((p) => p.tags.includes(tag.id))).toBe(false);
});

test('quality profiles: a clone renamed and saved reaches the redux feed and the author edit select without a reload, then deletes', async ({ page }) => {
  const name = uniqueName('quality');
  const [source] = (await api<NamedItem[]>(page, '/qualityprofile')).sort((a, b) => a.name.localeCompare(b.name));

  await openRoute(page, '/settings/profiles');

  const sourceCard = card(page, source.name).first();
  await sourceCard.hover();
  await sourceCard.getByRole('button', { name: 'Clone Profile' }).click();

  const addModal = modal(page, 'Add Quality Profile');
  await expect(addModal).toBeVisible();
  const nameInput = formGroup(addModal, /^Name$/).locator('input');
  await expect(nameInput).toHaveValue(`${source.name} - Copy`);
  await nameInput.fill(name);

  const saved = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/qualityprofile') && response.request().method() === 'POST';
  });
  await addModal.getByRole('button', { name: 'Save' }).click();
  expect((await saved).ok()).toBeTruthy();
  await expect(addModal).toHaveCount(0);
  await expect(card(page, name)).toBeVisible();

  await expect.poll(() => queryProfileNames(page, '/qualityprofile')).toContain(name);
  await expect.poll(() => reduxProfileNames(page, 'qualityProfiles')).toContain(name);
  expect(await authorEditSelectOptions(page, 'Quality Profile')).toContain(name);

  await clientNavigate(page, '/settings/profiles');
  const profileCard = card(page, name);
  await profileCard.getByRole('button', { name: `Edit quality profile ${name}` }).click();
  const editModal = modal(page, 'Edit Quality Profile');
  await editModal.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
  await expect(profileCard).toHaveCount(0);

  await expect.poll(() => reduxProfileNames(page, 'qualityProfiles')).not.toContain(name);
  expect((await api<NamedItem[]>(page, '/qualityprofile')).map((p) => p.name)).not.toContain(name);
});
