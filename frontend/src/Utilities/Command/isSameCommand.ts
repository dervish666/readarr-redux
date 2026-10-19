// True when commandA has commandB's name (any case) and every other field of
// commandB. Array fields match when commandA's array holds all of commandB's values.
function isSameCommand(
  commandA: Record<string, unknown>,
  commandB: Record<string, unknown>
): boolean {
  const nameA = String(commandA.name ?? '').toLocaleLowerCase();
  const nameB = String(commandB.name ?? '').toLocaleLowerCase();

  if (nameA !== nameB) {
    return false;
  }

  return Object.keys(commandB).every((key) => {
    if (key === 'name') {
      return true;
    }

    const valueB = commandB[key];
    const valueA = commandA[key];

    if (Array.isArray(valueB)) {
      const arrayA: unknown[] = Array.isArray(valueA) ? valueA : [];

      return valueB.every((value) => arrayA.includes(value));
    }

    return valueB === valueA;
  });
}

export default isSameCommand;
