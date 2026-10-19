import { kinds } from 'Helpers/Props';
import Queue from 'typings/Queue';
import translate from 'Utilities/String/translate';

export const CLOSE_MATCH = 'closeMatch';
export const DESTINATION_EXISTS = 'destinationExists';

// One of Helpers/Props kinds
type ChipKind = string;

interface ChipDefinition {
  key: string;
  label: string;
  kind: ChipKind;
}

export interface QueueStatusChip extends ChipDefinition {
  details: string[];
}

type ChipSource = Pick<
  Queue,
  | 'status'
  | 'trackedDownloadStatus'
  | 'trackedDownloadState'
  | 'statusMessages'
  | 'errorMessage'
>;

const closeMatchRegex = /^Book match is not close enough: ([\d.,]+)\s?%/;

// What a status message is about, as a short label that reads at a glance in the queue
function classify(message: string): ChipDefinition | null {
  const closeMatch = closeMatchRegex.exec(message);

  if (closeMatch) {
    return {
      key: CLOSE_MATCH,
      label: translate('QueueChipMatch', { percent: closeMatch[1] }),
      kind: kinds.WARNING,
    };
  }

  if (/destination already exists/i.test(message)) {
    return {
      key: DESTINATION_EXISTS,
      label: translate('QueueChipDestinationExists'),
      kind: kinds.DANGER,
    };
  }

  if (/^Not an upgrade/i.test(message)) {
    return {
      key: 'notAnUpgrade',
      label: translate('QueueChipNotAnUpgrade'),
      kind: kinds.DEFAULT,
    };
  }

  if (/^Book already imported/i.test(message)) {
    return {
      key: 'alreadyImported',
      label: translate('QueueChipAlreadyImported'),
      kind: kinds.DEFAULT,
    };
  }

  if (/^Has the same filesize/i.test(message)) {
    return {
      key: 'sameSize',
      label: translate('QueueChipSameSize'),
      kind: kinds.DEFAULT,
    };
  }

  if (/^Couldn't find similar book|^Couldn't parse book/i.test(message)) {
    return {
      key: 'noMatch',
      label: translate('QueueChipNoBookMatch'),
      kind: kinds.DANGER,
    };
  }

  if (/^Files name books with different numbers/i.test(message)) {
    return {
      key: 'mixedBooks',
      label: translate('QueueChipMixedBooks'),
      kind: kinds.WARNING,
    };
  }

  if (/^Unknown Author/i.test(message)) {
    return {
      key: 'unknownAuthor',
      label: translate('QueueChipUnknownAuthor'),
      kind: kinds.DANGER,
    };
  }

  if (/^No files found are eligible/i.test(message)) {
    return {
      key: 'noFiles',
      label: translate('QueueChipNoFiles'),
      kind: kinds.WARNING,
    };
  }

  if (/Remote Path Mapping|not a valid local path/i.test(message)) {
    return {
      key: 'path',
      label: translate('QueueChipPath'),
      kind: kinds.DANGER,
    };
  }

  if (/free space/i.test(message)) {
    return {
      key: 'space',
      label: translate('QueueChipFreeSpace'),
      kind: kinds.DANGER,
    };
  }

  if (/permissions/i.test(message)) {
    return {
      key: 'permissions',
      label: translate('QueueChipPermissions'),
      kind: kinds.DANGER,
    };
  }

  if (/being unpacked/i.test(message)) {
    return {
      key: 'unpacking',
      label: translate('QueueChipUnpacking'),
      kind: kinds.INFO,
    };
  }

  if (/manual import required/i.test(message)) {
    return {
      key: 'manual',
      label: translate('QueueChipManualImport'),
      kind: kinds.WARNING,
    };
  }

  return null;
}

// One chip per kind of problem, however many files share it, with every message behind it in the chip's title
export default function getQueueStatusChips({
  status,
  trackedDownloadStatus,
  trackedDownloadState,
  statusMessages,
  errorMessage,
}: ChipSource) {
  const chips: QueueStatusChip[] = [];
  const byKey: Record<string, QueueStatusChip> = {};

  const add = (chip: ChipDefinition, detail?: string) => {
    const existing = byKey[chip.key] as QueueStatusChip | undefined;

    if (existing) {
      if (detail && !existing.details.includes(detail)) {
        existing.details.push(detail);
      }

      return;
    }

    const added: QueueStatusChip = { ...chip, details: detail ? [detail] : [] };
    byKey[chip.key] = added;
    chips.push(added);
  };

  (statusMessages || []).forEach(({ title, messages }) => {
    (messages || []).forEach((message) => {
      const detail =
        title && title !== message ? `${title}: ${message}` : message;

      add(
        classify(message) || {
          key: trackedDownloadStatus === 'error' ? 'error' : 'warning',
          label:
            trackedDownloadStatus === 'error'
              ? translate('QueueChipError')
              : translate('QueueChipWarning'),
          kind:
            trackedDownloadStatus === 'error' ? kinds.DANGER : kinds.WARNING,
        },
        detail
      );
    });
  });

  if (status === 'warning' && errorMessage) {
    add(
      {
        key: 'clientWarning',
        label: translate('QueueChipClientWarning'),
        kind: kinds.WARNING,
      },
      errorMessage
    );
  }

  if (status === 'failed') {
    add(
      {
        key: 'downloadFailed',
        label: translate('QueueChipDownloadFailed'),
        kind: kinds.DANGER,
      },
      errorMessage
    );
  }

  if (status === 'downloadClientUnavailable') {
    add({
      key: 'clientUnavailable',
      label: translate('QueueChipClientUnavailable'),
      kind: kinds.WARNING,
    });
  }

  if (!chips.length && status === 'completed') {
    if (trackedDownloadState === 'importPending') {
      add({
        key: 'importPending',
        label: translate('QueueChipWaitingToImport'),
        kind: kinds.PRIMARY,
      });
    } else if (trackedDownloadState === 'importing') {
      add({
        key: 'importing',
        label: translate('QueueChipImporting'),
        kind: kinds.PRIMARY,
      });
    } else if (trackedDownloadState === 'downloadFailedPending') {
      add({
        key: 'failedPending',
        label: translate('QueueChipWaitingToProcess'),
        kind: kinds.DANGER,
      });
    }
  }

  return chips;
}

export function canRetryImport({
  status,
  trackedDownloadState,
}: Pick<Queue, 'status' | 'trackedDownloadState'>) {
  return (
    status === 'completed' &&
    (trackedDownloadState === 'importFailed' ||
      trackedDownloadState === 'importPending')
  );
}
