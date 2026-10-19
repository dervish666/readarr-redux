import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import PageToolbarButton from 'Components/Page/Toolbar/PageToolbarButton';
import PageToolbarSeparator from 'Components/Page/Toolbar/PageToolbarSeparator';
import SectionHeading from 'Components/SectionHeading';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { icons } from 'Helpers/Props';
import SettingsToolbarConnector from 'Settings/SettingsToolbarConnector';
import translate from 'Utilities/String/translate';
import QualityDefinitions from './Definition/QualityDefinitions';
import { useManageQualityDefinitions } from './Definition/useQualityDefinitions';
import ResetQualityDefinitionsModal from './Reset/ResetQualityDefinitionsModal';

function Quality() {
  const queryClient = useQueryClient();
  const executeCommand = useExecuteCommand();
  const isResettingQualityDefinitions = useCommandExecuting(
    commandNames.RESET_QUALITY_DEFINITIONS
  );
  const wasResettingQualityDefinitions = usePrevious(
    isResettingQualityDefinitions
  );

  const {
    items,
    isFetched,
    error,
    isSaving,
    hasPendingChanges,
    updateDefinition,
    saveQualityDefinitions,
  } = useManageQualityDefinitions();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleResetPress = useCallback(() => {
    setIsResetModalOpen(true);
  }, []);

  const handleResetModalClose = useCallback(() => {
    setIsResetModalOpen(false);
  }, []);

  const handleResetQualityDefinitions = useCallback(
    (resetTitles: boolean) => {
      executeCommand({
        name: commandNames.RESET_QUALITY_DEFINITIONS,
        resetTitles,
      });

      setIsResetModalOpen(false);
    },
    [executeCommand]
  );

  // The reset rewrites the definitions on the server; fetch them once it finishes,
  // whichever tab started it.
  useEffect(() => {
    if (wasResettingQualityDefinitions && !isResettingQualityDefinitions) {
      queryClient.invalidateQueries({ queryKey: ['/qualitydefinition'] });
    }
  }, [
    isResettingQualityDefinitions,
    wasResettingQualityDefinitions,
    queryClient,
  ]);

  return (
    <PageContent title={translate('QualitySettings')}>
      <SettingsToolbarConnector
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        additionalButtons={
          <>
            <PageToolbarSeparator />

            <PageToolbarButton
              label={translate('ResetDefinitions')}
              iconName={icons.REFRESH}
              isSpinning={isResettingQualityDefinitions}
              onPress={handleResetPress}
            />
          </>
        }
        onSavePress={saveQualityDefinitions}
      />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('Quality')}
        />

        <SectionHeading
          title={translate('QualityDefinitions')}
          description={translate('QualityDefinitionsSectionDescription')}
        />

        <QualityDefinitions
          items={items}
          isFetched={isFetched}
          error={error}
          updateDefinition={updateDefinition}
        />
      </PageContentBody>

      <ResetQualityDefinitionsModal
        isOpen={isResetModalOpen}
        isResettingQualityDefinitions={isResettingQualityDefinitions}
        onResetQualityDefinitions={handleResetQualityDefinitions}
        onModalClose={handleResetModalClose}
      />
    </PageContent>
  );
}

export default Quality;
