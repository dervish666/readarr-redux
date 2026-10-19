import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { MessageType, showMessage } from 'App/messagesStore';
import { addNewCommand } from 'Commands/addNewCommand';
import Command, { NewCommandBody } from 'Commands/Command';
import useApiMutation, {
  addOrUpdateQueryClientItem,
} from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import { messageTypes } from 'Helpers/Props';
import { isSameCommand } from 'Utilities/Command';

// The command list lives in react-query under ['/command']; the sidebar messages
// live in the zustand messages store.

export const COMMAND_QUERY_KEY = ['/command'];

const DEFAULT_COMMANDS: Command[] = [];
const COMMAND_REFETCH_INTERVAL = 5 * 60 * 1000;

const commandFinishedCallbacks: Record<number, (command: Command) => void> = {};

export function isCommandExecuting(command?: Command) {
  return command?.status === 'queued' || command?.status === 'started';
}

export const useCommands = () => {
  const result = useApiQuery<Command[]>({
    path: '/command',
    queryOptions: {
      refetchInterval: COMMAND_REFETCH_INTERVAL,
    },
  });

  return {
    ...result,
    data: (result.data as Command[] | undefined) ?? DEFAULT_COMMANDS,
  };
};

export default useCommands;

export const useExecuteCommand = () => {
  const queryClient = useQueryClient();
  const lastCommandRef = useRef<{
    command: NewCommandBody;
    timestamp: number;
  } | null>(null);

  const { mutate } = useApiMutation<Command, NewCommandBody>({
    method: 'POST',
    path: '/command',
    mutationOptions: {
      onSuccess: (newCommand: Command) => {
        queryClient.setQueryData<Command[]>(COMMAND_QUERY_KEY, (old) =>
          addNewCommand(old, newCommand)
        );
      },
    },
  });

  return useCallback(
    (body: NewCommandBody, commandFinished?: (command: Command) => void) => {
      const now = Date.now();
      const lastCommand = lastCommandRef.current;

      if (
        lastCommand &&
        now - lastCommand.timestamp < 5000 &&
        isSameCommand(lastCommand.command, body)
      ) {
        console.warn(
          'Please wait at least 5 seconds before running this command again'
        );
        return;
      }

      lastCommandRef.current = { command: body, timestamp: now };

      mutate(body, {
        onSuccess: (command) => {
          if (commandFinished) {
            commandFinishedCallbacks[command.id] = commandFinished;
          }
        },
      });
    },
    [mutate]
  );
};

export const useCancelCommand = (id: number) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useApiMutation<void, void>({
    method: 'DELETE',
    path: `/command/${id}`,
    mutationOptions: {
      onSuccess: () => {
        queryClient.setQueryData<Command[]>(COMMAND_QUERY_KEY, (old = []) =>
          old.filter((command) => command.id !== id)
        );
      },
    },
  });

  return {
    cancelCommand: mutate,
    isCancellingCommand: isPending,
    commandCancelError: error,
  };
};

// The latest command whose body matches the name and every given field
// (array fields match when the command's array holds all the given values).
export const useCommand = (
  commandName: string,
  constraints?: Partial<NewCommandBody>
) => {
  const { data: commands } = useCommands();
  const constraintsKey = JSON.stringify(constraints ?? {});

  return useMemo(() => {
    const match = { ...JSON.parse(constraintsKey), name: commandName };

    return commands.findLast((command) =>
      isSameCommand(command.body ?? {}, match)
    );
  }, [commands, commandName, constraintsKey]);
};

export const useCommandExecuting = (
  commandName: string,
  constraints?: Partial<NewCommandBody>
) => {
  return isCommandExecuting(useCommand(commandName, constraints));
};

export const useExecutingCommands = () => {
  const { data: commands } = useCommands();

  return useMemo(() => commands.filter(isCommandExecuting), [commands]);
};

function showCommandMessage(command: Command) {
  const { id, name, trigger, message, body, status } = command;

  if (!message || !body || !body.sendUpdatesToClient || body.suppressMessages) {
    return;
  }

  let type: MessageType = messageTypes.INFO;
  let hideAfter = 0;

  if (status === 'completed') {
    type = messageTypes.SUCCESS;
    hideAfter = 4;
  } else if (status === 'failed') {
    type = messageTypes.ERROR;
    hideAfter = trigger === 'manual' ? 10 : 4;
  }

  showMessage({ id, name, message, type, hideAfter });
}

// Applies a command pushed over SignalR to the react-query list: shows its sidebar
// message once and runs the callback given to useExecuteCommand when it finishes.
export const useUpdateCommand = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (command: Command) => {
      queryClient.setQueryData<Command[]>(COMMAND_QUERY_KEY, (old = []) =>
        addOrUpdateQueryClientItem(old, command, 'id')
      );

      showCommandMessage(command);

      // Both successful and failed commands need to be
      // completed, otherwise they spin until they time out.
      if (command.status === 'completed' || command.status === 'failed') {
        const commandFinished = commandFinishedCallbacks[command.id];

        if (commandFinished) {
          delete commandFinishedCallbacks[command.id];
          commandFinished(command);
        }
      }
    },
    [queryClient]
  );
};
