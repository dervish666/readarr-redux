import { expect, Page, test as base } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { apiKey, baseUrl, screenshotDir } from './env';

export interface Problem {
  kind: 'console' | 'pageerror' | 'response' | 'requestfailed';
  text: string;
}

// Requests the page aborts on purpose (navigating away mid-fetch) are not failures.
const IGNORED_REQUEST_FAILURES = ['net::ERR_ABORTED'];

function attachProblemWatchers(page: Page, problems: Problem[]) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      problems.push({ kind: 'console', text: message.text() });
    }
  });

  page.on('pageerror', (error) => {
    problems.push({ kind: 'pageerror', text: `${error.name}: ${error.message}` });
  });

  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push({
        kind: 'response',
        text: `${response.status()} ${response.request().method()} ${response.url()}`
      });
    }
  });

  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? 'unknown';

    if (!IGNORED_REQUEST_FAILURES.includes(failure)) {
      problems.push({ kind: 'requestfailed', text: `${failure} ${request.method()} ${request.url()}` });
    }
  });
}

export const test = base.extend<{ problems: Problem[] }>({
  problems: [async ({ page }, use) => {
    const problems: Problem[] = [];
    attachProblemWatchers(page, problems);

    await use(problems);

    // Every test fails on a console error or a 4xx/5xx, even when its own assertions passed.
    expect(problems, 'console errors or failed requests during the test').toEqual([]);
  }, { auto: true }]
});

export { expect };

export function appUrl(route: string) {
  return `${baseUrl}${route}`;
}

// Waits until the route has rendered: page content present, no loading spinners left.
export async function waitForPage(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[class*="PageContent-content"], [class*="PageContentBody-contentBody"]').first()).toBeVisible();
  await expect(page.locator('.followingBalls')).toHaveCount(0);
}

export async function openRoute(page: Page, route: string) {
  await page.goto(appUrl(route));
  await waitForPage(page);
}

export async function baselineScreenshot(page: Page, name: string) {
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
}

export async function api<T>(page: Page, route: string, init: { method?: string; data?: unknown } = {}): Promise<T> {
  const response = await page.request.fetch(`${baseUrl}/api/v1${route}`, {
    method: init.method ?? 'GET',
    headers: { 'X-Api-Key': apiKey },
    data: init.data
  });

  expect(response.ok(), `${init.method ?? 'GET'} /api/v1${route} returned ${response.status()}`).toBeTruthy();

  return (await response.json()) as T;
}
