import { Page } from '@playwright/test';

// Test-only access to the app's QueryClient and redux store, found by walking React's
// fiber tree from #root to the QueryClientProvider (prop `client`) or the redux
// Provider (prop `store`). The app ships no debug global.
async function withProviderProp<T>(page: Page, prop: 'client' | 'store', script: string): Promise<T> {
  return page.evaluate(([propName, body]) => {
    const root = document.getElementById('root') as unknown as Record<string, unknown>;
    const containerKey = Object.keys(root).find((k) => k.startsWith('__reactContainer$'));

    if (!containerKey) {
      throw new Error('React root not found on #root');
    }

    const isMatch = (value: unknown) => {
      const v = value as Record<string, unknown> | undefined;

      return propName === 'client' ? !!v?.getQueryCache : !!v?.getState && !!v?.dispatch;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stack: any[] = [root[containerKey]];
    let found: unknown = null;

    while (stack.length && !found) {
      const fiber = stack.pop();

      if (!fiber) {
        continue;
      }

      if (isMatch(fiber.memoizedProps?.[propName])) {
        found = fiber.memoizedProps[propName];
        break;
      }

      stack.push(fiber.sibling, fiber.child);
    }

    if (!found) {
      throw new Error(`No provider with a ${propName} prop in the React tree`);
    }

    // eslint-disable-next-line no-new-func
    return new Function(propName, body)(found);
  }, [prop, script] as const) as Promise<T>;
}

export function withQueryClient<T>(page: Page, script: string): Promise<T> {
  return withProviderProp<T>(page, 'client', script);
}

export function withReduxStore<T>(page: Page, script: string): Promise<T> {
  return withProviderProp<T>(page, 'store', script);
}

// Holds every later GET /command (react-query refetch and redux fetchCommands alike)
// until release(), so a check on command state can only pass through what SignalR
// command messages and the POST response wrote. Call release() before the test ends.
export async function holdCommandRefetches(page: Page) {
  let release = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route(
    (url) => url.pathname.endsWith('/api/v1/command'),
    async (route) => {
      if (route.request().method() === 'GET') {
        await released;
      }

      return route.fallback();
    }
  );

  return release;
}
