import PropTypes from 'prop-types';
import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import Blocklist from 'Activity/Blocklist/Blocklist';
import History from 'Activity/History/History';
import Queue from 'Activity/Queue/Queue';
import AuthorDetailsPage from 'Author/Details/AuthorDetailsPage';
import AuthorIndex from 'Author/Index/AuthorIndex';
import BookDetailsPage from 'Book/Details/BookDetailsPage';
import BookIndex from 'Book/Index/BookIndex';
import Bookshelf from 'Bookshelf/Bookshelf';
import CalendarPage from 'Calendar/CalendarPage';
import NotFound from 'Components/NotFound';
import Switch from 'Components/Router/Switch';
import AddNewItem from 'Search/AddNewItem';
import CustomFormatSettingsPage from 'Settings/CustomFormats/CustomFormatSettingsPage';
import DevelopmentSettings from 'Settings/Development/DevelopmentSettings';
import DownloadClientSettings from 'Settings/DownloadClients/DownloadClientSettings';
import GeneralSettings from 'Settings/General/GeneralSettings';
import ImportListSettings from 'Settings/ImportLists/ImportListSettings';
import IndexerSettings from 'Settings/Indexers/IndexerSettings';
import MediaManagement from 'Settings/MediaManagement/MediaManagement';
import MetadataSettings from 'Settings/Metadata/MetadataSettings';
import MetadataSourceSettings from 'Settings/MetadataSource/MetadataSourceSettings';
import NotificationSettings from 'Settings/Notifications/NotificationSettings';
import Profiles from 'Settings/Profiles/Profiles';
import Quality from 'Settings/Quality/Quality';
import Settings from 'Settings/Settings';
import TagSettings from 'Settings/Tags/TagSettings';
import UISettings from 'Settings/UI/UISettings';
import Backups from 'System/Backup/Backups';
import LogsTable from 'System/Events/LogsTable';
import Logs from 'System/Logs/Logs';
import Status from 'System/Status/Status';
import Tasks from 'System/Tasks/Tasks';
import Updates from 'System/Updates/Updates';
import UnmappedFiles from 'UnmappedFiles/UnmappedFiles';
import getPathWithUrlBase from 'Utilities/getPathWithUrlBase';
import CutoffUnmet from 'Wanted/CutoffUnmet/CutoffUnmet';
import Missing from 'Wanted/Missing/Missing';

function AppRoutes(props) {
  const {
    app
  } = props;

  return (
    <Switch>
      {/*
        Author
      */}

      <Route
        exact={true}
        path="/"
        component={AuthorIndex}
      />

      {
        window.Readarr.urlBase &&
          <Route
            exact={true}
            path="/"
            addUrlBase={false}
            render={() => {
              return (
                <Redirect
                  to={getPathWithUrlBase('/')}
                  component={app}
                />
              );
            }}
          />
      }

      <Route
        path="/authors"
        component={AuthorIndex}
      />

      <Route
        path="/add/search"
        component={AddNewItem}
      />

      <Route
        exact={true}
        path="/shelf"
        component={Bookshelf}
      />

      <Route
        exact={true}
        path="/books"
        component={BookIndex}
      />

      <Route
        path="/unmapped"
        component={UnmappedFiles}
      />

      <Route
        path="/author/:titleSlug"
        component={AuthorDetailsPage}
      />

      <Route
        path="/book/:titleSlug"
        component={BookDetailsPage}
      />

      {/*
        Calendar
      */}

      <Route
        path="/calendar"
        component={CalendarPage}
      />

      {/*
        Activity
      */}

      <Route
        path="/activity/history"
        component={History}
      />

      <Route
        path="/activity/queue"
        component={Queue}
      />

      <Route
        path="/activity/blocklist"
        component={Blocklist}
      />

      {/*
        Wanted
      */}

      <Route
        path="/wanted/missing"
        component={Missing}
      />

      <Route
        path="/wanted/cutoffunmet"
        component={CutoffUnmet}
      />

      {/*
        Settings
      */}

      <Route
        exact={true}
        path="/settings"
        component={Settings}
      />

      <Route
        path="/settings/mediamanagement"
        component={MediaManagement}
      />

      <Route
        path="/settings/profiles"
        component={Profiles}
      />

      <Route
        path="/settings/quality"
        component={Quality}
      />

      <Route
        path="/settings/customformats"
        component={CustomFormatSettingsPage}
      />

      <Route
        path="/settings/indexers"
        component={IndexerSettings}
      />

      <Route
        path="/settings/downloadclients"
        component={DownloadClientSettings}
      />

      <Route
        path="/settings/importlists"
        component={ImportListSettings}
      />

      <Route
        path="/settings/connect"
        component={NotificationSettings}
      />

      <Route
        path="/settings/metadata"
        component={MetadataSettings}
      />

      <Route
        path="/settings/metadatasource"
        component={MetadataSourceSettings}
      />

      <Route
        path="/settings/tags"
        component={TagSettings}
      />

      <Route
        path="/settings/general"
        component={GeneralSettings}
      />

      <Route
        path="/settings/ui"
        component={UISettings}
      />

      <Route
        path="/settings/development"
        component={DevelopmentSettings}
      />

      {/*
        System
      */}

      <Route
        path="/system/status"
        component={Status}
      />

      <Route
        path="/system/tasks"
        component={Tasks}
      />

      <Route
        path="/system/backup"
        component={Backups}
      />

      <Route
        path="/system/updates"
        component={Updates}
      />

      <Route
        path="/system/events"
        component={LogsTable}
      />

      <Route
        path="/system/logs/files"
        component={Logs}
      />

      {/*
        Not Found
      */}

      <Route
        path="*"
        component={NotFound}
      />

    </Switch>
  );
}

AppRoutes.propTypes = {
  app: PropTypes.func.isRequired
};

export default AppRoutes;
