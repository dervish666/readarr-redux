import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting, useExecuteCommand } from 'Commands/useCommands';
import Alert from 'Components/Alert';
import Form from 'Components/Form/Form';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { kinds } from 'Helpers/Props';
import { useShowAdvancedSettings } from 'Settings/advancedSettingsStore';
import SettingsToolbar from 'Settings/SettingsToolbar';
import { restart } from 'Store/Actions/systemActions';
import { useSystemStatusData } from 'System/Status/useSystemStatus';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import AnalyticSettings from './AnalyticSettings';
import BackupSettings from './BackupSettings';
import HostSettings from './HostSettings';
import LoggingSettings from './LoggingSettings';
import ProxySettings from './ProxySettings';
import SecuritySettings from './SecuritySettings';
import UpdateSettings from './UpdateSettings';
import {
  GeneralSettingsModel,
  useManageGeneralSettings,
} from './useGeneralSettings';

const requiresRestartKeys: (keyof GeneralSettingsModel)[] = [
  'bindAddress',
  'port',
  'urlBase',
  'enableSsl',
  'sslPort',
  'sslCertPath',
  'sslCertPassword',
];

function GeneralSettings() {
  const dispatch = useDispatch();
  const advancedSettings = useShowAdvancedSettings();
  const { isWindows, mode, packageUpdateMechanism } = useSystemStatusData();
  const isWindowsService = isWindows && mode === 'service';

  const executeCommand = useExecuteCommand();
  const isResettingApiKey = useCommandExecuting(commandNames.RESET_API_KEY);
  const wasResettingApiKey = usePrevious(isResettingApiKey);

  const {
    settings,
    hasSettings,
    hasPendingChanges,
    validationErrors,
    validationWarnings,
    pendingChanges,
    isFetching,
    isFetched,
    isSaving,
    error,
    saveError,
    refetch,
    updateSetting,
    saveSettings,
  } = useManageGeneralSettings();

  const wasSaving = usePrevious(isSaving);
  const isRestartRequired = useRef(false);
  const [isRestartRequiredModalOpen, setIsRestartRequiredModalOpen] =
    useState(false);

  const handleInputChange = useCallback(
    ({ name, value }: InputChanged) => {
      updateSetting(
        name as keyof GeneralSettingsModel,
        value as GeneralSettingsModel[keyof GeneralSettingsModel]
      );
    },
    [updateSetting]
  );

  const handleSavePress = useCallback(() => {
    // Only a value that really changed asks for a restart.
    isRestartRequired.current = requiresRestartKeys.some((key) =>
      Object.prototype.hasOwnProperty.call(pendingChanges, key)
    );

    saveSettings();
  }, [pendingChanges, saveSettings]);

  const handleConfirmResetApiKey = useCallback(() => {
    executeCommand({ name: commandNames.RESET_API_KEY });
  }, [executeCommand]);

  const handleConfirmRestart = useCallback(() => {
    setIsRestartRequiredModalOpen(false);
    dispatch(restart());
  }, [dispatch]);

  const handleCloseRestartRequiredModal = useCallback(() => {
    setIsRestartRequiredModalOpen(false);
  }, []);

  useEffect(() => {
    if (!isSaving && wasSaving) {
      if (!saveError && isRestartRequired.current) {
        setIsRestartRequiredModalOpen(true);
      }

      isRestartRequired.current = false;
    }
  }, [isSaving, wasSaving, saveError]);

  // A new API key needs a restart; load it and offer one.
  useEffect(() => {
    if (!isResettingApiKey && wasResettingApiKey) {
      refetch();
      setIsRestartRequiredModalOpen(true);
    }
  }, [isResettingApiKey, wasResettingApiKey, refetch]);

  return (
    <PageContent title={translate('GeneralSettings')}>
      <SettingsToolbar
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        onSavePress={handleSavePress}
      />

      <PageContentBody>
        <PageHeading
          scope={translate('Settings')}
          title={translate('General')}
        />

        {isFetching && !isFetched ? <LoadingIndicator /> : null}

        {!isFetching && error ? (
          <Alert kind={kinds.DANGER}>
            {translate('UnableToLoadGeneralSettings')}
          </Alert>
        ) : null}

        {hasSettings && isFetched && !error ? (
          <Form
            validationErrors={validationErrors}
            validationWarnings={validationWarnings}
          >
            <HostSettings
              advancedSettings={advancedSettings}
              settings={settings}
              isWindows={isWindows}
              mode={mode}
              onInputChange={handleInputChange}
            />

            <SecuritySettings
              settings={settings}
              isResettingApiKey={isResettingApiKey}
              onInputChange={handleInputChange}
              onConfirmResetApiKey={handleConfirmResetApiKey}
            />

            <ProxySettings
              settings={settings}
              onInputChange={handleInputChange}
            />

            <LoggingSettings
              settings={settings}
              onInputChange={handleInputChange}
            />

            <AnalyticSettings
              settings={settings}
              onInputChange={handleInputChange}
            />

            <UpdateSettings
              advancedSettings={advancedSettings}
              settings={settings}
              packageUpdateMechanism={packageUpdateMechanism}
              onInputChange={handleInputChange}
            />

            <BackupSettings
              advancedSettings={advancedSettings}
              settings={settings}
              onInputChange={handleInputChange}
            />
          </Form>
        ) : null}
      </PageContentBody>

      <ConfirmModal
        isOpen={isRestartRequiredModalOpen}
        kind={kinds.DANGER}
        title={translate('RestartReadarr')}
        message={`Readarr requires a restart to apply changes, do you want to restart now? ${
          isWindowsService
            ? 'Depending which user is running the Readarr service you may need to restart Readarr as admin once before the service will start automatically.'
            : ''
        }`}
        cancelLabel={translate('IllRestartLater')}
        confirmLabel={translate('RestartNow')}
        onConfirm={handleConfirmRestart}
        onCancel={handleCloseRestartRequiredModal}
      />
    </PageContent>
  );
}

export default GeneralSettings;
