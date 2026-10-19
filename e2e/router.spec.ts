import { Page } from '@playwright/test';
import { api, appUrl, expect, openRoute, test, waitForPage } from './fixtures';

// Stage 4b: React Router 7 with the URL base as the router's basename. Deep links,
// reloads, back and forward, the nested log file routes, the not found page and the
// settings "unsaved changes" blocker. Read-only: no setting is saved.

interface Author {
  authorName: string;
  titleSlug: string;
}

function path(page: Page) {
  const urlBase = new URL(appUrl('/')).pathname.replace(/\/$/, '');

  return new URL(page.url()).pathname.slice(urlBase.length) || '/';
}

function sidebarLink(page: Page, route: string) {
  return page.locator(`[class*="PageSidebar-sidebar"] a[href$="${route}"]`).first();
}

test('router: the root renders the author index', async ({ page }) => {
  await openRoute(page, '/');
  await expect(page.locator('[class*="AuthorIndex-contentBody"]').first()).toBeVisible();
  expect(path(page)).toBe('/');
});

test('router: sidebar links, back and forward, and a reload keep the right page', async ({ page }) => {
  await openRoute(page, '/authors');

  await sidebarLink(page, '/calendar').click();
  await waitForPage(page);
  expect(path(page)).toBe('/calendar');

  await sidebarLink(page, '/system/status').click();
  await waitForPage(page);
  expect(path(page)).toBe('/system/status');
  await expect(page.getByText('Disk Space').first()).toBeVisible();

  await page.goBack();
  await waitForPage(page);
  expect(path(page)).toBe('/calendar');

  await page.goBack();
  await waitForPage(page);
  expect(path(page)).toBe('/authors');

  await page.goForward();
  await waitForPage(page);
  expect(path(page)).toBe('/calendar');

  await page.reload();
  await waitForPage(page);
  expect(path(page)).toBe('/calendar');
});

test('router: author and book deep links survive a reload, and the header search navigates', async ({ page }) => {
  const [author] = await api<Author[]>(page, '/author');

  await openRoute(page, `/author/${author.titleSlug}`);
  await expect(page.getByText(author.authorName).first()).toBeVisible();

  await page.reload();
  await waitForPage(page);
  expect(path(page)).toBe(`/author/${author.titleSlug}`);
  await expect(page.getByText(author.authorName).first()).toBeVisible();

  // A book link on the author page goes to the book page under the same base.
  const bookLink = page.locator('a[href*="/book/"]').first();
  const href = await bookLink.getAttribute('href');
  await bookLink.click();
  await waitForPage(page);
  expect(new URL(page.url()).pathname).toBe(href);

  await page.reload();
  await waitForPage(page);
  expect(new URL(page.url()).pathname).toBe(href);

  await openRoute(page, '/system/status');
  // Pick the author suggestion once the fuse worker offers it. Enter before then goes
  // to add new search, which is the search box's normal behaviour, not a router fault.
  await page.locator('[class*="AuthorSearchInput-wrapper"] input').fill(author.authorName);
  await page.locator('[class*="AuthorSearchResult-result"]', { hasText: author.authorName }).first().click();
  await expect.poll(() => path(page)).toBe(`/author/${author.titleSlug}`);
});

test('router: the nested log file routes resolve', async ({ page }) => {
  await openRoute(page, '/system/logs/files/update');
  expect(path(page)).toBe('/system/logs/files/update');
  await expect(page.getByText('Updater Log Files').first()).toBeVisible();

  await page.getByRole('button', { name: /Updater Log Files/ }).first().click();
  await page.locator('[class*="MenuContent"] a', { hasText: /^Log Files$/ }).click();
  await waitForPage(page);
  expect(path(page)).toBe('/system/logs/files');
});

test('router: an unknown path shows the not found page', async ({ page }) => {
  await page.goto(appUrl('/no/such/page'));
  await expect(page.getByText('You must be lost, nothing to see here.')).toBeVisible();
});

test('router: leaving settings with unsaved changes asks first', async ({ page }) => {
  // Reach the page in-app, so going back stays inside the app where it can be blocked.
  await openRoute(page, '/settings');
  await page.locator('[class*="Settings-card"][href$="/settings/ui"]').click();
  await waitForPage(page);
  expect(path(page)).toBe('/settings/ui');

  // CheckInput hides the real checkbox inside its label; clicking the label toggles it.
  await page.locator('input[type="checkbox"][name="enableColorImpairedMode"]').locator('xpath=..').click();
  await expect(page.getByText('Save Changes')).toBeVisible();

  const modal = page.locator('[class*="ModalContent-modalContent"]', { hasText: 'Unsaved Changes' });

  await sidebarLink(page, '/calendar').click();
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Stay and review changes' }).click();
  await expect(modal).toHaveCount(0);
  expect(path(page)).toBe('/settings/ui');

  // Back is blocked too.
  await page.goBack();
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Stay and review changes' }).click();
  expect(path(page)).toBe('/settings/ui');

  await sidebarLink(page, '/calendar').click();
  await modal.getByRole('button', { name: 'Discard changes and leave' }).click();
  await waitForPage(page);
  expect(path(page)).toBe('/calendar');
});
