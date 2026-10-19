import React, { useCallback, useMemo, useState } from 'react';
import PageSectionContent from 'Components/Page/PageSectionContent';
import AddCard from 'Components/SettingsCard/AddCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.module.css';
import {
  getProviderTestStatus,
  ProviderTestAllResult,
} from 'Settings/ProviderTestAllResult';
import { SelectedSchema } from 'Settings/useProviderSchema';
import translate from 'Utilities/String/translate';
import AddImportListModal from './AddImportListModal';
import EditImportListModal from './EditImportListModal';
import ImportList from './ImportList';
import { useSortedImportLists } from './useImportLists';

interface ImportListsProps {
  testResults?: ProviderTestAllResult[];
}

function ImportLists({ testResults }: ImportListsProps) {
  const { isFetched, data, error } = useSortedImportLists();

  const [isAddImportListModalOpen, setIsAddImportListModalOpen] =
    useState(false);
  const [isEditImportListModalOpen, setIsEditImportListModalOpen] =
    useState(false);
  const [selectedSchema, setSelectedSchema] = useState<
    SelectedSchema | undefined
  >();

  const testResultById = useMemo(
    () => new Map(testResults?.map((result) => [result.id, result])),
    [testResults]
  );

  const handleAddImportListPress = useCallback(() => {
    setIsAddImportListModalOpen(true);
  }, []);

  const handleImportListSelect = useCallback((selected: SelectedSchema) => {
    setSelectedSchema(selected);
    setIsAddImportListModalOpen(false);
    setIsEditImportListModalOpen(true);
  }, []);

  const handleAddImportListModalClose = useCallback(() => {
    setIsAddImportListModalOpen(false);
  }, []);

  const handleEditImportListModalClose = useCallback(() => {
    setSelectedSchema(undefined);
    setIsEditImportListModalOpen(false);
  }, []);

  return (
    <PageSectionContent
      errorMessage={translate('UnableToLoadLists')}
      error={error}
      isFetching={!isFetched}
      isPopulated={isFetched}
    >
      <div className={settingsCardStyles.grid}>
        {data.map((item) => (
          <ImportList
            key={item.id}
            {...item}
            testStatus={
              testResults
                ? getProviderTestStatus(testResultById.get(item.id))
                : undefined
            }
          />
        ))}

        <AddCard
          label={translate('AddImportList')}
          onPress={handleAddImportListPress}
        />
      </div>

      <AddImportListModal
        isOpen={isAddImportListModalOpen}
        onImportListSelect={handleImportListSelect}
        onModalClose={handleAddImportListModalClose}
      />

      <EditImportListModal
        isOpen={isEditImportListModalOpen}
        selectedSchema={selectedSchema}
        onModalClose={handleEditImportListModalClose}
      />
    </PageSectionContent>
  );
}

export default ImportLists;
