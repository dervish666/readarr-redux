import { Page } from '@playwright/test';
import { api, expect, openRoute, test, waitForPage } from './fixtures';

// Read-only: the calendar page never writes. The checks pick their book from the
// library, so they hold against the local data and the staging copy alike.

interface Book {
  id: number;
  title: string;
  releaseDate?: string;
}

function monthIndex(date: Date) {
  return date.getFullYear() * 12 + date.getMonth();
}

async function chooseFilter(page: Page, label: string) {
  await page.locator('[class*="ToolbarMenuButton-menuButton"]', { hasText: 'Filter' }).click();
  await page.locator('[class*="MenuItem-menuItem"]', { hasText: label }).first().click();
}

test('calendar month shows a known book on its release date', async ({ page }) => {
  const books = await api<Book[]>(page, '/book');
  const thisMonth = monthIndex(new Date());

  // The released or upcoming book nearest to this month keeps the clicking short.
  const book = books
    .filter((b) => !!b.releaseDate)
    .sort(
      (a, b) =>
        Math.abs(monthIndex(new Date(a.releaseDate!)) - thisMonth) -
        Math.abs(monthIndex(new Date(b.releaseDate!)) - thisMonth)
    )[0];

  expect(book, 'the library has no book with a release date').toBeTruthy();

  const releaseDate = new Date(book.releaseDate!);
  const monthTitle = releaseDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  await openRoute(page, '/calendar');

  // All takes in unmonitored books too, so the book shows whatever its monitored state.
  const calendarRequest = page.waitForRequest(
    (r) => r.url().includes('/api/v1/calendar') && r.url().includes('unmonitored=true')
  );
  await chooseFilter(page, 'All');
  await calendarRequest;

  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await waitForPage(page);

  const title = page.locator('[class*="CalendarHeader-titleDesktop"]');
  const navigation = page.locator('[class*="CalendarHeader-navigationButtons"] button');
  const steps = monthIndex(releaseDate) - thisMonth;

  for (let i = 0; i < Math.abs(steps); i++) {
    const before = (await title.innerText()).trim();

    await navigation.nth(steps > 0 ? 1 : 0).click();
    await expect(title).not.toHaveText(before);
  }

  await expect(title).toHaveText(monthTitle);
  await waitForPage(page);

  // The event sits in the cell for its day of the month, with a link to the book.
  const day = page.locator('[class*="CalendarDay-day"]').filter({
    has: page.locator('[class*="CalendarDay-dayOfMonth"]:not([class*="isDifferentMonth"])', {
      hasText: new RegExp(`^${releaseDate.getDate()}$`)
    })
  });

  await expect(day.locator('[class*="CalendarEvent-bookTitle"]', { hasText: book.title }).first()).toBeVisible();
});
