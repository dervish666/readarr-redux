import * as app from './appActions';
import * as author from './authorActions';
import * as authorIndex from './authorIndexActions';
import * as books from './bookActions';
import * as bookFiles from './bookFileActions';
import * as bookHistory from './bookHistoryActions';
import * as bookIndex from './bookIndexActions';
import * as bookStudio from './bookshelfActions';
import * as calendar from './calendarActions';
import * as captcha from './captchaActions';
import * as commands from './commandActions';
import * as customFilters from './customFilterActions';
import * as editions from './editionActions';
import * as interactiveImportActions from './interactiveImportActions';
import * as oAuth from './oAuthActions';
import * as organizePreview from './organizePreviewActions';
import * as queue from './queueActions';
import * as releases from './releaseActions';
import * as retagPreview from './retagPreviewActions';
import * as search from './searchActions';
import * as settings from './settingsActions';
import * as system from './systemActions';
import * as tags from './tagActions';
import * as wanted from './wantedActions';

export default [
  app,
  author,
  authorIndex,
  bookFiles,
  bookHistory,
  bookIndex,
  books,
  bookStudio,
  calendar,
  captcha,
  commands,
  customFilters,
  editions,
  interactiveImportActions,
  oAuth,
  organizePreview,
  queue,
  releases,
  retagPreview,
  search,
  settings,
  system,
  tags,
  wanted
];
