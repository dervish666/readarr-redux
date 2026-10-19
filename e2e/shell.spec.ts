import { api, expect, openRoute, test } from './fixtures';

// Stage 4: the page shell reads zustand (App/appStore, App/messagesStore) and the
// /system/status query instead of redux. Read-only: nothing here saves, restarts or
// shuts down.

interface SystemStatus {
  authentication: string;
  isOsx: boolean;
}

function shortcutsModal(page: import('@playwright/test').Page) {
  return page.locator('[class*="ModalContent-modalContent"]', { hasText: 'Keyboard Shortcuts' });
}

test('shell: header menu and keyboard shortcuts follow /system/status', async ({ page }) => {
  const status = await api<SystemStatus>(page, '/system/status');
  await openRoute(page, '/authors');

  await page.getByRole('button', { name: 'Menu Button' }).click();

  const menu = page.locator('[class*="MenuContent-menuContent"]');
  await expect(menu.getByText('Keyboard Shortcuts')).toBeVisible();
  await expect(menu.getByText('Restart')).toBeVisible();
  await expect(menu.getByText('Shutdown')).toBeVisible();
  await expect(menu.getByText('Logout')).toHaveCount(status.authentication === 'forms' ? 1 : 0);

  await menu.getByText('Keyboard Shortcuts').click();
  const modal = shortcutsModal(page);
  await expect(modal).toBeVisible();
  await expect(modal.getByText('Focus Search Box')).toBeVisible();
  await expect(modal.getByText(status.isOsx ? 'cmd + s' : 'ctrl + s')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);

  // The same modal from its own shortcut.
  await page.locator('body').press('?');
  await expect(shortcutsModal(page)).toBeVisible();
  await page.keyboard.press('Escape');

  // `s` focuses the author search box.
  await page.locator('body').press('s');
  await expect(page.locator('[class*="AuthorSearchInput-wrapper"] input').first()).toBeFocused();
});

test('shell: the sidebar toggles from the header on a small screen', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await openRoute(page, '/authors');

  const calendarLink = page.locator('[class*="PageSidebar-sidebar"] a[href$="/calendar"]').first();
  await expect(calendarLink).not.toBeInViewport();

  await page.locator('#sidebar-toggle-button').click();
  await expect(calendarLink).toBeInViewport();

  // Picking a page closes it again.
  await calendarLink.click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(calendarLink).not.toBeInViewport();
});
