import React, { useCallback, useEffect } from 'react';
import { useAppValue } from 'App/appStore';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import InlineMarkdown from 'Components/Markdown/InlineMarkdown';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { kinds } from 'Helpers/Props';
import UpdateChanges from 'System/Updates/UpdateChanges';
import useUpdates from 'System/Updates/useUpdates';
import Update from 'typings/Update';
import translate from 'Utilities/String/translate';
import styles from './AppUpdatedModalContent.css';

function mergeUpdates(
  items: ReadonlyArray<Update>,
  version: string,
  prevVersion?: string
) {
  let installedIndex = items.findIndex((u) => u.version === version);
  let installedPreviouslyIndex = items.findIndex(
    (u) => u.version === prevVersion
  );

  if (installedIndex === -1) {
    installedIndex = 0;
  }

  if (installedPreviouslyIndex === -1) {
    installedPreviouslyIndex = items.length;
  } else if (installedPreviouslyIndex === installedIndex && items.length) {
    installedPreviouslyIndex += 1;
  }

  const appliedUpdates = items.slice(installedIndex, installedPreviouslyIndex);

  if (!appliedUpdates.length) {
    return null;
  }

  const appliedChanges: { new: string[]; fixed: string[] } = {
    new: [],
    fixed: [],
  };

  appliedUpdates.forEach((u) => {
    if (u.changes) {
      appliedChanges.new.push(...u.changes.new);
      appliedChanges.fixed.push(...u.changes.fixed);
    }
  });

  const mergedUpdate: Update = {
    ...appliedUpdates[0],
    changes:
      appliedChanges.new.length || appliedChanges.fixed.length
        ? appliedChanges
        : null,
  };

  return mergedUpdate;
}

interface AppUpdatedModalContentProps {
  onModalClose: () => void;
}

function AppUpdatedModalContent({ onModalClose }: AppUpdatedModalContentProps) {
  const version = useAppValue('version');
  const prevVersion = useAppValue('prevVersion');
  const { isFetched, error, data, refetch } = useUpdates();
  const previousVersion = usePrevious(version);

  const update = mergeUpdates(data, version, prevVersion);

  const handleSeeChangesPress = useCallback(() => {
    window.location.href = `${window.Readarr.urlBase}/system/updates`;
  }, []);

  useEffect(() => {
    if (previousVersion !== undefined && version !== previousVersion) {
      refetch();
    }
  }, [version, previousVersion, refetch]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {translate('AppUpdated', { appName: 'Readarr' })}
      </ModalHeader>

      <ModalBody>
        <div>
          <InlineMarkdown
            data={translate('AppUpdatedVersion', {
              appName: 'Readarr',
              version,
            })}
            blockClassName={styles.version}
          />
        </div>

        {isFetched && !error && !!update ? (
          <div>
            {update.changes ? (
              <div>
                <div className={styles.changes}>{translate('WhatsNew')}</div>

                <UpdateChanges
                  title={translate('New')}
                  changes={update.changes.new}
                />

                <UpdateChanges
                  title={translate('Fixed')}
                  changes={update.changes.fixed}
                />
              </div>
            ) : (
              <div className={styles.maintenance}>
                {translate('MaintenanceRelease')}
              </div>
            )}
          </div>
        ) : null}

        {!isFetched && !error ? <LoadingIndicator /> : null}
      </ModalBody>

      <ModalFooter>
        <Button onPress={handleSeeChangesPress}>
          {translate('RecentChanges')}
        </Button>

        <Button kind={kinds.PRIMARY} onPress={onModalClose}>
          {translate('Reload')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default AppUpdatedModalContent;
