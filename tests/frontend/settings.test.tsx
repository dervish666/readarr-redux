import React, { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { useManageSettings } from 'Settings/useSettings';
import { mount } from './setup';

it('keeps edits made after submit and rejects duplicate saves', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['/config/ui'], { instanceName: 'original' });
  let finish: (response: Response) => void = () => {};
  const request = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  let settings: ReturnType<typeof useManageSettings<{ instanceName: string }>>;
  function Settings() {
    settings = useManageSettings<{ instanceName: string }>('/config/ui');
    return null;
  }
  await mount(<QueryClientProvider client={client}><Settings /></QueryClientProvider>);
  // Ignore a background query. Only mutation calls matter below.
  request.mockClear();
  await act(async () => settings.updateSetting('instanceName', 'submitted'));
  await act(async () => { settings.saveSettings(); settings.saveSettings(); });
  await act(async () => settings.updateSetting('instanceName', 'later edit'));
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => finish(new Response(JSON.stringify({ instanceName: 'submitted' }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
  expect(settings.pendingChanges.instanceName).toBe('later edit');
  expect(settings.hasPendingChanges).toBe(true);
  await act(async () => settings.saveSettings());
  await act(async () => finish(new Response(JSON.stringify({ instanceName: 'later edit' }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
  expect(settings.pendingChanges).toEqual({});
});
