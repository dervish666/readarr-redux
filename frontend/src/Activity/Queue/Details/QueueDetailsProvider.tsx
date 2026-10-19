import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
} from 'react';
import Queue from 'typings/Queue';
import useQueueDetails, { QueueDetailsParams } from './useQueueDetails';

const QueueDetailsContext = createContext<Queue[] | undefined>(undefined);

// Fetches the queue details once for a page and hands each row its own item.
export default function QueueDetailsProvider({
  children,
  ...params
}: PropsWithChildren<QueueDetailsParams>) {
  const { data } = useQueueDetails(params);

  return (
    <QueueDetailsContext.Provider value={data}>
      {children}
    </QueueDetailsContext.Provider>
  );
}

export function useQueueDetailsList() {
  return useContext(QueueDetailsContext) ?? [];
}

export function useQueueItemForBook(bookId: number) {
  const queue = useContext(QueueDetailsContext);

  return useMemo(() => {
    return queue?.find((item) => item.bookId === bookId);
  }, [bookId, queue]);
}
