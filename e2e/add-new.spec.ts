import fs from 'fs';
import path from 'path';
import { Locator, Page } from '@playwright/test';
import { authorSlug } from './env';
import { api, expect, openRoute, test } from './fixtures';

// Add new against a stubbed GET /search (e2e/fixtures/search.json: one author and one
// book result, built from the local library's GET /author/1 and its first book, renamed
// and given 99000x foreign ids so neither is in any library). The POSTs are stubbed
// with page.route and compared field for field with what the page should send, so
// nothing reaches the server (safe on staging). The live search, which needs a
// working metadata source, stays in smoke.spec.ts.

type Resource = Record<string, unknown> & { id: number };

interface Author extends Resource {
  authorName: string;
  foreignAuthorId: string;
  titleSlug: string;
}

interface Book extends Resource {
  title: string;
  foreignBookId: string;
  titleSlug: string;
  author: Author;
}

interface SearchResult {
  id: number;
  foreignId: string;
  author?: Author;
  book?: Book;
}

interface Profile {
  id: number;
  name: string;
}

interface Write {
  method: string;
  path: string;
  body: Record<string, unknown>;
}

const json = { status: 200, contentType: 'application/json' };

function loadSearch(): SearchResult[] {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'search.json'), 'utf8'));
}

const authorResult = (results: SearchResult[]) => results[0].author as Author;
const bookResult = (results: SearchResult[]) => results[1].book as Book;

async function stubSearch(page: Page, results: SearchResult[]) {
  await page.route((url) => url.pathname.endsWith('/api/v1/search'), (route) => {
    return route.fulfill({ ...json, body: JSON.stringify(results) });
  });
}

// Records every non-GET API request and answers it with `answer(write)`; anything
// unexpected gets a 500 and stays recorded, so a stray write fails the test.
async function stubWrites(page: Page, answer: (write: Write) => unknown) {
  const writes: Write[] = [];

  await page.route((url) => url.pathname.includes('/api/v1/'), (route) => {
    const request = route.request();

    if (request.method() === 'GET') {
      return route.fallback();
    }

    const write = {
      method: request.method(),
      path: new URL(request.url()).pathname.replace(/^.*\/api\/v1/, ''),
      body: request.postDataJSON()
    };

    writes.push(write);

    const body = answer(write);

    return body === undefined ?
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }) :
      route.fulfill({ ...json, body: JSON.stringify(body) });
  });

  return writes;
}

// What the selects pick for a fresh form: the first root folder, and the first
// profile by name (None last, and left out for authors).
async function formDefaults(page: Page) {
  const rootFolders = await api<{ path: string }[]>(page, '/rootfolder');
  const byName = (a: Profile, b: Profile) => a.name.localeCompare(b.name);
  const qualityProfiles = (await api<Profile[]>(page, '/qualityprofile')).sort(byName);
  const metadataProfiles = (await api<Profile[]>(page, '/metadataprofile'))
    .filter((p) => p.name !== 'None')
    .sort(byName);

  expect(rootFolders.length, 'the instance needs a root folder').toBeGreaterThan(0);

  return {
    rootFolderPath: rootFolders[0].path,
    qualityProfiles,
    metadataProfileId: metadataProfiles[0].id
  };
}

async function search(page: Page) {
  await openRoute(page, '/add/search');
  await page.getByPlaceholder(/^e\.g\./).fill('e2e add new');
}

function modal(page: Page) {
  return page.locator('[class*="ModalContent-modalContent"]');
}

async function waitForRootFolder(dialog: Locator, rootFolderPath: string) {
  await expect(dialog.locator('[class*="RootFolderSelectInputSelectedValue"]').first())
    .toContainText(rootFolderPath);
}

test('add new: add author posts the looked-up author with the chosen options', async ({ page }) => {
  const results = loadSearch();
  const author = authorResult(results);
  const defaults = await formDefaults(page);
  // A profile other than the default, so the choice is visible in the payload.
  const qualityProfile = defaults.qualityProfiles[defaults.qualityProfiles.length - 1];

  await stubSearch(page, results);
  const writes = await stubWrites(page, (write) => {
    if (write.method === 'POST' && write.path === '/author') {
      return { ...write.body, id: 990001, path: `${defaults.rootFolderPath}/${author.folder}` };
    }

    return undefined;
  });

  await search(page);

  const result = page.locator('[class*="AddNewAuthorSearchResult-searchResult"]');
  await expect(result).toHaveCount(1);
  await expect(result).toContainText(author.authorName);
  await expect(result.locator('[class*="alreadyExistsIcon"]')).toHaveCount(0);

  await result.locator('[class*="AddNewAuthorSearchResult-underlay"]').click();

  const dialog = modal(page);
  await waitForRootFolder(dialog, defaults.rootFolderPath);
  await dialog.locator('select[name="monitor"]').selectOption('future');
  await dialog.locator('select[name="monitorNewItems"]').selectOption('none');
  await dialog.locator('select[name="qualityProfileId"]').selectOption(String(qualityProfile.id));
  await dialog.locator('[class*="AddNewAuthorModalContent-searchOptions"]').click();
  await dialog.locator('[class*="AddNewAuthorModalContent-addButton"]').click();

  // The added author lands in the author list, so the result flips and the modal shuts.
  await expect(result.locator('[class*="alreadyExistsIcon"]')).toHaveCount(1);
  await expect(dialog).toHaveCount(0);

  expect(writes.map((w) => `${w.method} ${w.path}`)).toEqual(['POST /author']);
  expect(writes[0].body).toStrictEqual({
    ...author,
    addOptions: { monitor: 'future', searchForMissingBooks: true },
    monitored: true,
    monitorNewItems: 'none',
    qualityProfileId: qualityProfile.id,
    metadataProfileId: defaults.metadataProfileId,
    rootFolderPath: defaults.rootFolderPath,
    tags: []
  });
});

test('add new: add book posts the book with a new author monitoring only that book', async ({ page }) => {
  const results = loadSearch();
  const book = bookResult(results);
  const defaults = await formDefaults(page);

  await stubSearch(page, results);
  const writes = await stubWrites(page, (write) => {
    if (write.method === 'POST' && write.path === '/book') {
      const sent = write.body as unknown as Book;

      return {
        ...sent,
        id: 990002,
        authorId: 990001,
        author: { ...sent.author, id: 990001 }
      };
    }

    return undefined;
  });

  await search(page);

  const result = page.locator('[class*="AddNewBookSearchResult-searchResult"]');
  await expect(result).toHaveCount(1);
  await expect(result).toContainText(book.title);
  await expect(result.locator('[class*="alreadyExistsIcon"]')).toHaveCount(0);

  await result.locator('[class*="AddNewBookSearchResult-underlay"]').click();

  const dialog = modal(page);
  await waitForRootFolder(dialog, defaults.rootFolderPath);
  await dialog.locator('select[name="monitor"]').selectOption('specificBook');
  await dialog.locator('[class*="AddNewBookModalContent-searchOptions"]').click();
  await dialog.locator('[class*="AddNewBookModalContent-addButton"]').click();

  await expect(result.locator('[class*="alreadyExistsIcon"]')).toHaveCount(1);
  await expect(dialog).toHaveCount(0);

  expect(writes.map((w) => `${w.method} ${w.path}`)).toEqual(['POST /book']);
  expect(writes[0].body).toStrictEqual({
    ...book,
    author: {
      ...book.author,
      addOptions: { booksToMonitor: [book.foreignBookId], searchForMissingBooks: false },
      monitored: true,
      monitorNewItems: 'all',
      qualityProfileId: defaults.qualityProfiles[0].id,
      metadataProfileId: defaults.metadataProfileId,
      rootFolderPath: defaults.rootFolderPath,
      tags: []
    },
    addOptions: { searchForNewBook: true },
    monitored: true
  });
});

test('add new: results already in the library link to them and add nothing', async ({ page }) => {
  const authors = await api<Author[]>(page, '/author');
  const local = authorSlug ? authors.find((a) => a.titleSlug === authorSlug) : authors[0];
  expect(local, 'the library needs an author').toBeTruthy();

  const localAuthor = local as Author;
  const localBooks = await api<Book[]>(page, `/book?authorId=${localAuthor.id}`);
  expect(localBooks.length, 'the author needs a book').toBeGreaterThan(0);
  const localBook = localBooks[0];

  // The fixture with the local author and book in it, as a real search answers.
  const results = loadSearch();
  const identity = {
    id: localAuthor.id,
    foreignAuthorId: localAuthor.foreignAuthorId,
    titleSlug: localAuthor.titleSlug,
    authorName: localAuthor.authorName
  };
  Object.assign(authorResult(results), identity);
  Object.assign(bookResult(results), {
    id: localBook.id,
    authorId: localAuthor.id,
    foreignBookId: localBook.foreignBookId,
    titleSlug: localBook.titleSlug,
    title: localBook.title
  });
  Object.assign(bookResult(results).author, identity);
  results[0].foreignId = localAuthor.foreignAuthorId;
  results[1].foreignId = localBook.foreignBookId;

  await stubSearch(page, results);
  const writes = await stubWrites(page, () => undefined);

  await search(page);

  const authorCard = page.locator('[class*="AddNewAuthorSearchResult-searchResult"]');
  const bookCard = page.locator('[class*="AddNewBookSearchResult-searchResult"]');

  await expect(authorCard.locator('[class*="alreadyExistsIcon"]')).toHaveCount(1);
  await expect(bookCard.locator('[class*="alreadyExistsIcon"]')).toHaveCount(1);
  await expect(authorCard.locator('a[class*="AddNewAuthorSearchResult-underlay"]'))
    .toHaveAttribute('href', new RegExp(`/author/${localAuthor.titleSlug}$`));
  await expect(bookCard.locator('a[class*="AddNewBookSearchResult-underlay"]'))
    .toHaveAttribute('href', new RegExp(`/book/${localBook.titleSlug}$`));

  // Pressing one goes to the author, not to an add modal.
  await authorCard.locator('[class*="AddNewAuthorSearchResult-underlay"]').click();
  await expect(page).toHaveURL(new RegExp(`/author/${localAuthor.titleSlug}$`));
  await expect(modal(page)).toHaveCount(0);

  expect(writes).toEqual([]);
});

test('header search finds authors and books from the library lists', async ({ page }) => {
  const authors = await api<Author[]>(page, '/author');
  const local = (authorSlug ? authors.find((a) => a.titleSlug === authorSlug) : authors[0]) as Author;
  expect(local, 'the library needs an author').toBeTruthy();
  const books = await api<Book[]>(page, `/book?authorId=${local.id}`);
  expect(books.length, 'the author needs a book').toBeGreaterThan(0);

  await openRoute(page, '/add/search');
  const input = page.locator('input[name="authorSearch"]');
  const suggestions = page.locator('[class*="AuthorSearchResult-result"], [class*="BookSearchResult-result"]');

  await input.fill(books[0].title);
  await expect(suggestions.filter({ hasText: books[0].title }).first()).toBeVisible();

  await input.fill(local.authorName);
  const authorSuggestion = suggestions.filter({ hasText: local.authorName }).first();
  await expect(authorSuggestion).toBeVisible();
  await authorSuggestion.click();
  await expect(page).toHaveURL(new RegExp(`/author/${local.titleSlug}$`));
});
