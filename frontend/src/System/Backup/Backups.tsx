import React, { useCallback, useEffect, useState } from 'react';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import PageToolbar from 'Components/Page/Toolbar/PageToolbar';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSection from 'Components/Page/Toolbar/PageToolbarSection';
import Column from 'Components/Table/Column';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import BackupRow from './BackupRow';
import RestoreBackupModal from './RestoreBackupModal';
import useBackups from './useBackups';

const columns: Column[] = [
  {
    name: 'type',
    label: '',
    isVisible: true,
  },
  {
    name: 'name',
    label: () => translate('Name'),
    isVisible: true,
  },
  {
    name: 'size',
    label: () => translate('Size'),
    isVisible: true,
  },
  {
    name: 'time',
    label: () => translate('Time'),
    isVisible: true,
  },
  {
    name: 'actions',
    label: '',
    isVisible: true,
  },
];

function Backups() {
  const { data: items, isLoading, isFetched, error, refetch } = useBackups();

  const isBackupExecuting: boolean = useCommandExecuting(commandNames.BACKUP);
  const executeCommand = useExecuteCommand();
  const wasBackupExecuting = usePrevious(isBackupExecuting);

  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const hasBackups = isFetched && !error && !!items.length;
  const noBackups = isFetched && !error && !items.length;

  const handleBackupPress = useCallback(() => {
    executeCommand({ name: commandNames.BACKUP });
  }, [executeCommand]);

  const handleRestorePress = useCallback(() => {
    setIsRestoreModalOpen(true);
  }, []);

  const handleRestoreModalClose = useCallback(() => {
    setIsRestoreModalOpen(false);
  }, []);

  useEffect(() => {
    if (wasBackupExecuting && !isBackupExecuting) {
      refetch();
    }
  }, [isBackupExecuting, wasBackupExecuting, refetch]);

  return (
    <PageContent title={translate('Backups')}>
      <PageToolbar>
        <PageToolbarSection>
          <PageToolbarButton
            label={translate('BackupNow')}
            iconName={icons.BACKUP}
            isSpinning={isBackupExecuting}
            onPress={handleBackupPress}
          />

          <PageToolbarButton
            label={translate('RestoreBackup')}
            iconName={icons.RESTORE}
            onPress={handleRestorePress}
          />
        </PageToolbarSection>
      </PageToolbar>

      <PageContentBody>
        <PageHeading scope={translate('System')} title={translate('Backups')} />

        {isLoading ? <LoadingIndicator /> : null}

        {!isLoading && error ? (
          <Alert kind={kinds.DANGER}>{translate('UnableToLoadBackups')}</Alert>
        ) : null}

        {noBackups ? (
          <Alert kind={kinds.INFO}>{translate('NoBackupsAreAvailable')}</Alert>
        ) : null}

        {hasBackups ? (
          <Table columns={columns}>
            <TableBody>
              {items.map((item) => {
                const { id, type, name, path, size, time } = item;

                return (
                  <BackupRow
                    key={id}
                    id={id}
                    type={type}
                    name={name}
                    path={path}
                    size={size}
                    time={time}
                  />
                );
              })}
            </TableBody>
          </Table>
        ) : null}
      </PageContentBody>

      <RestoreBackupModal
        isOpen={isRestoreModalOpen}
        onModalClose={handleRestoreModalClose}
      />
    </PageContent>
  );
}

export default Backups;
