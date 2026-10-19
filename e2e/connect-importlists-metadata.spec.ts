import { Locator, Page } from '@playwright/test';
import { randomUUID } from 'crypto';
import { api, expect, openRoute, Problem, test } from './fixtures';
import { apiKey, baseUrl } from './env';

// Settings > Connect, Import Lists, Metadata and Metadata Source moved to
// react-query. A connection or list made here points at 127.0.0.1:1, has every
// trigger and automatic add switched off, and is deleted again (by name prefix)
// even when a check fails. Existing providers are never touched; the metadata
// check restores the exact settings it found, and the metadata source check
// never saves.

interface Field {
  name: string;
  value: unknown;
}

interface ProviderResource {
  id: number;
  name: string;
  fields: Field[];
}

interface NotificationResource extends ProviderResource {
  onGrab: boolean;
  onReleaseImport: boolean;
  onHealthIssue: boolean;
}

interface ImportListResource extends ProviderResource {
  enableAutomaticAdd: boolean;
  shouldSearch: boolean;
}

interface ImportListExclusion {
  id: number;
  foreignId: string;
  authorName: string;
}

interface MetadataProviderConfig {
  id: number;
  writeAudioTags: string;
  scrubAudioTags: boolean;
  writeBookTags: string;
  updateCovers: boolean;
  embedMetadata: boolean;
}

interface ValidationFailure {
  propertyName: string;
  errorMessage: string;
}

const PREFIX = 'e2e-g8';
const UNREACHABLE_URL = 'http://127.0.0.1:1';

// The labels the tag writing selects show for each stored value (v1 sends the
// enum names camelCased: no, newFiles, allFiles, sync).
const TAG_WRITE_LABELS: Record<string, string> = {
  no: 'Never',
  newFiles: 'For new downloads only',
  allFiles: 'All files; initial import only',
  sync: 'All files; keep in sync with Goodreads'
};

// Every trigger the Connect modal offers, in its order.
const TRIGGERS = [
  'onGrab',
  'onReleaseImport',
  'onUpgrade',
  'onDownloadFailure',
  'onImportFailure',
  'onRename',
  'onAuthorAdded',
  'onAuthorDelete',
  'onBookDelete',
  'onBookFileDelete',
  'onBookFileDeleteForUpgrade',
  'onBookRetag',
  'onApplicationUpdate',
  'onHealthIssue',
  'includeHealthWarnings'
];

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

// CheckInput hides the real checkbox inside its label; clicking the label toggles it.
async function setChecked(scope: Locator, name: string, checked: boolean) {
  const input = scope.locator(`input[type="checkbox"][name="${name}"]`);

  if (await input.isChecked() !== checked) {
    await input.locator('xpath=..').click();
  }

  if (checked) {
    await expect(input).toBeChecked();
  } else {
    await expect(input).not.toBeChecked();
  }
}

// A provider test that fails on purpose answers 400 and the browser logs it. Take
// exactly those out of the problem list so anything else still fails the test.
function allowExpectedFailures(problems: Problem[], path: string, count: number) {
  let responses = 0;

  for (let i = problems.length - 1; i >= 0; i--) {
    if (problems[i].kind === 'response' && problems[i].text.startsWith('400') && problems[i].text.includes(path)) {
      problems.splice(i, 1);
      responses++;
    }
  }

  expect(responses, `expected ${count} failed ${path} responses`).toBe(count);

  let consoleErrors = 0;

  for (let i = problems.length - 1; i >= 0 && consoleErrors < count; i--) {
    if (problems[i].kind === 'console' && problems[i].text.includes('status of 400')) {
      problems.splice(i, 1);
      consoleErrors++;
    }
  }
}

// The Readarr list's profile, tag and root folder selects ask the remote Readarr
// for options as soon as they render; with nothing there the action answers 500.
// Drop those, however many there were, and one browser log line for each.
function allowProviderActionFailures(problems: Problem[], path: string) {
  let responses = 0;

  for (let i = problems.length - 1; i >= 0; i--) {
    if (problems[i].kind === 'response' && problems[i].text.startsWith('500 POST') && problems[i].text.includes(path)) {
      problems.splice(i, 1);
      responses++;
    }
  }

  for (let i = problems.length - 1; i >= 0 && responses > 0; i--) {
    if (problems[i].kind === 'console' && problems[i].text.includes('status of 500')) {
      problems.splice(i, 1);
      responses--;
    }
  }
}

async function deleteLeftovers(page: Page) {
  for (const path of ['/notification', '/importlist']) {
    const items = await api<ProviderResource[]>(page, path);

    for (const item of items.filter((i) => i.name.startsWith(PREFIX))) {
      await page.request.fetch(`${baseUrl}/api/v1${path}/${item.id}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': apiKey }
      });
    }
  }

  const exclusions = await api<ImportListExclusion[]>(page, '/importlistexclusion');

  for (const exclusion of exclusions.filter((e) => e.authorName.startsWith(PREFIX))) {
    await page.request.fetch(`${baseUrl}/api/v1/importlistexclusion/${exclusion.id}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': apiKey }
    });
  }
}

test.afterEach(async ({ page }) => {
  await deleteLeftovers(page);
});

test('connect: add a Gotify connection with every trigger off, see the real test failure, save, delete', async ({ page, problems }) => {
  const name = uniqueName('gotify');

  await openRoute(page, '/settings/connect');
  await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible();

  await page.getByRole('button', { name: 'Add Connection' }).click();
  const picker = modal(page, /^Add Connection$/);
  await expect(picker).toBeVisible();

  // Pushbullet's device input asks the provider for devices through react-query.
  const devicesAsked = page.waitForRequest((request) => {
    return request.url().includes('/api/v1/notification/action/getDevices') && request.method() === 'POST';
  });
  await picker.locator('[aria-label="Add Connection - Pushbullet"]').click();
  const pushbulletModal = modal(page, 'Add Connection - Pushbullet');
  await expect(pushbulletModal).toBeVisible();
  await devicesAsked;
  await expect(formGroup(pushbulletModal, /^Device IDs$/).locator('[class*="DeviceInput-deviceInputWrapper"]')).toBeVisible();
  await pushbulletModal.getByRole('button', { name: 'Cancel' }).click();
  await expect(pushbulletModal).toHaveCount(0);

  await page.getByRole('button', { name: 'Add Connection' }).click();
  // Gotify, because its test turns a refused connection into a validation failure.
  // (Webhook's test answers 500 for one, a backend gap outside this page.)
  await picker.locator('[aria-label="Add Connection - Gotify"]').click();

  const editModal = modal(page, 'Add Connection - Gotify');
  await expect(editModal).toBeVisible();
  await expect(formGroup(editModal, /^Name$/).locator('input')).toHaveValue('Gotify');

  // A new connection starts with every supported trigger on.
  await expect(editModal.locator('input[name="onGrab"]')).toBeChecked();
  await expect(editModal.locator('input[name="onUpgrade"]')).toBeVisible();

  await formGroup(editModal, /^Name$/).locator('input').fill(name);

  for (const trigger of TRIGGERS) {
    const input = editModal.locator(`input[type="checkbox"][name="${trigger}"]`);

    if (await input.count() && await input.isEnabled()) {
      await setChecked(editModal, trigger, false);
    }
  }

  // Dependent triggers hide with their parent.
  await expect(editModal.locator('input[name="onUpgrade"]')).toHaveCount(0);
  await expect(editModal.locator('input[name="includeHealthWarnings"]')).toHaveCount(0);

  await formGroup(editModal, /^Gotify Server$/).locator('input').fill(UNREACHABLE_URL);
  await formGroup(editModal, /^App Token$/).locator('input').fill('e2e');

  const tested = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/notification/test') && response.request().method() === 'POST';
  });
  await editModal.getByRole('button', { name: 'Test' }).click();
  const testResponse = await tested;
  expect(testResponse.status()).toBe(400);
  const sent = testResponse.request().postDataJSON() as NotificationResource;
  expect(sent.name).toBe(name);
  expect(sent.onGrab).toBe(false);
  expect(sent.fields.find((f) => f.name === 'server')?.value).toBe(UNREACHABLE_URL);

  const failures = await testResponse.json() as ValidationFailure[];
  expect(failures.length).toBeGreaterThan(0);

  for (const failure of failures) {
    await expect(editModal).toContainText(failure.errorMessage);
  }

  allowExpectedFailures(problems, '/api/v1/notification/test', 1);

  // With every trigger off the connection is not enabled, so it saves untested.
  const saved = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/notification') && response.request().method() === 'POST' &&
      !response.url().includes('/test');
  });
  await editModal.getByRole('button', { name: 'Save' }).click();
  expect((await saved).ok()).toBeTruthy();

  await expect(editModal).toHaveCount(0);

  const connectionCard = card(page, name);
  await expect(connectionCard).toBeVisible();
  await expect(connectionCard).toContainText('Disabled');
  await expect(connectionCard.locator('[class*="Label-label"]')).toHaveCount(0);

  const stored = (await api<NotificationResource[]>(page, '/notification')).find((n) => n.name === name);
  expect(stored).toBeTruthy();
  expect(stored!.onGrab).toBe(false);
  expect(stored!.onReleaseImport).toBe(false);
  expect(stored!.onHealthIssue).toBe(false);

  await connectionCard.click();
  const existingModal = modal(page, 'Edit Connection - Gotify');
  await expect(existingModal).toBeVisible();
  await expect(formGroup(existingModal, /^Name$/).locator('input')).toHaveValue(name);
  await existingModal.getByRole('button', { name: 'Delete' }).click();

  const deleted = page.waitForResponse((response) => {
    return response.url().includes(`/api/v1/notification/${stored!.id}`) && response.request().method() === 'DELETE';
  });
  await modal(page, 'Delete Notification').getByRole('button', { name: 'Delete' }).click();
  expect((await deleted).ok()).toBeTruthy();
  await expect(connectionCard).toHaveCount(0);
  expect((await api<NotificationResource[]>(page, '/notification')).some((n) => n.name === name)).toBe(false);
});

test('import list exclusions: a bad ID is refused in the form, a good one is listed, then deleted', async ({ page, problems }) => {
  const authorName = uniqueName('exclusion');
  // Foreign IDs are metadata source GUIDs.
  const foreignId = randomUUID();

  await openRoute(page, '/settings/importlists');
  await expect(page.getByRole('heading', { name: 'Import List Exclusions' })).toBeVisible();

  await page.getByRole('button', { name: 'Add Import List Exclusion' }).click();
  const addModal = modal(page, 'Add Import List Exclusion');
  await expect(addModal).toBeVisible();
  await formGroup(addModal, /^Entity Name$/).locator('input').fill(authorName);
  await formGroup(addModal, /^Foreign ID$/).locator('input').fill(`${PREFIX}-not-a-guid`);

  const refused = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/importlistexclusion') && response.request().method() === 'POST';
  });
  await addModal.getByRole('button', { name: 'Save' }).click();
  const refusedResponse = await refused;
  expect(refusedResponse.status()).toBe(400);
  const failures = await refusedResponse.json() as ValidationFailure[];
  expect(failures[0].propertyName).toBe('ForeignId');
  await expect(formGroup(addModal, /^Foreign ID$/)).toContainText(failures[0].errorMessage);
  allowExpectedFailures(problems, '/api/v1/importlistexclusion', 1);

  await formGroup(addModal, /^Foreign ID$/).locator('input').fill(foreignId);

  const saved = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/importlistexclusion') && response.request().method() === 'POST';
  });
  await addModal.getByRole('button', { name: 'Save' }).click();
  const saveResponse = await saved;
  expect(saveResponse.ok()).toBeTruthy();
  expect(saveResponse.request().postDataJSON()).toMatchObject({ authorName, foreignId });
  await expect(addModal).toHaveCount(0);

  const row = page.locator('[class*="ImportListExclusion-importListExclusion"]').filter({ hasText: authorName });
  await expect(row).toContainText(foreignId);

  const stored = (await api<ImportListExclusion[]>(page, '/importlistexclusion')).find((e) => e.authorName === authorName);
  expect(stored?.foreignId).toBe(foreignId);

  await row.getByRole('button', { name: 'Edit Import List Exclusion' }).click();
  const editModal = modal(page, 'Edit Import List Exclusion');
  await expect(formGroup(editModal, /^Foreign ID$/).locator('input')).toHaveValue(foreignId);
  await editModal.getByRole('button', { name: 'Delete' }).click();

  const deleted = page.waitForResponse((response) => {
    return response.url().includes(`/api/v1/importlistexclusion/${stored!.id}`) && response.request().method() === 'DELETE';
  });
  await modal(page, 'Delete Import List Exclusion').getByRole('button', { name: 'Delete' }).click();
  expect((await deleted).ok()).toBeTruthy();
  await expect(row).toHaveCount(0);
  expect((await api<ImportListExclusion[]>(page, '/importlistexclusion')).some((e) => e.authorName === authorName)).toBe(false);
});

test('import lists: add a Readarr list with automatic add off, see its fields and test failure, save, delete', async ({ page, problems }) => {
  const name = uniqueName('list');

  await openRoute(page, '/settings/importlists');

  await page.getByRole('button', { name: 'Add Import List', exact: true }).click();
  const picker = modal(page, /^Add Import List$/);
  await expect(picker).toBeVisible();
  await expect(picker).toContainText('Program List');
  await expect(picker).toContainText('Goodreads List');

  // The Goodreads shelf input waits for a sign-in before asking for shelves.
  await picker.locator('[aria-label="Add Import List - Goodreads Bookshelves"]').click();
  const goodreadsModal = modal(page, 'Add Import List - Goodreads Bookshelves');
  await expect(goodreadsModal).toContainText('Authenticate with Goodreads to retrieve bookshelves.');
  await goodreadsModal.getByRole('button', { name: 'Cancel' }).click();
  await expect(goodreadsModal).toHaveCount(0);

  await page.getByRole('button', { name: 'Add Import List', exact: true }).click();
  await picker.locator('[aria-label="Add Import List - Readarr"]').click();

  const editModal = modal(page, 'Add Import List - Readarr');
  await expect(editModal).toBeVisible();
  // The schema's own provider fields render, with their real labels.
  await expect(formGroup(editModal, /^Full URL$/)).toBeVisible();
  await expect(formGroup(editModal, /^API Key$/)).toBeVisible();
  // New lists start with automatic add on and the whole author monitored.
  await expect(editModal.locator('input[name="enableAutomaticAdd"]')).toBeChecked();

  await formGroup(editModal, /^Name$/).locator('input').fill(name);
  await setChecked(editModal, 'enableAutomaticAdd', false);
  await setChecked(editModal, 'shouldSearch', false);
  await formGroup(editModal, /^Full URL$/).locator('input').fill(UNREACHABLE_URL);
  await formGroup(editModal, /^API Key$/).locator('input').fill('e2e');

  const tested = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/importlist/test') && response.request().method() === 'POST';
  });
  await editModal.getByRole('button', { name: 'Test' }).click();
  const testResponse = await tested;
  expect(testResponse.status()).toBe(400);
  expect((testResponse.request().postDataJSON() as ImportListResource).enableAutomaticAdd).toBe(false);
  const failures = await testResponse.json() as ValidationFailure[];
  expect(failures.length).toBeGreaterThan(0);

  for (const failure of failures) {
    await expect(editModal).toContainText(failure.errorMessage);
  }

  allowExpectedFailures(problems, '/api/v1/importlist/test', 1);

  // Without automatic add the list is not enabled, so it saves without a test.
  const saved = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/importlist') && response.request().method() === 'POST' &&
      !response.url().includes('/test');
  });
  await editModal.getByRole('button', { name: 'Save' }).click();
  expect((await saved).ok()).toBeTruthy();
  await expect(editModal).toHaveCount(0);

  const listCard = card(page, name);
  await expect(listCard).toBeVisible();
  await expect(listCard).toContainText(/Refresh: 15 minute/);
  await expect(listCard).not.toContainText('Automatic Add');

  const stored = (await api<ImportListResource[]>(page, '/importlist')).find((l) => l.name === name);
  expect(stored?.enableAutomaticAdd).toBe(false);
  expect(stored?.fields.find((f) => f.name === 'baseUrl')?.value).toBe(UNREACHABLE_URL);

  // Manage Lists reads the same react-query list.
  await page.getByRole('button', { name: 'Manage Lists' }).click();
  const manageModal = modal(page, 'Manage Import Lists');
  await expect(manageModal.locator('[class*="TableRow-row"]').filter({ hasText: name })).toContainText('ReadarrImport');
  await manageModal.getByRole('button', { name: 'Close' }).click();
  await expect(manageModal).toHaveCount(0);

  await listCard.click();
  const existingModal = modal(page, 'Edit Import List - Readarr');
  await expect(formGroup(existingModal, /^Name$/).locator('input')).toHaveValue(name);
  await existingModal.getByRole('button', { name: 'Delete' }).click();

  const deleted = page.waitForResponse((response) => {
    return response.url().includes(`/api/v1/importlist/${stored!.id}`) && response.request().method() === 'DELETE';
  });
  await modal(page, 'Delete Import List').getByRole('button', { name: 'Delete' }).click();
  expect((await deleted).ok()).toBeTruthy();
  await expect(listCard).toHaveCount(0);
  expect((await api<ImportListResource[]>(page, '/importlist')).some((l) => l.name === name)).toBe(false);

  await page.waitForLoadState('networkidle');
  allowProviderActionFailures(problems, '/api/v1/importList/action/');
});

test('metadata: a tag writing option saves, survives a reload, and is restored exactly', async ({ page }) => {
  const original = await api<MetadataProviderConfig>(page, '/config/metadataProvider');
  const changed = !original.scrubAudioTags;

  try {
    await openRoute(page, '/settings/metadata');

    // The selects show the stored enum values under their labels.
    await expect(formGroup(page.locator('body'), /^Tag Audio Files with Metadata$/))
      .toContainText(TAG_WRITE_LABELS[original.writeAudioTags]);
    await expect(formGroup(page.locator('body'), /^Send Metadata to Calibre$/))
      .toContainText(TAG_WRITE_LABELS[original.writeBookTags]);
    await expect(page.getByRole('button', { name: 'No Changes' })).toBeDisabled();

    await setChecked(page.locator('body'), 'scrubAudioTags', changed);
    const saved = page.waitForRequest((request) => {
      return request.url().includes('/api/v1/config/metadataProvider') && request.method() === 'PUT';
    });
    await page.getByRole('button', { name: 'Save' }).click();
    expect(await (await saved).postDataJSON()).toEqual({ ...original, scrubAudioTags: changed });
    await expect(page.getByRole('button', { name: 'No Changes' })).toBeDisabled();
    expect((await api<MetadataProviderConfig>(page, '/config/metadataProvider')).scrubAudioTags).toBe(changed);

    await page.reload();
    const scrub = page.locator('input[type="checkbox"][name="scrubAudioTags"]');

    if (changed) {
      await expect(scrub).toBeChecked();
    } else {
      await expect(scrub).not.toBeChecked();
    }

    await setChecked(page.locator('body'), 'scrubAudioTags', original.scrubAudioTags);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'No Changes' })).toBeDisabled();
    expect(await api<MetadataProviderConfig>(page, '/config/metadataProvider')).toEqual(original);
  } finally {
    const now = await api<MetadataProviderConfig>(page, '/config/metadataProvider');

    if (JSON.stringify(now) !== JSON.stringify(original)) {
      await api(page, '/config/metadataProvider', { method: 'PUT', data: original });
    }
  }
});

test('metadata source: Test shows the probe for the typed address and an edit clears it, nothing is saved', async ({ page }) => {
  const writes: string[] = [];

  // The probe is served, so no request leaves this machine and the result is known.
  await page.route((url) => url.pathname.endsWith('/api/v1/config/metadatasource/test'), (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      url: 'https://e2e-g8.invalid',
      status: 'unreachable',
      message: 'e2e-g8 probe: unreachable',
      time: new Date().toISOString(),
      isOk: false
    })
  }));

  page.on('request', (request) => {
    if (request.url().includes('/api/v1/config/metadatasource') && request.method() === 'PUT') {
      writes.push(request.url());
    }
  });

  await openRoute(page, '/settings/metadatasource');

  const input = page.locator('input[name="metadataSource"]');
  await expect(input).toBeVisible();
  await input.fill('https://e2e-g8.invalid');

  const tested = page.waitForRequest((request) => {
    return request.url().includes('/api/v1/config/metadatasource/test') && request.method() === 'POST';
  });
  await formGroup(page.locator('body'), /^Source URL$/).getByRole('button', { name: 'Test' }).click();
  expect((await tested).postDataJSON()).toEqual({ metadataSource: 'https://e2e-g8.invalid' });

  const probeAlert = page.locator('[class*="Alert-danger"]').filter({ hasText: 'e2e-g8 probe: unreachable' });
  await expect(probeAlert).toBeVisible();

  // A new address makes the last result stale.
  await input.fill('https://e2e-g8.invalid/other');
  await expect(probeAlert).toHaveCount(0);

  expect(writes).toEqual([]);
});
