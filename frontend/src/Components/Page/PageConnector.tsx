import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { createSelector } from 'reselect';
import useTranslations from 'App/useTranslations';
import useCommands from 'Commands/useCommands';
import useIndexerFlags from 'Settings/Indexers/useIndexerFlags';
import { saveDimensions, setIsSidebarVisible } from 'Store/Actions/appActions';
import { fetchAuthor } from 'Store/Actions/authorActions';
import { fetchBooks } from 'Store/Actions/bookActions';
import { fetchCommands } from 'Store/Actions/commandActions';
import { fetchCustomFilters } from 'Store/Actions/customFilterActions';
import {
  fetchLanguages,
  fetchMetadataProfiles,
  fetchQualityProfiles,
  fetchUISettings,
} from 'Store/Actions/settingsActions';
import { fetchStatus } from 'Store/Actions/systemActions';
import { fetchTags } from 'Store/Actions/tagActions';
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
  authors: SectionState;
  customFilters: SectionState;
  tags: SectionState;
  settings: {
    ui: SectionState & { item: { enableColorImpairedMode?: boolean } };
    languages: SectionState;
    qualityProfiles: SectionState;
    metadataProfiles: SectionState;
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
  state.authors.isPopulated &&
  state.customFilters.isPopulated &&
  state.tags.isPopulated &&
  state.settings.ui.isPopulated &&
  state.settings.languages.isPopulated &&
  state.settings.qualityProfiles.isPopulated &&
  state.settings.metadataProfiles.isPopulated &&
  state.system.status.isPopulated;

const selectReduxErrors = createSelector(
  (state: PageState) => state.authors.error,
  (state: PageState) => state.customFilters.error,
  (state: PageState) => state.tags.error,
  (state: PageState) => state.settings.ui.error,
  (state: PageState) => state.settings.languages.error,
  (state: PageState) => state.settings.qualityProfiles.error,
  (state: PageState) => state.settings.metadataProfiles.error,
  (state: PageState) => state.system.status.error,
  (
    authorError,
    customFiltersError,
    tagsError,
    uiSettingsError,
    languagesError,
    qualityProfilesError,
    metadataProfilesError,
    systemStatusError
  ) => ({
    authorError,
    customFiltersError,
    tagsError,
    uiSettingsError,
    languagesError,
    qualityProfilesError,
    metadataProfilesError,
    systemStatusError,
  })
);

interface PageConnectorProps {
  children: ReactNode;
}

function PageConnector({ children }: PageConnectorProps) {
  const dispatch = useDispatch();
  const location = useLocation();
  const [isLocalStorageSupported] = useState(testLocalStorage);

  const { isFetched: isTranslationsFetched, error: translationsError } =
    useTranslations();

  // Primes the react-query command list for every page, as Sonarr's useAppPage does.
  useCommands();

  // Indexer flags label releases and files on every page; load them before any page.
  const { isFetched: isIndexerFlagsFetched, error: indexerFlagsError } =
    useIndexerFlags();

  const isReduxPopulated = useSelector(selectReduxPopulated);
  const errors = useSelector(selectReduxErrors);

  const { isSidebarVisible, version, isUpdated, isDisconnected } = useSelector(
    (state: PageState) => state.app
  );
  const isSmallScreen = useSelector(
    (state: PageState) => state.app.dimensions.isSmallScreen
  );
  const enableColorImpairedMode = useSelector(
    (state: PageState) => !!state.settings.ui.item.enableColorImpairedMode
  );
  const authenticationEnabled = useSelector((state: PageState) => {
    const status = state.system.status.item;

    return (
      status.authentication !== 'none' || !!status.authenticationNoneConfirmed
    );
  });

  const isPopulated =
    isReduxPopulated && isTranslationsFetched && isIndexerFlagsFetched;
  const hasError =
    !!translationsError ||
    !!indexerFlagsError ||
    Object.values(errors).some((error) => !!error);

  useEffect(() => {
    dispatch(fetchAuthor());
    dispatch(fetchBooks());
    dispatch(fetchCustomFilters());
    dispatch(fetchTags());
    dispatch(fetchLanguages());
    dispatch(fetchQualityProfiles());
    dispatch(fetchMetadataProfiles());
    dispatch(fetchUISettings());
    dispatch(fetchStatus());
    // Redux command feed for the pages not yet on react-query.
    dispatch(fetchCommands());
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
        {...errors}
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
