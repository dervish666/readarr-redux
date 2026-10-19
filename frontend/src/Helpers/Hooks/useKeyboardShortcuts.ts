import Mousetrap from 'mousetrap';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { shortcuts } from 'Components/keyboardShortcuts';

// Hook form of Components/keyboardShortcuts (Sonarr's useKeyboardShortcuts), keyed
// by Readarr's shortcut names so the keyboard shortcuts modal stays the one list.
interface BindingOptions {
  isGlobal?: boolean;
}

type ShortcutName = keyof typeof shortcuts;

interface MousetrapInstance {
  bind: (key: string, callback: (e: KeyboardEvent) => void) => void;
  unbind: (key: string) => void;
  stopCallback: (e: KeyboardEvent, element: Element, combo: string) => boolean;
}

function useKeyboardShortcuts() {
  const bindings = useRef<Record<string, BindingOptions>>({});
  const mousetrap = useRef<MousetrapInstance | null>(null);

  const handleStop = useCallback(
    (_e: KeyboardEvent, element: Element, combo: string) => {
      const binding = bindings.current[combo];

      if (!binding || binding.isGlobal) {
        return false;
      }

      return (
        element.tagName === 'INPUT' ||
        element.tagName === 'SELECT' ||
        element.tagName === 'TEXTAREA' ||
        (element as HTMLElement).contentEditable === 'true'
      );
    },
    []
  );

  const bindShortcut = useCallback(
    (
      name: ShortcutName,
      callback: (e: KeyboardEvent) => void,
      options: BindingOptions = {}
    ) => {
      const key = shortcuts[name].key;

      mousetrap.current?.bind(key, callback);
      bindings.current[key] = options;
    },
    []
  );

  const unbindShortcut = useCallback((name: ShortcutName) => {
    const key = shortcuts[name].key;

    delete bindings.current[key];
    mousetrap.current?.unbind(key);
  }, []);

  useEffect(() => {
    const instance: MousetrapInstance = new Mousetrap();
    instance.stopCallback = handleStop;
    mousetrap.current = instance;

    return () => {
      Object.keys(bindings.current).forEach((key) => {
        instance.unbind(key);
      });

      bindings.current = {};
      mousetrap.current = null;
    };
  }, [handleStop]);

  return useMemo(
    () => ({ bindShortcut, unbindShortcut }),
    [bindShortcut, unbindShortcut]
  );
}

export default useKeyboardShortcuts;
