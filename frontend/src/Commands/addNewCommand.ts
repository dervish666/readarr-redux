import Command from 'Commands/Command';

// Adds a just-posted command to a cached list. SignalR progress for it can arrive
// before the POST response, so an entry already there is newer and is kept.
export function addNewCommand(
  commands: Command[] | undefined,
  command: Command
): Command[] {
  const list = commands ?? [];

  return list.some((c) => c.id === command.id) ? list : [...list, command];
}
