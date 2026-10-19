import React, { useCallback, useMemo, useState } from 'react';
import PageSectionContent from 'Components/Page/PageSectionContent';
import AddCard from 'Components/SettingsCard/AddCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import {
  getProviderTestStatus,
  ProviderTestAllResult,
} from 'Settings/ProviderTestAllResult';
import { SelectedSchema } from 'Settings/useProviderSchema';
import translate from 'Utilities/String/translate';
import AddDownloadClientModal from './AddDownloadClientModal';
import DownloadClient from './DownloadClient';
import EditDownloadClientModal from './EditDownloadClientModal';
import { useSortedDownloadClients } from './useDownloadClients';

interface DownloadClientsProps {
  testResults?: ProviderTestAllResult[];
}

function DownloadClients({ testResults }: DownloadClientsProps) {
  const { isFetched, data, error } = useSortedDownloadClients();

  const [isAddDownloadClientModalOpen, setIsAddDownloadClientModalOpen] =
    useState(false);
  const [isEditDownloadClientModalOpen, setIsEditDownloadClientModalOpen] =
    useState(false);
  const [selectedSchema, setSelectedSchema] = useState<
    SelectedSchema | undefined
  >();

  const testResultById = useMemo(
    () => new Map(testResults?.map((result) => [result.id, result])),
    [testResults]
  );

  const handleAddDownloadClientPress = useCallback(() => {
    setIsAddDownloadClientModalOpen(true);
  }, []);

  const handleDownloadClientSelect = useCallback((selected: SelectedSchema) => {
    setSelectedSchema(selected);
    setIsAddDownloadClientModalOpen(false);
    setIsEditDownloadClientModalOpen(true);
  }, []);

  const handleAddDownloadClientModalClose = useCallback(() => {
    setIsAddDownloadClientModalOpen(false);
  }, []);

  const handleEditDownloadClientModalClose = useCallback(() => {
    setSelectedSchema(undefined);
    setIsEditDownloadClientModalOpen(false);
  }, []);

  return (
    <PageSectionContent
      errorMessage={translate('UnableToLoadDownloadClients')}
      error={error}
      isFetching={!isFetched}
      isPopulated={isFetched}
    >
      <div className={settingsCardStyles.grid}>
        {data.map((item) => {
          return (
            <DownloadClient
              key={item.id}
              {...item}
              testStatus={
                testResults
                  ? getProviderTestStatus(testResultById.get(item.id))
                  : undefined
              }
            />
          );
        })}

        <AddCard
          label={translate('AddDownloadClient')}
          onPress={handleAddDownloadClientPress}
        />
      </div>

      <AddDownloadClientModal
        isOpen={isAddDownloadClientModalOpen}
        onDownloadClientSelect={handleDownloadClientSelect}
        onModalClose={handleAddDownloadClientModalClose}
      />

      <EditDownloadClientModal
        isOpen={isEditDownloadClientModalOpen}
        selectedSchema={selectedSchema}
        onModalClose={handleEditDownloadClientModalClose}
      />
    </PageSectionContent>
  );
}

export default DownloadClients;
