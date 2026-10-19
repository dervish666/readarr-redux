import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { createSelector } from 'reselect';
import useTranslations from 'App/useTranslations';
import useAuthors from 'Author/useAuthors';
import useCommands from 'Commands/useCommands';
import useCustomFilters from 'Filters/useCustomFilters';
import useIndexerFlags from 'Settings/Indexers/useIndexerFlags';
import { useMetadataProfiles } from 'Settings/Profiles/Metadata/useMetadataProfiles';
import { useQualityProfiles } from 'Settings/Profiles/Quality/useQualityProfiles';
import { useUiSettings } from 'Settings/UI/useUiSettings';
import { saveDimensions, setIsSidebarVisible } from 'Store/Actions/appActions';
import { fetchUISettings } from 'Store/Actions/settingsActions';
import { fetchStatus } from 'Store/Actions/systemActions';
import useTags from 'Tags/useTags';
import ErrorPage from './ErrorPage';
import LoadingPage from './LoadingPage';
import Page from './Page';

// Only the redux sections the startup gate reads.
interface SectionState {
  isPopulated: boolean;
  error: object | null;
}

interface PageState {
  app: {
    isSidebarVisible: boolean;
    version: string;
    isUpdated: boolean;
    isDisconnected: boolean;
    dimensions: { isSmallScreen: boolean };
  };
  settings: {
    ui: SectionState;
  };
  system: {
    status: SectionState & {
      item: { authentication?: string; authenticationNoneConfirmed?: boolean };
    };
  };
}

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

const selectReduxPopulated = (state: PageState) =>
  state.settings.ui.isPopulated && state.system.status.isPopulated;

const selectReduxErrors = createSelector(
  (state: PageState) => state.settings.ui.error,
  (state: PageState) => state.system.status.error,
  (uiSettingsError, systemStatusError) => ({
    uiSettingsError,
    systemStatusError,
  })
);

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
  const dispatch = useDispatch();
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

  const isReduxPopulated = useSelector(selectReduxPopulated);
  const errors = useSelector(selectReduxErrors);

  const { isSidebarVisible, version, isUpdated, isDisconnected } = useSelector(
    (state: PageState) => state.app
  );
  const isSmallScreen = useSelector(
    (state: PageState) => state.app.dimensions.isSmallScreen
  );

  // UI settings: react-query for the pages and the theme, plus the redux
  // state.settings.ui feed (fetched below) for RelativeDateCellConnector.
  const uiSettingsQuery = useUiSettings();
  const { data: uiSettings, isFetched: isUiSettingsFetched } = uiSettingsQuery;
  const uiSettingsQueryError = startupError(uiSettingsQuery);
  const enableColorImpairedMode = !!uiSettings.enableColorImpairedMode;
  const authenticationEnabled = useSelector((state: PageState) => {
    const status = state.system.status.item;

    return (
      status.authentication !== 'none' || !!status.authenticationNoneConfirmed
    );
  });

  const isPopulated =
    isReduxPopulated &&
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
    !!uiSettingsQueryError ||
    Object.values(queryErrors).some((error) => !!error) ||
    Object.values(errors).some((error) => !!error);

  useEffect(() => {
    dispatch(fetchUISettings());
    dispatch(fetchStatus());
  }, [dispatch]);

  const handleResize = useCallback(
    (dimensions: { width: number; height: number }) => {
      dispatch(saveDimensions(dimensions));
    },
    [dispatch]
  );

  const handleSidebarVisibleChange = useCallback(
    (visible: boolean) => {
      dispatch(setIsSidebarVisible({ isSidebarVisible: visible }));
    },
    [dispatch]
  );

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
        {...errors}
        uiSettingsError={errors.uiSettingsError ?? uiSettingsQueryError}
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
