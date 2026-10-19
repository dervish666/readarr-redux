import React, { ReactNode, useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  saveDimensions,
  setIsSidebarVisible,
  useAppDimension,
  useAppValues,
} from 'App/appStore';
import useTranslations from 'App/useTranslations';
import useAuthors from 'Author/useAuthors';
import useCommands from 'Commands/useCommands';
import useCustomFilters from 'Filters/useCustomFilters';
import useIndexerFlags from 'Settings/Indexers/useIndexerFlags';
import { useMetadataProfiles } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { useQualityProfiles } from 'Settings/Profiles/Quality/useQualityProfiles';
import { useUiSettings } from 'Settings/UI/useUiSettings';
import useSystemStatus from 'System/Status/useSystemStatus';
import useTags from 'Tags/useTags';
import ErrorPage from './ErrorPage';
import LoadingPage from './LoadingPage';
import Page from './Page';

function testLocalStorage() {
  const key = 'readarrTest';

  try {
    localStorage.setItem(key, key);
    localStorage.removeItem(key);

    return true;
  } catch {
    return false;
  }
}

interface PageConnectorProps {
  children: ReactNode;
}

// Only a load that never succeeded takes the whole UI down. A background refetch
// that fails after a good load (a SignalR invalidation during a restart, a blip)
// keeps the last data and the page, as react-query keeps the data.
function startupError(result: { error: unknown; dataUpdatedAt: number }) {
  return result.error && !result.dataUpdatedAt ? (result.error as Error) : null;
}

function PageConnector({ children }: PageConnectorProps) {
  const location = useLocation();
  const [isLocalStorageSupported] = useState(testLocalStorage);

  const translations = useTranslations();
  const { isFetched: isTranslationsFetched } = translations;
  const translationsError = startupError(translations);

  // Primes the react-query command list for every page, as Sonarr's useAppPage does.
  useCommands();

  // Indexer flags label releases and files on every page; load them before any page.
  const indexerFlags = useIndexerFlags();
  const { isFetched: isIndexerFlagsFetched } = indexerFlags;
  const indexerFlagsError = startupError(indexerFlags);

  // The lists every page reads (authors, tags, custom filters, profiles) load before
  // any page renders, as the redux startup fetches did.
  const authors = useAuthors();
  const tags = useTags();
  const customFilters = useCustomFilters();
  const qualityProfiles = useQualityProfiles();
  const metadataProfiles = useMetadataProfiles();

  const { isFetched: isAuthorsFetched } = authors;
  const { isFetched: isTagsFetched } = tags;
  const { isFetched: isCustomFiltersFetched } = customFilters;
  const { isFetched: isQualityProfilesFetched } = qualityProfiles;
  const { isFetched: isMetadataProfilesFetched } = metadataProfiles;

  const authorError = startupError(authors);
  const tagsError = startupError(tags);
  const customFiltersError = startupError(customFilters);
  const qualityProfilesError = startupError(qualityProfiles);
  const metadataProfilesError = startupError(metadataProfiles);

  const queryErrors = {
    authorError,
    tagsError,
    customFiltersError,
    qualityProfilesError,
    metadataProfilesError,
  };

  const { isSidebarVisible, version, isUpdated, isDisconnected } = useAppValues(
    'isSidebarVisible',
    'version',
    'isUpdated',
    'isDisconnected'
  );
  const isSmallScreen = useAppDimension('isSmallScreen');

  const uiSettingsQuery = useUiSettings();
  const { data: uiSettings, isFetched: isUiSettingsFetched } = uiSettingsQuery;
  const uiSettingsError = startupError(uiSettingsQuery);
  const enableColorImpairedMode = !!uiSettings.enableColorImpairedMode;

  // The header menu, keyboard shortcuts and first run modal read the same query.
  const systemStatusQuery = useSystemStatus();
  const { data: systemStatus, isFetched: isSystemStatusFetched } =
    systemStatusQuery;
  const systemStatusError = startupError(systemStatusQuery);
  const authenticationEnabled =
    systemStatus.authentication !== 'none' ||
    !!systemStatus.authenticationNoneConfirmed;

  const isPopulated =
    isSystemStatusFetched &&
    isAuthorsFetched &&
    isTagsFetched &&
    isCustomFiltersFetched &&
    isQualityProfilesFetched &&
    isMetadataProfilesFetched &&
    isTranslationsFetched &&
    isIndexerFlagsFetched &&
    isUiSettingsFetched;
  const hasError =
    !!translationsError ||
    !!indexerFlagsError ||
    !!uiSettingsError ||
    !!systemStatusError ||
    Object.values(queryErrors).some((error) => !!error);

  const handleResize = useCallback(
    (dimensions: { width: number; height: number }) => {
      saveDimensions(dimensions);
    },
    []
  );

  const handleSidebarVisibleChange = useCallback((visible: boolean) => {
    setIsSidebarVisible({ isSidebarVisible: visible });
  }, []);

  const handleSidebarToggle = useCallback(() => {
    handleSidebarVisibleChange(!isSidebarVisible);
  }, [isSidebarVisible, handleSidebarVisibleChange]);

  if (hasError || !isLocalStorageSupported) {
    return (
      <ErrorPage
        version={version}
        isLocalStorageSupported={isLocalStorageSupported}
        translationsError={translationsError ?? undefined}
        indexerFlagsError={indexerFlagsError ?? undefined}
        authorError={authorError ?? undefined}
        tagsError={tagsError ?? undefined}
        customFiltersError={customFiltersError ?? undefined}
        qualityProfilesError={qualityProfilesError ?? undefined}
        metadataProfilesError={metadataProfilesError ?? undefined}
        uiSettingsError={uiSettingsError ?? undefined}
        systemStatusError={systemStatusError ?? undefined}
      />
    );
  }

  if (!isPopulated) {
    return <LoadingPage />;
  }

  return (
    <Page
      location={location}
      isSmallScreen={isSmallScreen}
      isSidebarVisible={isSidebarVisible}
      isUpdated={isUpdated}
      isDisconnected={isDisconnected}
      enableColorImpairedMode={enableColorImpairedMode}
      authenticationEnabled={authenticationEnabled}
      onResize={handleResize}
      onSidebarToggle={handleSidebarToggle}
      onSidebarVisibleChange={handleSidebarVisibleChange}
    >
      {children}
    </Page>
  );
}

export default PageConnector;
