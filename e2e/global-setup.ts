import { request } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { apiKey, baseUrl, password, storageStatePath, username } from './env';

// Fails the whole run up front when the target is unreachable or the key is wrong,
// so a dead server reads as one loud error instead of thirty page timeouts.
export default async function globalSetup() {
  if (!apiKey) {
    throw new Error('READARR_API_KEY is not set. The smoke run needs the API key of the instance under test.');
  }

  const context = await request.newContext();

  try {
    const status = await context.get(`${baseUrl}/api/v1/system/status`, {
      headers: { 'X-Api-Key': apiKey }
    });

    if (!status.ok()) {
      throw new Error(`GET ${baseUrl}/api/v1/system/status returned ${status.status()}. Check READARR_URL and READARR_API_KEY.`);
    }

    const body = await status.json();
    console.log(`[smoke] ${baseUrl}: Readarr ${body.version}, auth ${body.authentication}, url base '${body.urlBase ?? ''}'`);

    if (body.authentication === 'forms') {
      if (!username || !password) {
        throw new Error('The instance uses forms login. Set READARR_USERNAME and READARR_PASSWORD.');
      }

      const login = await context.post(`${baseUrl}/login`, {
        form: { username, password, rememberMe: 'on' },
        maxRedirects: 0
      });

      // A good login redirects to the app; a bad one redirects back to /login?loginFailed=true.
      const location = login.headers().location ?? '';

      if (login.status() !== 302 || location.includes('loginFailed')) {
        throw new Error(`Login as ${username} failed (status ${login.status()}, location '${location}').`);
      }
    }

    fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });
    await context.storageState({ path: storageStatePath });
  } finally {
    await context.dispose();
  }
}
