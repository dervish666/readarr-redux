import { Locator, Page } from '@playwright/test';
import { api, expect, openRoute, Problem, test } from './fixtures';
import { apiKey, baseUrl } from './env';

// Settings > Indexers and Settings > Download Clients moved to react-query. Every
// provider made here points at 127.0.0.1:1 and is saved disabled, so nothing reaches
// out from a staging instance either, and everything is deleted again (by name prefix)
// even when a check fails. Existing providers are never touched; the option checks
// restore the value they change.

interface Field {
  name: string;
  value: unknown;
}

interface ProviderResource {
  id: number;
  name: string;
  fields: Field[];
}

interface IndexerResource extends ProviderResource {
  enableRss: boolean;
  enableAutomaticSearch: boolean;
  enableInteractiveSearch: boolean;
}

interface DownloadClientResource extends ProviderResource {
  enable: boolean;
}

interface RemotePathMapping {
  id: number;
  host: string;
  remotePath: string;
  localPath: string;
}

interface IndexerConfig {
  id: number;
  retention: number;
}

interface DownloadClientConfig {
  id: number;
  autoRedownloadFailed: boolean;
}

interface ValidationFailure {
  propertyName: string;
  errorMessage: string;
}

const PREFIX = 'e2e-g7';
const UNREACHABLE_HOST = '127.0.0.1';

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

async function deleteLeftovers(page: Page) {
  for (const path of ['/indexer', '/downloadclient']) {
    const items = await api<ProviderResource[]>(page, path);

    for (const item of items.filter((i) => i.name.startsWith(PREFIX))) {
      await page.request.fetch(`${baseUrl}/api/v1${path}/${item.id}`, {
        method: 'DELETE',
        headers: { 'X-Api-Key': apiKey }
      });
    }
  }

  const mappings = await api<RemotePathMapping[]>(page, '/remotepathmapping');

  for (const mapping of mappings.filter((m) => m.remotePath.includes(PREFIX))) {
    await page.request.fetch(`${baseUrl}/api/v1/remotepathmapping/${mapping.id}`, {
      method: 'DELETE',
      headers: { 'X-Api-Key': apiKey }
    });
  }
}

test.afterEach(async ({ page }) => {
  await deleteLeftovers(page);
});

test('download clients: add a disabled SABnzbd, see the real test failure, save, map a remote path, test all, delete', async ({ page, problems }) => {
  const name = uniqueName('client');

  await openRoute(page, '/settings/downloadclients');
  await expect(page.getByRole('heading', { name: 'Download Clients' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Add Download Client' }).click();
  const picker = modal(page, /^Add Download Client$/);
  await expect(picker).toBeVisible();
  await picker.locator('[aria-label="Add Download Client - SABnzbd"]').click();

  const editModal = modal(page, 'Add Download Client - SABnzbd');
  await expect(editModal).toBeVisible();
  await expect(formGroup(editModal, /^Name$/).locator('input')).toHaveValue('SABnzbd');

  await formGroup(editModal, /^Name$/).locator('input').fill(name);
  await setChecked(editModal, 'enable', false);
  await formGroup(editModal, /^Host$/).locator('input').fill(UNREACHABLE_HOST);
  await formGroup(editModal, /^Port$/).locator('input').fill('1');
  await formGroup(editModal, /^API Key$/).locator('input').fill('e2e');

  // Test runs the real connection check and shows what the backend said.
  const tested = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/downloadclient/test') && response.request().method() === 'POST';
  });
  await editModal.getByRole('button', { name: 'Test' }).click();
  const testResponse = await tested;
  expect(testResponse.status()).toBe(400);
  const sent = testResponse.request().postDataJSON() as DownloadClientResource;
  expect(sent.name).toBe(name);
  expect(sent.fields.find((f) => f.name === 'host')?.value).toBe(UNREACHABLE_HOST);

  const failures = await testResponse.json() as ValidationFailure[];
  const hostFailure = failures.find((f) => f.propertyName === 'Host');
  expect(hostFailure, 'the test should fail on the host').toBeTruthy();
  await expect(formGroup(editModal, /^Host$/)).toContainText(hostFailure!.errorMessage);
  const generalFailure = failures.find((f) => !f.propertyName);
  await expect(editModal).toContainText(generalFailure!.errorMessage);

  allowExpectedFailures(problems, '/api/v1/downloadclient/test', 1);

  // A disabled client saves without a connection test.
  const saved = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/downloadclient') && response.request().method() === 'POST' &&
      !response.url().includes('/test');
  });
  await editModal.getByRole('button', { name: 'Save' }).click();
  expect((await saved).ok()).toBeTruthy();
  await expect(editModal).toHaveCount(0);

  const clientCard = card(page, name);
  await expect(clientCard).toBeVisible();
  await expect(clientCard).toContainText('Disabled');
  await expect(clientCard).toContainText('nzb');

  const stored = (await api<DownloadClientResource[]>(page, '/downloadclient')).find((c) => c.name === name);
  expect(stored).toBeTruthy();
  expect(stored!.enable).toBe(false);

  // Manage Clients edits the selection in bulk; only the new client is selected.
  await page.getByRole('button', { name: 'Manage Clients' }).click();
  const manageModal = modal(page, 'Manage Download Clients');
  const manageRow = manageModal.locator('[class*="TableRow-row"]').filter({ hasText: name });
  await expect(manageRow).toContainText('Sabnzbd');
  await manageRow.locator(`input[type="checkbox"][name="${stored!.id}"]`).locator('xpath=..').click();
  await manageModal.getByRole('button', { name: 'Edit' }).click();

  const bulkModal = modal(page, 'Edit Selected Download Clients');
  await expect(bulkModal).toContainText('1 download client(s) selected');
  await bulkModal.locator('input[name="priority"]').fill('7');
  const bulkSaved = page.waitForRequest((request) => {
    return request.url().includes('/api/v1/downloadclient/bulk') && request.method() === 'PUT';
  });
  await bulkModal.getByRole('button', { name: 'Apply Changes' }).click();
  expect((await bulkSaved).postDataJSON()).toEqual({ ids: [stored!.id], priority: 7 });
  await expect(manageRow.locator('[class*="ManageDownloadClientsModalRow-priority"]')).toHaveText('7');
  await manageModal.getByRole('button', { name: 'Close' }).click();
  await expect(manageModal).toHaveCount(0);
  await expect(clientCard).toContainText('Priority 7');
  expect((await api<{ id: number; priority: number }[]>(page, '/downloadclient')).find((c) => c.id === stored!.id)?.priority).toBe(7);

  // Remote path mappings offer the new client's host.
  const rootFolders = await api<{ path: string }[]>(page, '/rootfolder');

  if (rootFolders.length) {
    const remotePath = `/${PREFIX}-${Date.now()}/`;

    await page.getByRole('button', { name: 'Add Remote Path Mapping' }).click();
    const mappingModal = modal(page, 'Add Remote Path Mapping');
    await expect(mappingModal).toBeVisible();
    // The host list names the client that uses each host.
    await formGroup(mappingModal, /^Host$/).locator('[class*="EnhancedSelectInput-enhancedSelect"]').click();
    const hostOption = page.locator('[class*="EnhancedSelectInput-options-"] [class*="HintedSelectInputOption"]')
      .filter({ hasText: UNREACHABLE_HOST });
    await expect(hostOption).toHaveCount(1);
    await expect(hostOption).toContainText(name);
    await hostOption.click();
    await expect(formGroup(mappingModal, /^Host$/)).toContainText(UNREACHABLE_HOST);
    await formGroup(mappingModal, /^Remote Path$/).locator('input').fill(remotePath);
    await formGroup(mappingModal, /^Local Path$/).locator('input').fill(rootFolders[0].path);
    await mappingModal.locator('[class*="ModalHeader-modalHeader"]').click();

    await mappingModal.getByRole('button', { name: 'Save' }).click();
    await expect(mappingModal).toHaveCount(0);

    const row = page.locator('[class*="RemotePathMapping-remotePathMapping"]').filter({ hasText: remotePath });
    await expect(row).toContainText(UNREACHABLE_HOST);
    const mapping = (await api<RemotePathMapping[]>(page, '/remotepathmapping')).find((m) => m.remotePath === remotePath);
    expect(mapping?.host).toBe(UNREACHABLE_HOST);

    await row.getByRole('button', { name: 'Edit Remote Path Mapping' }).click();
    const editMappingModal = modal(page, 'Edit Remote Path Mapping');
    await editMappingModal.getByRole('button', { name: 'Delete' }).click();
    await modal(page, 'Delete Remote Path Mapping').getByRole('button', { name: 'Delete' }).click();
    await expect(row).toHaveCount(0);
    expect((await api<RemotePathMapping[]>(page, '/remotepathmapping')).some((m) => m.remotePath === remotePath)).toBe(false);
  }

  // Test All reports per card. The backend skips disabled clients, so serve a
  // failing result for this one to see it land on its card.
  await page.route((url) => url.pathname.endsWith('/api/v1/downloadclient/testall'), (route) => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify([{
      id: stored!.id,
      isValid: false,
      validationFailures: [{ propertyName: 'Host', errorMessage: 'e2e', severity: 'error', isWarning: false }]
    }])
  }));
  await page.getByRole('button', { name: 'Test All Clients' }).click();
  await expect(clientCard).toContainText('Test failed');
  allowExpectedFailures(problems, '/api/v1/downloadclient/testall', 1);

  // Delete through the edit modal.
  await clientCard.click();
  const existingModal = modal(page, 'Edit Download Client - SABnzbd');
  await expect(existingModal).toBeVisible();
  await expect(formGroup(existingModal, /^Name$/).locator('input')).toHaveValue(name);
  await existingModal.getByRole('button', { name: 'Delete' }).click();

  const deleted = page.waitForResponse((response) => {
    return response.url().includes(`/api/v1/downloadclient/${stored!.id}`) && response.request().method() === 'DELETE';
  });
  await modal(page, 'Delete Download Client').getByRole('button', { name: 'Delete' }).click();
  expect((await deleted).ok()).toBeTruthy();
  await expect(clientCard).toHaveCount(0);
  expect((await api<DownloadClientResource[]>(page, '/downloadclient')).some((c) => c.name === name)).toBe(false);
});

test('indexers: add a disabled Newznab with categories from the provider, see the test failure, save, clone, delete', async ({ page, problems }) => {
  const name = uniqueName('indexer');

  await openRoute(page, '/settings/indexers');

  await page.getByRole('button', { name: 'Add Indexer' }).click();
  const picker = modal(page, /^Add Indexer$/);
  await expect(picker).toBeVisible();
  await expect(picker).toContainText('Usenet');
  await expect(picker).toContainText('Torrents');
  await picker.locator('[aria-label="Add Indexer - Newznab"]').click();

  const editModal = modal(page, 'Add Indexer - Newznab');
  await expect(editModal).toBeVisible();

  await formGroup(editModal, /^Name$/).locator('input').fill(name);
  await setChecked(editModal, 'enableRss', false);
  await setChecked(editModal, 'enableAutomaticSearch', false);
  await setChecked(editModal, 'enableInteractiveSearch', false);
  await formGroup(editModal, /^URL$/).locator('input').fill(`http://${UNREACHABLE_HOST}:1`);
  await formGroup(editModal, /^API Key$/).locator('input').fill('e2e');

  // Categories come from the provider's newznabCategories action, asked again on
  // open once the URL has changed. An unreachable indexer gets the default list.
  const categoriesAsked = page.waitForRequest((request) => {
    return request.url().includes('/api/v1/indexer/action/newznabCategories') &&
      (request.postDataJSON() as IndexerResource).fields.some((f) => f.name === 'baseUrl' && f.value === `http://${UNREACHABLE_HOST}:1`);
  });
  await formGroup(editModal, /^Categories$/).locator('[class*="EnhancedSelectInput-enhancedSelect"]').click();
  await categoriesAsked;
  const options = page.locator('[class*="EnhancedSelectInput-options-"]');
  await expect(options).toContainText('Audiobook');
  // Close the list without picking (Escape would close the whole modal).
  await editModal.locator('[class*="ModalHeader-modalHeader"]').click();
  await expect(options).toHaveCount(0);

  const tested = page.waitForResponse((response) => {
    return response.url().includes('/api/v1/indexer/test') && response.request().method() === 'POST';
  });
  await editModal.getByRole('button', { name: 'Test' }).click();
  const testResponse = await tested;
  expect(testResponse.status()).toBe(400);
  const failures = await testResponse.json() as ValidationFailure[];
  expect(failures.length).toBeGreaterThan(0);

  for (const failure of failures) {
    await expect(editModal).toContainText(failure.errorMessage);
  }

  allowExpectedFailures(problems, '/api/v1/indexer/test', 1);

  await editModal.getByRole('button', { name: 'Save' }).click();
  await expect(editModal).toHaveCount(0);

  const indexerCard = card(page, name);
  await expect(indexerCard).toBeVisible();
  await expect(indexerCard).toContainText('Disabled');

  const stored = (await api<IndexerResource[]>(page, '/indexer')).find((i) => i.name === name);
  expect(stored).toBeTruthy();
  expect([stored!.enableRss, stored!.enableAutomaticSearch, stored!.enableInteractiveSearch]).toEqual([false, false, false]);
  expect(stored!.fields.find((f) => f.name === 'baseUrl')?.value).toBe(`http://${UNREACHABLE_HOST}:1`);

  // Clone opens a copy; cancel it so nothing more is made.
  await indexerCard.hover();
  await indexerCard.getByRole('button', { name: 'Clone Indexer' }).click();
  const cloneModal = modal(page, 'Add Indexer - Newznab');
  await expect(formGroup(cloneModal, /^Name$/).locator('input')).toHaveValue(`${name} - Copy`);
  await expect(formGroup(cloneModal, /^URL$/).locator('input')).toHaveValue(`http://${UNREACHABLE_HOST}:1`);
  await cloneModal.getByRole('button', { name: 'Cancel' }).click();
  await expect(cloneModal).toHaveCount(0);

  await indexerCard.click();
  const existingModal = modal(page, 'Edit Indexer - Newznab');
  await expect(existingModal).toBeVisible();
  await existingModal.getByRole('button', { name: 'Delete' }).click();
  await modal(page, 'Delete Indexer').getByRole('button', { name: 'Delete' }).click();
  await expect(indexerCard).toHaveCount(0);
  expect((await api<IndexerResource[]>(page, '/indexer')).some((i) => i.name === name)).toBe(false);
});

test('indexer options: a retention change saves, survives a reload, and is restored', async ({ page }) => {
  const original = await api<IndexerConfig>(page, '/config/indexer');
  const changed = original.retention + 7;

  try {
    await openRoute(page, '/settings/indexers');

    const retention = page.locator('input[name="retention"]');
    await expect(retention).toHaveValue(String(original.retention));
    await expect(page.getByRole('button', { name: 'No Changes' })).toBeDisabled();

    await retention.fill(String(changed));
    const saved = page.waitForRequest((request) => {
      return request.url().includes('/api/v1/config/indexer') && request.method() === 'PUT';
    });
    await page.getByRole('button', { name: 'Save' }).click();
    expect(((await saved).postDataJSON() as IndexerConfig).retention).toBe(changed);
    await expect(page.getByRole('button', { name: 'No Changes' })).toBeDisabled();

    expect((await api<IndexerConfig>(page, '/config/indexer')).retention).toBe(changed);
    await page.reload();
    await expect(page.locator('input[name="retention"]')).toHaveValue(String(changed));

    await page.locator('input[name="retention"]').fill(String(original.retention));
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'No Changes' })).toBeDisabled();
    expect((await api<IndexerConfig>(page, '/config/indexer')).retention).toBe(original.retention);
  } finally {
    await api(page, '/config/indexer', { method: 'PUT', data: original });
  }
});

test('download client options: an advanced option saves, survives a reload, and is restored', async ({ page }) => {
  const original = await api<DownloadClientConfig>(page, '/config/downloadclient');
  const changed = !original.autoRedownloadFailed;

  try {
    await openRoute(page, '/settings/downloadclients');

    // Every option here is advanced.
    const option = page.locator('input[name="autoRedownloadFailed"]');
    await expect(option).toHaveCount(0);
    await page.getByRole('button', { name: 'Show Advanced' }).click();
    await expect(option).toHaveCount(1);

    const interactiveOption = page.locator('input[name="autoRedownloadFailedFromInteractiveSearch"]');
    await expect(interactiveOption).toHaveCount(original.autoRedownloadFailed ? 1 : 0);

    await setChecked(page.locator('body'), 'autoRedownloadFailed', changed);
    // The interactive search option only shows while redownloading is on.
    await expect(interactiveOption).toHaveCount(changed ? 1 : 0);

    const saved = page.waitForRequest((request) => {
      return request.url().includes('/api/v1/config/downloadclient') && request.method() === 'PUT';
    });
    await page.getByRole('button', { name: 'Save' }).click();
    expect(((await saved).postDataJSON() as DownloadClientConfig).autoRedownloadFailed).toBe(changed);
    await expect(page.getByRole('button', { name: 'No Changes' })).toBeDisabled();
    expect((await api<DownloadClientConfig>(page, '/config/downloadclient')).autoRedownloadFailed).toBe(changed);

    await page.reload();
    await expect(page.locator('input[name="autoRedownloadFailed"]')).toBeChecked({ checked: changed });

    await setChecked(page.locator('body'), 'autoRedownloadFailed', original.autoRedownloadFailed);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'No Changes' })).toBeDisabled();
    expect((await api<DownloadClientConfig>(page, '/config/downloadclient')).autoRedownloadFailed).toBe(original.autoRedownloadFailed);

    await page.getByRole('button', { name: 'Hide Advanced' }).click();
  } finally {
    await api(page, '/config/downloadclient', { method: 'PUT', data: original });
  }
});

test('health: Test All for download clients posts through react-query and spins until it answers', async ({ page }) => {
  await openRoute(page, '/system/status');

  // DownloadClientCheck ("No download client is available") on an empty instance.
  const row = page.locator('[class*="TableRow-row"]')
    .filter({ hasText: /download client/i })
    .filter({ has: page.getByRole('button', { name: 'Test All' }) });

  test.skip(await row.count() === 0, 'no download client health item to test from');

  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route((url) => url.pathname.endsWith('/api/v1/downloadclient/testall'), async (route) => {
    await held;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  const posted = page.waitForRequest((request) => {
    return request.url().includes('/api/v1/downloadclient/testall') && request.method() === 'POST';
  });
  const button = row.first().getByRole('button', { name: 'Test All' });
  await button.click();
  await posted;
  await expect(button.locator('[class*="Icon-spinning"]')).toHaveCount(1);

  release();
  await expect(button.locator('[class*="Icon-spinning"]')).toHaveCount(0);
});
