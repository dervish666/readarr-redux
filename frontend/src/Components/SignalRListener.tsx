import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { setAppValue, setVersion } from 'App/appStore';
import ModelBase from 'App/ModelBase';
import Author from 'Author/Author';
import Book from 'Book/Book';
import { bookBelongsTo } from 'Book/useBooks';
import BookFile from 'BookFile/BookFile';
import { bookFileBelongsTo } from 'BookFile/useBookFiles';
import Command from 'Commands/Command';
import { useUpdateCommand } from 'Commands/useCommands';
import {
  removeCachedItem,
  removeCachedItems,
  updateCachedItem,
  updateCachedPagedItem,
} from 'Utilities/Fetch/queryCache';
import { repopulatePage } from 'Utilities/pagePopulator';
import SignalRLogger from 'Utilities/SignalRLogger';

type SignalRAction = 'sync' | 'created' | 'updated' | 'deleted';

interface SignalRMessage {
  name: string;
  body: {
    action: SignalRAction;
    resource: ModelBase & Record<string, unknown>;
    version?: string;
  };
}

// SignalR messages (v1 hub) and what each one does. Every domain message updates
// react-query; the zustand app store gets the connection flags and version.
//
// message          action                 effect
// author           updated                merge into ['/author'] (a new author joins)
//                  deleted                remove from ['/author']; drop its books from
//                                         ['/book'] and ['/calendar'], its files from
//                                         ['/bookfile']
//                  other                  invalidate ['/author']
// book             any                    invalidate ['/edition'] (v1 sends no edition
//                                         message; a book change may move its editions)
//                  updated                merge into ['/book'] (joins unfiltered and
//                                         same-author lists) and shown ['/calendar'] rows
//                  deleted                remove from ['/book'] and ['/calendar']
//                  other                  invalidate ['/book'] and ['/calendar']
// bookfile         updated                merge into ['/bookfile'] (joins lists for its
//                                         author or book); repopulate bookFileUpdated
//                  deleted                remove from ['/bookfile']; repopulate
//                                         bookFileDeleted and bookFileUpdated
//                  other                  invalidate ['/bookfile']
// calendar         updated                merge into ['/calendar'] (the server sends
//                                         'book' for calendar changes today)
// command          sync                   invalidate ['/command']
//                  other                  write into ['/command'], sidebar message,
//                                         finished callbacks (useUpdateCommand)
// health           any                    invalidate ['/health']
// qualitydefinition any                   invalidate ['/qualitydefinition']
// queue            any                    invalidate ['/queue'] (every paged key)
// queue/details    any                    invalidate ['/queue/details']
// queue/status     any                    write the counts into ['/queue/status']
// rootfolder       any                    invalidate ['/rootFolder']
// system/task      any                    invalidate ['/system/task'] and ['/command']
// tag              any                    invalidate ['/tag'] and ['/tag/detail']
// version          any                    app store version (reload prompt)
// wanted/cutoff,   updated                merge into shown ['/wanted/cutoff'] /
// wanted/missing                          ['/wanted/missing'] page rows
//
// Reconnecting invalidates every query and repopulates the page.
const QUERY_KEYS_BY_MESSAGE: Record<string, string[]> = {
  health: ['/health'],
  qualitydefinition: ['/qualitydefinition'],
  queue: ['/queue'],
  'queue/details': ['/queue/details'],
  rootfolder: ['/rootFolder'],
  'system/task': ['/system/task'],
  tag: ['/tag', '/tag/detail'],
};

const NOT_REFETCHED_ON_RECONNECT = new Set([
  '/release',
  '/manualimport',
  '/search',
  '/rename',
  '/retag',
]);

function invalidateQueries(queryClient: QueryClient, name: string) {
  const keys = QUERY_KEYS_BY_MESSAGE[name];

  keys?.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
}

function SignalRListener() {
  const queryClient = useQueryClient();
  const updateCommandQuery = useUpdateCommand();

  const connection = useRef<HubConnection | null>(null);

  const handleStartFail = useRef((error: unknown) => {
    console.error('[signalR] failed to connect');
    console.error(error);

    setAppValue({
      isConnected: false,
      isReconnecting: false,
      isDisconnected: false,
      isRestarting: false,
    });
  });

  const handleStart = useRef(() => {
    console.debug('[signalR] connected');

    setAppValue({
      isConnected: true,
      isReconnecting: false,
      isDisconnected: false,
      isRestarting: false,
    });
  });

  const handleReconnecting = useRef(() => {
    setAppValue({ isReconnecting: true });
  });

  const handleReconnected = useRef(() => {
    setAppValue({
      isConnected: true,
      isReconnecting: false,
      isDisconnected: false,
      isRestarting: false,
    });

    // Repopulate the page (if a repopulator is set) to ensure things
    // are in sync after reconnecting.
    repopulatePage();

    // Anything react-query holds may have changed while the socket was down. Searches and previews are left
    // alone: refetching would re-run every indexer search and rescan a Manual Import folder, losing the user's picks.
    queryClient.invalidateQueries({
      predicate: (query) =>
        !NOT_REFETCHED_ON_RECONNECT.has(String(query.queryKey[0])),
    });
  });

  const handleClose = useRef(() => {
    console.debug('[signalR] connection closed');
  });

  const handleReceiveMessage = useRef((message: SignalRMessage) => {
    console.debug('[signalR] received', message.name, message.body);

    const { body } = message;

    // Matched without case, as the old SignalRConnector's handler lookup did.
    const name = message.name.toLowerCase();

    invalidateQueries(queryClient, name);

    // A model delete arrives twice: first with no resource, then with { id }
    // (RestControllerWithSignalR). The second does the removal.
    if (body.action === 'deleted' && !body.resource) {
      return;
    }

    switch (name) {
      case 'calendar':
        // The calendar's controller broadcasts as 'book' (its resource name), so this
        // message doesn't arrive today; merge it the same way if it ever does.
        if (body.action === 'updated') {
          updateCachedItem<Book>(
            queryClient,
            '/calendar',
            body.resource as unknown as Book
          );
        }
        return;

      case 'command': {
        if (body.action === 'sync') {
          queryClient.invalidateQueries({ queryKey: ['/command'] });
          return;
        }

        updateCommandQuery(body.resource as unknown as Command);
        return;
      }

      case 'book': {
        const book = body.resource as unknown as Book;

        // v1 has no edition message; a book change may have moved its editions.
        queryClient.invalidateQueries({ queryKey: ['/edition'] });

        if (book?.id) {
          // The index overview is the monitored edition's, cached per book.
          queryClient.invalidateQueries({
            queryKey: [`/book/${book.id}/overview`],
          });
        }

        if (body.action === 'updated') {
          // Some book messages (track imported) carry no statistics; the merge keeps
          // the cached ones.
          updateCachedItem<Book>(queryClient, '/book', book, bookBelongsTo);
          // Calendar lists only take changes to books they already show (a refresh
          // that adds books refetches the calendar when it ends).
          updateCachedItem<Book>(queryClient, '/calendar', book);
        } else if (body.action === 'deleted') {
          removeCachedItem<Book>(queryClient, '/book', book.id);
          removeCachedItem<Book>(queryClient, '/calendar', book.id);
        } else {
          queryClient.invalidateQueries({ queryKey: ['/book'] });
          queryClient.invalidateQueries({ queryKey: ['/calendar'] });
        }
        return;
      }

      case 'bookfile': {
        const bookFile = body.resource as unknown as BookFile;

        if (body.action === 'updated') {
          updateCachedItem<BookFile>(
            queryClient,
            '/bookfile',
            bookFile,
            bookFileBelongsTo
          );
        } else if (body.action === 'deleted') {
          removeCachedItem<BookFile>(queryClient, '/bookfile', bookFile.id);

          repopulatePage('bookFileDeleted');
        } else {
          queryClient.invalidateQueries({ queryKey: ['/bookfile'] });
        }

        // Repopulate the page to handle recently imported file
        repopulatePage('bookFileUpdated');
        return;
      }

      case 'health':
        // The sidebar badge and Status page are on react-query; invalidateQueries above refetches.
        return;

      case 'author': {
        const author = body.resource as unknown as Author;

        if (body.action === 'updated') {
          // The author list is unfiltered, so a new author is added to it.
          updateCachedItem<Author>(queryClient, '/author', author, () => true);
        } else if (body.action === 'deleted') {
          removeCachedItem<Author>(queryClient, '/author', author.id);
          removeCachedItems<Book>(
            queryClient,
            '/book',
            (b) => b.authorId === author.id
          );
          removeCachedItems<Book>(
            queryClient,
            '/calendar',
            (b) => b.authorId === author.id
          );
          removeCachedItems<BookFile>(
            queryClient,
            '/bookfile',
            (f) => f.authorId === author.id
          );
        } else {
          queryClient.invalidateQueries({ queryKey: ['/author'] });
        }
        return;
      }

      case 'qualitydefinition':
        // Settings > Quality is on react-query; invalidateQueries above refetches it.
        return;

      case 'queue':
        // The queue page is on react-query; invalidateQueries above refetches it.
        return;

      case 'queue/details':
        // The calendar's queue details are on react-query; invalidateQueries above refetches them.
        return;

      case 'queue/status':
        // The message carries the new counts, so write them straight into the cache.
        queryClient.setQueryData(['/queue/status'], body.resource);
        return;

      case 'version':
        setVersion({ version: body.version });
        return;

      case 'wanted/cutoff':
      case 'wanted/missing':
        // Every book change sends both. The resource has no author, so merge it into
        // the rows already shown; a book that gains a file leaves the list when its
        // bookFileUpdated repopulate refetches the page, as before.
        if (body.action === 'updated') {
          updateCachedPagedItem<Book>(
            queryClient,
            name === 'wanted/cutoff' ? '/wanted/cutoff' : '/wanted/missing',
            body.resource as unknown as Book
          );
        }
        return;

      case 'system/task':
        // The task list is invalidated above; a task change may also start or end
        // commands.
        queryClient.invalidateQueries({ queryKey: ['/command'] });
        return;

      case 'rootfolder':
      case 'tag':
        // Invalidated above.
        return;

      default:
        console.error(`signalR: Unable to find handler for ${name}`);
    }
  });

  useEffect(() => {
    console.log('[signalR] starting');

    const url = `${window.Readarr.urlBase}/signalr/messages`;

    connection.current = new HubConnectionBuilder()
      .configureLogging(new SignalRLogger(LogLevel.Information))
      .withUrl(
        `${url}?access_token=${encodeURIComponent(window.Readarr.apiKey)}`
      )
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.elapsedMilliseconds > 180000) {
            setAppValue({ isDisconnected: true });
          }
          return Math.min(retryContext.previousRetryCount, 10) * 1000;
        },
      })
      .build();

    connection.current.onreconnecting(handleReconnecting.current);
    connection.current.onreconnected(handleReconnected.current);
    connection.current.onclose(handleClose.current);

    connection.current.on('receiveMessage', handleReceiveMessage.current);

    connection.current
      .start()
      .then(handleStart.current, handleStartFail.current);

    return () => {
      connection.current?.stop();
      connection.current = null;
    };
  }, []);

  return null;
}

export default SignalRListener;
