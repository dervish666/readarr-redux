import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import ModelBase from 'App/ModelBase';
import Command from 'Commands/Command';
import { setAppValue, setVersion } from 'Store/Actions/appActions';
import { fetchAuthor } from 'Store/Actions/authorActions';
import { removeItem, updateItem } from 'Store/Actions/baseActions';
import { deleteAuthorBooks } from 'Store/Actions/bookActions';
import {
  fetchCommands,
  finishCommand,
  updateCommand,
} from 'Store/Actions/commandActions';
import { fetchQueueDetails } from 'Store/Actions/queueActions';
import { fetchQualityDefinitions } from 'Store/Actions/settingsActions';
import { fetchHealth } from 'Store/Actions/systemActions';
import { fetchTagDetails, fetchTags } from 'Store/Actions/tagActions';
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

// The react-query side of the bridge. Each message marks the queries under these
// /api/v1 path prefixes stale, so any react-query consumer refetches what changed.
// Each Stage 2 and 3 PR that moves a domain over keeps (or sharpens) its entry here
// and drops the redux dispatch below. queue/status is absent on purpose: its message
// carries the new counts, which the switch below writes straight into the cache.
const QUERY_KEYS_BY_MESSAGE: Record<string, string[]> = {
  author: ['/author'],
  book: ['/book'],
  bookfile: ['/bookfile'],
  calendar: ['/calendar'],
  command: ['/command'],
  health: ['/health'],
  qualitydefinition: ['/qualitydefinition'],
  queue: ['/queue'],
  'queue/details': ['/queue/details'],
  rootfolder: ['/rootfolder'],
  'system/task': ['/system/task'],
  tag: ['/tag'],
  'wanted/cutoff': ['/wanted/cutoff'],
  'wanted/missing': ['/wanted/missing'],
};

function invalidateQueries(queryClient: QueryClient, name: string) {
  const keys = QUERY_KEYS_BY_MESSAGE[name];

  keys?.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });
}

function SignalRListener() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  const connection = useRef<HubConnection | null>(null);

  const handleStartFail = useRef((error: unknown) => {
    console.error('[signalR] failed to connect');
    console.error(error);

    dispatch(
      setAppValue({
        isConnected: false,
        isReconnecting: false,
        isDisconnected: false,
        isRestarting: false,
      })
    );
  });

  const handleStart = useRef(() => {
    console.debug('[signalR] connected');

    dispatch(
      setAppValue({
        isConnected: true,
        isReconnecting: false,
        isDisconnected: false,
        isRestarting: false,
      })
    );
  });

  const handleReconnecting = useRef(() => {
    dispatch(setAppValue({ isReconnecting: true }));
  });

  const handleReconnected = useRef(() => {
    dispatch(
      setAppValue({
        isConnected: true,
        isReconnecting: false,
        isDisconnected: false,
        isRestarting: false,
      })
    );

    // Repopulate the page (if a repopulator is set) to ensure things
    // are in sync after reconnecting.
    dispatch(fetchAuthor());
    dispatch(fetchCommands());
    repopulatePage();

    // Anything react-query holds may have changed while the socket was down.
    queryClient.invalidateQueries();
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

    switch (name) {
      case 'calendar':
        if (body.action === 'updated') {
          dispatch(
            updateItem({
              section: 'calendar',
              updateOnly: true,
              ...body.resource,
            })
          );
        }
        return;

      case 'command': {
        if (body.action === 'sync') {
          dispatch(fetchCommands());
          return;
        }

        const resource = body.resource as unknown as Command;
        const status = resource.status;

        // Both successful and failed commands need to be
        // completed, otherwise they spin until they time out.
        if (status === 'completed' || status === 'failed') {
          dispatch(finishCommand(resource));
        } else {
          dispatch(updateCommand(resource));
        }
        return;
      }

      case 'book':
        if (body.action === 'updated') {
          dispatch(updateItem({ section: 'books', ...body.resource }));
        } else if (body.action === 'deleted') {
          dispatch(removeItem({ section: 'books', id: body.resource.id }));
        }
        return;

      case 'bookfile':
        if (body.action === 'updated') {
          dispatch(updateItem({ section: 'bookFiles', ...body.resource }));
        } else if (body.action === 'deleted') {
          dispatch(removeItem({ section: 'bookFiles', id: body.resource.id }));

          repopulatePage('bookFileDeleted');
        }

        // Repopulate the page to handle recently imported file
        repopulatePage('bookFileUpdated');
        return;

      case 'health':
        dispatch(fetchHealth());
        return;

      case 'author':
        if (body.action === 'updated') {
          dispatch(updateItem({ section: 'authors', ...body.resource }));
        } else if (body.action === 'deleted') {
          dispatch(removeItem({ section: 'authors', id: body.resource.id }));
          dispatch(deleteAuthorBooks({ authorId: body.resource.id }));
        }
        return;

      case 'qualitydefinition':
        dispatch(fetchQualityDefinitions());
        return;

      case 'queue':
        // The queue page is on react-query; invalidateQueries above refetches it.
        return;

      case 'queue/details':
        // Kept redux feed: author, calendar and wanted read state.queue.details.
        dispatch(fetchQueueDetails());
        return;

      case 'queue/status':
        // The message carries the new counts, so write them straight into the cache.
        queryClient.setQueryData(['/queue/status'], body.resource);
        return;

      case 'version':
        dispatch(setVersion({ version: body.version }));
        return;

      case 'wanted/cutoff':
        if (body.action === 'updated') {
          dispatch(
            updateItem({
              section: 'wanted.cutoffUnmet',
              updateOnly: true,
              ...body.resource,
            })
          );
        }
        return;

      case 'wanted/missing':
        if (body.action === 'updated') {
          dispatch(
            updateItem({
              section: 'wanted.missing',
              updateOnly: true,
              ...body.resource,
            })
          );
        }
        return;

      case 'system/task':
        dispatch(fetchCommands());
        return;

      case 'rootfolder':
        if (body.action === 'updated') {
          dispatch(
            updateItem({
              section: 'settings.rootFolders',
              updateOnly: true,
              ...body.resource,
            })
          );
        }
        return;

      case 'tag':
        if (body.action === 'sync') {
          dispatch(fetchTags());
          dispatch(fetchTagDetails());
        }
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
            dispatch(setAppValue({ isDisconnected: true }));
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
  }, [dispatch]);

  return null;
}

export default SignalRListener;
