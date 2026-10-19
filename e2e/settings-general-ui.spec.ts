import { Locator, Page } from '@playwright/test';
import { api, expect, openRoute, test } from './fixtures';
import { apiKey, baseUrl } from './env';
import { withReduxStore } from './reactTree';

// Settings > UI, Media Management (with naming), General and the advanced settings
// toggle moved to react-query and zustand. The author, book and calendar pages still
// read the redux state.settings.ui feed, so a UI save must reach it without a reload,
// and the theme must switch the moment the save lands. Every value changed here is
// put back, through the page where the check needs it and through the API at the end.

interface UiSettings {
  id: number;
  theme: string;
  headerColor: string;
  longDateFormat: string;
  [key: string]: unknown;
}

interface MediaManagementSettings {
  id: number;
  autoUnmonitorPreviouslyDownloadedBooks: boolean;
  [key: string]: unknown;
}

interface NamingSettings {
  id: number;
  renameBooks: boolean;
  standardBookFormat: string;
  [key: string]: unknown;
}

interface HostSettings {
  id: number;
  logLevel: string;
  [key: string]: unknown;
}

interface NamingExamples {
  singleBookExample: string | null;
}

interface Author {
  titleSlug: string;
}

const LONG_DATE_FORMATS = {
  'dddd, MMMM D YYYY': /^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2} \d{4}/,
  'dddd, D MMMM YYYY': /^[A-Z][a-z]+day, \d{1,2} [A-Z][a-z]+ \d{4}/
};

// Moves within the app without a reload, so redux and react-query keep their state.
async function clientNavigate(page: Page, route: string) {
  await page.evaluate((path) => {
    const urlBase = (window as unknown as { Readarr: { urlBase: string } }).Readarr.urlBase;
    window.history.pushState({}, '', `${urlBase}${path}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, route);
}

function formGroup(page: Page, label: string | RegExp) {
  return page.locator('[class*="FormGroup-group"]').filter({
    has: page.locator('label', { hasText: label })
  });
}

const OPTION_LABELS: Record<string, string> = {
  auto: 'Auto',
  dark: 'Dark',
  light: 'Light',
  fullColor: 'Full Color',
  gradient: 'Gradient',
  info: 'Info',
  debug: 'Debug',
  trace: 'Trace',
  'dddd, MMMM D YYYY': 'Tuesday, March 25, 2014',
  'dddd, D MMMM YYYY': 'Tuesday, 25 March, 2014'
};

// Settings selects are EnhancedSelectInputs: open the list, click the option.
async function choose(page: Page, label: string, value: string) {
  await formGroup(page, label).locator('[class*="EnhancedSelectInput-enhancedSelect"]').click();
  await page.locator('[class*="EnhancedSelectInput-options-"] [class*="EnhancedSelectInputOption-option"]')
    .getByText(OPTION_LABELS[value], { exact: true })
    .click();
  await expectChosen(page, label, value);
}

function expectChosen(page: Page, label: string, value: string) {
  return expect(formGroup(page, label).locator('[class*="EnhancedSelectInput-enhancedSelect"]'))
    .toHaveText(OPTION_LABELS[value]);
}

function saveButton(page: Page) {
  return page.locator('[class*="PageToolbarButton-toolbarButton"]', { hasText: /^(Save Changes|No Changes)$/ });
}

async function save(page: Page, path: string) {
  const button = saveButton(page);
  await expect(button).toHaveText('Save Changes');

  const response = page.waitForResponse((r) =>
    r.request().method() === 'PUT' && new URL(r.url()).pathname.endsWith(`/api/v1${path}`)
  );

  await button.click();
  expect((await response).ok()).toBeTruthy();
  await expect(button).toHaveText('No Changes');
}

// CheckInput hides the real checkbox inside its label; clicking the label toggles it.
async function toggleCheck(scope: Page | Locator, name: string) {
  await scope.locator(`input[type="checkbox"][name="${name}"]`).locator('xpath=..').click();
}

function htmlData(page: Page, key: string) {
  return page.evaluate((k) => document.documentElement.dataset[k] ?? null, key);
}

function advancedButton(page: Page) {
  return page.locator('[class*="PageToolbar"] [class*="AdvancedSettingsButton-button"]');
}

test.describe('settings on react-query', () => {
  test('UI: theme switches live and survives a reload, header colour survives a reload', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });

    const original = await api<UiSettings>(page, '/config/ui');

    try {
      await openRoute(page, '/settings/ui');

      await expectChosen(page, 'Theme', original.theme);

      // Light differs from what the original resolves to under a dark system theme.
      const target = original.theme === 'light' ? 'dark' : 'light';
      await choose(page, 'Theme', target);

      // Nothing is applied until the save lands.
      expect(await htmlData(page, 'theme')).not.toBe(target);
      await save(page, '/config/ui');
      await expect.poll(() => htmlData(page, 'theme')).toBe(target);

      await choose(page, 'Header Color', 'gradient');
      await save(page, '/config/ui');
      await expect.poll(() => htmlData(page, 'headerColor')).toBe('gradient');

      await page.reload();
      await expectChosen(page, 'Theme', target);
      await expectChosen(page, 'Header Color', 'gradient');
      expect(await htmlData(page, 'theme')).toBe(target);
      expect(await htmlData(page, 'headerColor')).toBe('gradient');

      // Back to the original through the page; auto resolves to dark here.
      await choose(page, 'Theme', original.theme);
      await choose(page, 'Header Color', original.headerColor);
      await save(page, '/config/ui');
      await expect.poll(() => htmlData(page, 'theme')).toBe(original.theme === 'light' ? 'light' : 'dark');
      await expect.poll(() => htmlData(page, 'headerColor')).toBe(original.headerColor === 'gradient' ? 'gradient' : null);
    } finally {
      await api(page, '/config/ui', { method: 'PUT', data: original });
    }
  });

  test('UI: a new long date format reaches a redux page without a reload', async ({ page }) => {
    const original = await api<UiSettings>(page, '/config/ui');
    const [author] = await api<Author[]>(page, '/author');
    const formats = Object.keys(LONG_DATE_FORMATS) as (keyof typeof LONG_DATE_FORMATS)[];
    const target = formats.find((f) => f !== original.longDateFormat)!;

    try {
      await openRoute(page, '/settings/ui');
      await choose(page, 'Long Date Format', target);
      await save(page, '/config/ui');

      // The feed was fetched once at startup; only the save can have changed it.
      expect(await withReduxStore<string>(page, 'return store.getState().settings.ui.item.longDateFormat;')).toBe(target);

      await clientNavigate(page, `/author/${author.titleSlug}`);
      const dateCell = page.locator('td[class*="BookRow-releaseDate"][title]').first();
      await expect(dateCell).toBeVisible();
      await expect(dateCell).toHaveAttribute('title', LONG_DATE_FORMATS[target]);

      await clientNavigate(page, '/settings/ui');
      await choose(page, 'Long Date Format', original.longDateFormat);
      await save(page, '/config/ui');

      await clientNavigate(page, `/author/${author.titleSlug}`);
      await expect(page.locator('td[class*="BookRow-releaseDate"][title]').first())
        .toHaveAttribute('title', LONG_DATE_FORMATS[original.longDateFormat as keyof typeof LONG_DATE_FORMATS]);
    } finally {
      await api(page, '/config/ui', { method: 'PUT', data: original });
    }
  });

  test('Media Management: a toggled option survives a reload', async ({ page }) => {
    const original = await api<MediaManagementSettings>(page, '/config/mediamanagement');

    // The server validates the whole config on every save, so an instance whose stored
    // config fails its own checks (staging mounts /books read-only, so the recycle bin
    // is not writable) refuses even an unchanged PUT. Nothing can round-trip there.
    const probe = await page.request.fetch(`${baseUrl}/api/v1/config/mediamanagement`, {
      method: 'PUT',
      headers: { 'X-Api-Key': apiKey },
      data: original
    });

    test.skip(!probe.ok(),
      `the server refuses its own unchanged media management config (${probe.status()}: ${(await probe.text()).slice(0, 200)})`);

    const name = 'autoUnmonitorPreviouslyDownloadedBooks';
    const input = page.locator(`input[type="checkbox"][name="${name}"]`);

    try {
      await openRoute(page, '/settings/mediamanagement');
      await expect(input).toBeChecked({ checked: original[name] });

      await toggleCheck(page, name);
      await save(page, '/config/mediamanagement');

      expect((await api<MediaManagementSettings>(page, '/config/mediamanagement'))[name]).toBe(!original[name]);

      await page.reload();
      await expect(input).toBeChecked({ checked: !original[name] });

      await toggleCheck(page, name);
      await save(page, '/config/mediamanagement');
      expect((await api<MediaManagementSettings>(page, '/config/mediamanagement'))[name]).toBe(original[name]);
    } finally {
      await api(page, '/config/mediamanagement', { method: 'PUT', data: original });
    }
  });

  test('Naming: a token from the modal updates the example, nothing is saved', async ({ page }) => {
    const original = await api<NamingSettings>(page, '/config/naming');
    const writes: string[] = [];

    page.on('request', (request) => {
      if (request.method() !== 'GET' && new URL(request.url()).pathname.includes('/config/naming')) {
        writes.push(`${request.method()} ${request.url()}`);
      }
    });

    try {
      await openRoute(page, '/settings/mediamanagement');

      if (!original.renameBooks) {
        await toggleCheck(page, 'renameBooks');
      }

      const group = formGroup(page, 'Standard Book Format');
      const input = group.locator('input[name="standardBookFormat"]');
      await expect(input).toHaveValue(original.standardBookFormat);

      const singleBook = group.locator('[class*="FormInputHelpText"]', { hasText: /^Single Book:/ });
      await expect(singleBook).toBeVisible();
      const before = await singleBook.textContent();

      await group.getByRole('button', { name: 'File Name Tokens' }).click();
      const modal = page.locator('[class*="ModalContent-modalContent"]').last();
      await expect(modal.locator('[class*="ModalHeader"]')).toHaveText('File Name Tokens');

      await modal.locator('[class*="NamingOption-insert"]', { hasText: '{Release Year}' }).click();
      const newFormat = `${original.standardBookFormat}{Release Year}`;
      await expect(modal.locator('input[name="standardBookFormat"]')).toHaveValue(newFormat);

      await modal.getByRole('button', { name: 'Close' }).click();
      await expect(input).toHaveValue(newFormat);

      // The example on the page is the server's example for the edited format.
      const expected = await api<NamingExamples>(page,
        `/config/naming/examples?${new URLSearchParams({
          ...Object.fromEntries(Object.entries(original).map(([k, v]) => [k, String(v)])),
          renameBooks: 'true',
          standardBookFormat: newFormat
        })}`);

      expect(expected.singleBookExample).toBeTruthy();
      await expect(singleBook).toHaveText(`Single Book: ${expected.singleBookExample}`);
      expect(await singleBook.textContent()).not.toBe(before);

      // Leave without saving: a reload drops the pending change.
      await page.reload();
      expect(writes).toEqual([]);
      expect(await api<NamingSettings>(page, '/config/naming')).toEqual(original);
    } finally {
      if (writes.length) {
        await api(page, '/config/naming', { method: 'PUT', data: original });
      }
    }
  });

  test('General: a log level change survives a reload', async ({ page }) => {
    const original = await api<HostSettings>(page, '/config/host');
    const target = original.logLevel === 'info' ? 'debug' : 'info';

    try {
      await openRoute(page, '/settings/general');
      await expectChosen(page, 'Log Level', original.logLevel);

      await choose(page, 'Log Level', target);
      await save(page, '/config/host');

      // logLevel needs no restart, so no restart prompt.
      await expect(page.locator('[class*="ModalContent-modalContent"]')).toHaveCount(0);

      await page.reload();
      await expectChosen(page, 'Log Level', target);

      await choose(page, 'Log Level', original.logLevel);
      await save(page, '/config/host');
      expect((await api<HostSettings>(page, '/config/host')).logLevel).toBe(original.logLevel);
    } finally {
      const current = await api<HostSettings>(page, '/config/host');

      if (current.logLevel !== original.logLevel) {
        await api(page, '/config/host', { method: 'PUT', data: { ...current, logLevel: original.logLevel } });
      }
    }
  });

  test('advanced settings toggle shows and hides advanced fields across pages', async ({ page }) => {
    await openRoute(page, '/settings/mediamanagement');

    const mediaManagementAdvanced = formGroup(page, 'Create empty author folders');
    const indexerAdvanced = formGroup(page, 'RSS Sync Interval');
    const button = advancedButton(page);

    await expect(button).toHaveText('Show Advanced');
    await expect(mediaManagementAdvanced).toHaveCount(0);

    await button.click();
    await expect(button).toHaveText('Hide Advanced');
    await expect(mediaManagementAdvanced).toBeVisible();

    // An earlier converted page sees the same flag without a reload.
    await clientNavigate(page, '/settings/indexers');
    await expect(indexerAdvanced).toBeVisible();

    // And it is remembered over a reload.
    await page.reload();
    await expect(indexerAdvanced).toBeVisible();

    await advancedButton(page).click();
    await expect(indexerAdvanced).toHaveCount(0);

    await clientNavigate(page, '/settings/mediamanagement');
    await expect(advancedButton(page)).toHaveText('Show Advanced');
    await expect(mediaManagementAdvanced).toHaveCount(0);
  });
});
