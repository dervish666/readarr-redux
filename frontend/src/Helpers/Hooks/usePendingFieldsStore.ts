import { useCallback, useMemo, useState } from 'react';
import { create, useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

interface PendingFieldsStore {
  pendingFields: Map<string, unknown>;
}

// Pending provider field values, keyed by field name. Owned by the modal content
// that edits the provider, so closing the modal drops them.
export const usePendingFieldsStore = () => {
  // eslint-disable-next-line react/hook-use-state
  const [store] = useState(() => {
    return create<PendingFieldsStore>()(() => {
      return {
        pendingFields: new Map(),
      };
    });
  });

  const setPendingFields = useCallback(
    (fieldProperties: Record<string, unknown>) => {
      store.setState((state) => {
        const pendingFields = new Map(state.pendingFields);

        Object.entries(fieldProperties).forEach(([key, value]) => {
          pendingFields.set(key, value);
        });

        return {
          ...state,
          pendingFields,
        };
      });
    },
    [store]
  );

  const clearPendingFields = useCallback(() => {
    store.setState((state) => ({
      ...state,
      pendingFields: new Map(),
    }));
  }, [store]);

  const pendingFields = useStore(
    store,
    useShallow((state) => state.pendingFields)
  );

  const hasPendingFields = useMemo(() => {
    return pendingFields.size > 0;
  }, [pendingFields]);

  return {
    store,
    pendingFields,
    setPendingFields,
    clearPendingFields,
    hasPendingFields,
  };
};
