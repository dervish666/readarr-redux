import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, vi } from 'vitest';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
window.Readarr = { apiKey: 'test-key', urlBase: '', translations: {} } as typeof window.Readarr;
vi.mock('Utilities/String/translate', () => ({ default: (key: string) => key }));

const roots: Root[] = [];
export const mount = async (element: React.ReactNode) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(element));
  return container;
};
export const unmountAll = async () => {
  await act(async () => roots.splice(0).forEach((root) => root.unmount()));
};
afterEach(async () => {
  await unmountAll();
  document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});
