import React, { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import SignalRListener from 'Components/SignalRListener';
import { mount, unmountAll } from './setup';
import { useAppStore } from 'App/appStore';
const { start, stop } = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@microsoft/signalr', () => ({
  LogLevel: {},
  HubConnectionBuilder: class {
    withUrl() { return this; }
    configureLogging() { return this; }
    withAutomaticReconnect() { return this; }
    build() { return { start, stop, on: vi.fn(), onreconnecting: vi.fn(), onreconnected: vi.fn(), onclose: vi.fn() }; }
  },
}));
vi.mock('Commands/useCommands', () => ({ useUpdateCommand: () => vi.fn() }));
it('retries failed startup', async () => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  start.mockRejectedValueOnce(new Error('temporary 502')).mockResolvedValue(undefined);
  await mount(<QueryClientProvider client={new QueryClient()}><SignalRListener /></QueryClientProvider>);
  expect(start).toHaveBeenCalledTimes(1);
  await act(async () => vi.advanceTimersByTimeAsync(1000));
  expect(start).toHaveBeenCalledTimes(2);
  expect(stop).not.toHaveBeenCalled();
});

it('cancels a scheduled startup retry when unmounted', async () => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  start.mockReset().mockRejectedValue(new Error('offline'));
  await mount(<QueryClientProvider client={new QueryClient()}><SignalRListener /></QueryClientProvider>);
  await unmountAll();
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(start).toHaveBeenCalledTimes(1);
});
it('shows disconnected state when startup retries are exhausted', async () => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  start.mockReset().mockRejectedValue(new Error('offline'));
  await mount(<QueryClientProvider client={new QueryClient()}><SignalRListener /></QueryClientProvider>);
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(start).toHaveBeenCalledTimes(10);
  expect(useAppStore.getState().isDisconnected).toBe(true);
  expect(useAppStore.getState().isReconnecting).toBe(false);
});
