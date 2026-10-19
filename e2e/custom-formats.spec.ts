import { Locator, Page } from '@playwright/test';
import { api, expect, openRoute, test } from './fixtures';
import { apiKey, baseUrl } from './env';
import { withQueryClient } from './reactTree';

// Settings > Custom Formats moved to react-query. The server adds every new format
// to each quality profile (and drops a deleted one), so a save or delete must also
// refresh the react-query quality profiles (the profile editor's score list).
// Everything made here is deleted.

interface NamedItem {
  id: number;
  name: string;
}

interface QualityProfile extends NamedItem {
  formatItems: { format: number; name: string; score: number }[];
}

interface ExportedFormat {
  id?: number;
  name: string;
  includeCustomFormatWhenRenaming: boolean;
  specifications: {
    id?: number;
    implementation: string;
    implementationName?: string;
    negate: boolean;
    required: boolean;
    fields: Record<string, unknown>;
  }[];
}

const PREFIX = 'e2e-g9';
const REGEX = '\\be2e-g9-release\\b';

// Moves within the app without a reload, so react-query keeps its state.
async function clientNavigate(page: Page, route: string) {
  await page.evaluate((path) => {
    const urlBase = (window as unknown as { Readarr: { urlBase: string } }).Readarr.urlBase;
    window.history.pushState({}, '', `${urlBase}${path}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, route);
}

// Nested modals stack, so the newest one is the last in the DOM.
function topModal(page: Page) {
  return page.locator('[class*="ModalContent-modalContent"]').last();
}

function formGroup(scope: Locator, label: string | RegExp) {
  return scope.locator('[class*="FormGroup-group"]').filter({
    has: scope.page().locator('label', { hasText: label })
  });
}

function formatCard(page: Page, name: string) {
  return page.locator('[class*="SettingsCard-card"]').filter({
    has: page.locator('[class*="SettingsCard-name"]', { hasText: new RegExp(`^${name}$`) })
  });
}

function specificationCards(modal: Locator) {
  return modal.locator('[class*="Specification-specification"]');
}

// The profile list is inactive while Custom Formats is open, so it is not refetched
// until something shows it again; the save must at least have marked it stale.
function queryProfilesState(page: Page) {
  return withQueryClient<{ isInvalidated: boolean; names: string[] } | null>(page, `
    const state = client.getQueryState(['/qualityprofile']);
    const data = client.getQueryData(['/qualityprofile']);
    return state ? {
      isInvalidated: state.isInvalidated,
      names: (data || []).flatMap((p) => p.formatItems.map((f) => f.name))
    } : null;
  `);
}

async function saveFormatModal(page: Page, modal: Locator, method: 'POST' | 'PUT') {
  const saved = page.waitForResponse((response) => {
    return new URL(response.url()).pathname.includes('/api/v1/customformat') &&
      response.request().method() === method;
  });
  await modal.getByRole('button', { name: 'Save' }).click();
  expect((await saved).ok()).toBeTruthy();
}

async function deleteFormatViaUi(page: Page, name: string) {
  const card = formatCard(page, name);
  await card.getByRole('button', { name: `Edit Custom Format, ${name}` }).click();
  const editModal = topModal(page);
  await editModal.getByRole('button', { name: 'Delete' }).click();

  const deleted = page.waitForResponse((response) => {
    return new URL(response.url()).pathname.includes('/api/v1/customformat/') &&
      response.request().method() === 'DELETE';
  });
  await topModal(page).getByRole('button', { name: 'Delete', exact: true }).click();
  expect((await deleted).ok()).toBeTruthy();
  await expect(card).toHaveCount(0);
}

test.afterEach(async ({ page }) => {
  const formats = await api<NamedItem[]>(page, '/customformat');

  for (const format of formats.filter((f) => f.name.startsWith(PREFIX))) {
    await page.request.fetch(`${baseUrl}/api/v1/customformat/${format.id}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': apiKey }
    });
  }
});

test('custom formats: add one with a release title condition, see it in the profile scores without a reload, clone, export/import, delete both', async ({ page }) => {
  const name = `${PREFIX}-${Date.now()}`;
  const cloneName = `${name} - Copy`;

  // Load the quality profiles into react-query first, so the check below proves the
  // custom format save refreshed them rather than a first fetch.
  await openRoute(page, '/settings/profiles');
  await expect(page.locator('[class*="SettingsCard-card"]').first()).toBeVisible();
  expect((await queryProfilesState(page))?.isInvalidated).toBe(false);

  await clientNavigate(page, '/settings/customformats');
  await page.getByRole('button', { name: 'Add Custom Format' }).click();

  const formatModal = topModal(page);
  await expect(formatModal.locator('[class*="ModalHeader-modalHeader"]')).toHaveText('Add Custom Format');
  await formGroup(formatModal, /^Name$/).locator('input').fill(name);

  // Add a condition: pick the type, then fill it in.
  await formatModal.getByRole('button', { name: 'Add Condition' }).click();
  const addModal = topModal(page);
  await addModal.getByRole('button', { name: 'Add Condition - Release Title' }).click();

  const specModal = topModal(page);
  await expect(specModal.locator('[class*="ModalHeader-modalHeader"]')).toHaveText('Add Condition - Release Title');
  await expect(specModal).toContainText('This condition matches using Regular Expressions');
  await formGroup(specModal, /^Name$/).locator('input').fill('Title match');
  await formGroup(specModal, 'Regular Expression').locator('input').fill(REGEX);
  await specModal.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('[class*="ModalContent-modalContent"]')).toHaveCount(1);

  const specs = specificationCards(formatModal);
  await expect(specs).toHaveCount(1);
  await expect(specs.first()).toContainText('Title match');
  await expect(specs.first()).toContainText('Release Title');

  // Clone a condition, then delete the copy: both stay local to the modal.
  await specs.first().hover();
  await specs.first().getByRole('button', { name: 'Clone Condition' }).click();
  await expect(specs).toHaveCount(2);
  await expect(specs.nth(1)).toContainText('Title match - Copy');
  await specs.nth(1).getByRole('button', { name: 'Edit Condition - Release Title' }).click();
  await topModal(page).getByRole('button', { name: 'Delete' }).click();
  await topModal(page).getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(specs).toHaveCount(1);

  await saveFormatModal(page, formatModal, 'POST');
  await expect(page.locator('[class*="ModalContent-modalContent"]')).toHaveCount(0);

  const card = formatCard(page, name);
  await expect(card).toBeVisible();
  await expect(card).toContainText('1 conditions');
  await expect(card).toContainText('Title match');

  const saved = (await api<(NamedItem & ExportedFormat)[]>(page, '/customformat')).find((f) => f.name === name);
  expect(saved?.specifications[0].fields).toEqual([expect.objectContaining({ name: 'value', value: REGEX })]);

  // The cached quality profiles learn about the new format (or are marked stale).
  await expect.poll(async () => {
    const queryState = await queryProfilesState(page);

    return !!(queryState?.isInvalidated || queryState?.names.includes(name));
  }).toBe(true);

  await clientNavigate(page, '/settings/profiles');
  const [firstProfile] = (await api<QualityProfile[]>(page, '/qualityprofile')).sort((a, b) => a.name.localeCompare(b.name));
  expect(firstProfile.formatItems.map((f) => f.name)).toContain(name);
  await page.getByRole('button', { name: `Edit quality profile ${firstProfile.name}` }).click();
  const profileModal = topModal(page);
  await expect(profileModal.locator('div[class*="QualityProfileFormatItem-formatName-"]:visible', { hasText: name })).toBeVisible();
  await profileModal.getByRole('button', { name: 'Cancel' }).click();
  await expect(profileModal).toHaveCount(0);

  // Clone the format.
  await clientNavigate(page, '/settings/customformats');
  await card.hover();
  await card.getByRole('button', { name: 'Clone Custom Format' }).click();
  const cloneModal = topModal(page);
  await expect(formGroup(cloneModal, /^Name$/).locator('input')).toHaveValue(cloneName);
  await expect(specificationCards(cloneModal)).toHaveCount(1);
  await saveFormatModal(page, cloneModal, 'POST');
  await expect(formatCard(page, cloneName)).toBeVisible();
  await expect(formatCard(page, cloneName)).toContainText('Title match');

  // Export, then import the JSON into a new format's form.
  await card.hover();
  await card.getByRole('button', { name: 'Export Custom Format' }).click();
  const exportModal = topModal(page);
  const exported = JSON.parse(await exportModal.locator('pre').innerText()) as ExportedFormat;
  expect(exported).toEqual({
    name,
    includeCustomFormatWhenRenaming: false,
    specifications: [{
      name: 'Title match',
      implementation: 'ReleaseTitleSpecification',
      negate: false,
      required: false,
      fields: { value: REGEX }
    }]
  });
  await exportModal.getByRole('button', { name: 'Close' }).click();
  await expect(exportModal).toHaveCount(0);

  await page.getByRole('button', { name: 'Add Custom Format' }).click();
  const importTarget = topModal(page);
  await importTarget.getByRole('button', { name: 'Import' }).click();
  const importModal = topModal(page);
  const textArea = importModal.locator('textarea');

  await textArea.fill('{ "name": ');
  await importModal.getByRole('button', { name: 'Import' }).click();
  await expect(importModal.locator('[class*="FormInputHelpText-isError"]')).toBeVisible();

  await textArea.fill(JSON.stringify({ ...exported, name: `${name}-imported` }));
  await importModal.getByRole('button', { name: 'Import' }).click();
  await expect(page.locator('[class*="ModalContent-modalContent"]')).toHaveCount(1);
  await expect(formGroup(importTarget, /^Name$/).locator('input')).toHaveValue(`${name}-imported`);
  await expect(specificationCards(importTarget)).toHaveCount(1);
  await expect(specificationCards(importTarget).first()).toContainText('Title match');
  // Not saved: the round trip is proven once the form holds the parsed format.
  await importTarget.getByRole('button', { name: 'Cancel' }).click();
  await expect(importTarget).toHaveCount(0);

  await deleteFormatViaUi(page, cloneName);
  await deleteFormatViaUi(page, name);

  await expect.poll(async () => {
    const queryState = await queryProfilesState(page);

    return !!(queryState?.isInvalidated || !queryState?.names.includes(name));
  }).toBe(true);
  expect((await api<NamedItem[]>(page, '/customformat')).filter((f) => f.name.startsWith(name))).toEqual([]);
});
