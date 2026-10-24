import { icons, kinds } from 'Helpers/Props';
import Queue from 'typings/Queue';
import translate from 'Utilities/String/translate';

export const CLOSE_MATCH = 'closeMatch';
export const DESTINATION_EXISTS = 'destinationExists';

// One of Helpers/Props kinds
type ChipKind = string;

// One of Helpers/Props icons
type ChipIcon = typeof icons.WARNING;

interface ChipDefinition {
  key: string;
  label: string;
  kind: ChipKind;
  icon: ChipIcon;
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
      icon: icons.QUEUE_CLOSE_MATCH,
    };
  }

  if (/destination already exists/i.test(message)) {
    return {
      key: DESTINATION_EXISTS,
      label: translate('QueueChipDestinationExists'),
      kind: kinds.DANGER,
      icon: icons.QUEUE_DESTINATION_EXISTS,
    };
  }

  if (/^Not an upgrade/i.test(message)) {
    return {
      key: 'notAnUpgrade',
      label: translate('QueueChipNotAnUpgrade'),
      kind: kinds.DEFAULT,
      icon: icons.QUEUE_NOT_AN_UPGRADE,
    };
  }

  if (/^Book already imported/i.test(message)) {
    return {
      key: 'alreadyImported',
      label: translate('QueueChipAlreadyImported'),
      kind: kinds.DEFAULT,
      icon: icons.QUEUE_ALREADY_IMPORTED,
    };
  }

  // A second file for a part another file in the download took first. It was never imported, so not "already imported".
  if (/^Another file in this import came first/i.test(message)) {
    return {
      key: 'partClaimed',
      label: translate('QueueChipPartClaimed'),
      kind: kinds.WARNING,
      icon: icons.QUEUE_PART_CLAIMED,
    };
  }

  if (/^Not imported, still in the download/i.test(message)) {
    return {
      key: 'leftBehind',
      label: translate('QueueChipLeftBehind'),
      kind: kinds.WARNING,
      icon: icons.QUEUE_LEFT_BEHIND,
    };
  }

  if (/^Has the same filesize/i.test(message)) {
    return {
      key: 'sameSize',
      label: translate('QueueChipSameSize'),
      kind: kinds.DEFAULT,
      icon: icons.QUEUE_SAME_SIZE,
    };
  }

  if (/^Couldn't find similar book|^Couldn't parse book/i.test(message)) {
    return {
      key: 'noMatch',
      label: translate('QueueChipNoBookMatch'),
      kind: kinds.DANGER,
      icon: icons.QUEUE_NO_MATCH,
    };
  }

  if (/^Files name books with different numbers/i.test(message)) {
    return {
      key: 'mixedBooks',
      label: translate('QueueChipMixedBooks'),
      kind: kinds.WARNING,
      icon: icons.QUEUE_MIXED_BOOKS,
    };
  }

  if (/^Unknown Author/i.test(message)) {
    return {
      key: 'unknownAuthor',
      label: translate('QueueChipUnknownAuthor'),
      kind: kinds.DANGER,
      icon: icons.QUEUE_UNKNOWN_AUTHOR,
    };
  }

  if (/^No files found are eligible/i.test(message)) {
    return {
      key: 'noFiles',
      label: translate('QueueChipNoFiles'),
      kind: kinds.WARNING,
      icon: icons.QUEUE_NO_FILES,
    };
  }

  if (/Remote Path Mapping|not a valid local path/i.test(message)) {
    return {
      key: 'path',
      label: translate('QueueChipPath'),
      kind: kinds.DANGER,
      icon: icons.QUEUE_PATH,
    };
  }

  if (/free space/i.test(message)) {
    return {
      key: 'space',
      label: translate('QueueChipFreeSpace'),
      kind: kinds.DANGER,
      icon: icons.DRIVE,
    };
  }

  if (/permissions/i.test(message)) {
    return {
      key: 'permissions',
      label: translate('QueueChipPermissions'),
      kind: kinds.DANGER,
      icon: icons.QUEUE_PERMISSIONS,
    };
  }

  if (/being unpacked/i.test(message)) {
    return {
      key: 'unpacking',
      label: translate('QueueChipUnpacking'),
      kind: kinds.INFO,
      icon: icons.QUEUE_UNPACKING,
    };
  }

  if (/manual import required/i.test(message)) {
    return {
      key: 'manual',
      label: translate('QueueChipManualImport'),
      kind: kinds.WARNING,
      icon: icons.QUEUE_MANUAL_IMPORT,
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
          icon:
            trackedDownloadStatus === 'error' ? icons.DANGER : icons.WARNING,
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
        icon: icons.QUEUE_CLIENT_WARNING,
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
        icon: icons.QUEUE_DOWNLOAD_FAILED,
      },
      errorMessage
    );
  }

  if (status === 'downloadClientUnavailable') {
    add({
      key: 'clientUnavailable',
      label: translate('QueueChipClientUnavailable'),
      kind: kinds.WARNING,
      icon: icons.QUEUE_CLIENT_UNAVAILABLE,
    });
  }

  if (!chips.length && status === 'completed') {
    if (trackedDownloadState === 'importPending') {
      add({
        key: 'importPending',
        label: translate('QueueChipWaitingToImport'),
        kind: kinds.PRIMARY,
        icon: icons.PENDING,
      });
    } else if (trackedDownloadState === 'importing') {
      add({
        key: 'importing',
        label: translate('QueueChipImporting'),
        kind: kinds.PRIMARY,
        icon: icons.QUEUE_IMPORTING,
      });
    } else if (trackedDownloadState === 'downloadFailedPending') {
      add({
        key: 'failedPending',
        label: translate('QueueChipWaitingToProcess'),
        kind: kinds.DANGER,
        icon: icons.QUEUE_WAITING_TO_PROCESS,
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
