import * as app from './appActions';
import * as author from './authorActions';
import * as authorIndex from './authorIndexActions';
import * as books from './bookActions';
import * as bookFiles from './bookFileActions';
import * as bookHistory from './bookHistoryActions';
import * as bookIndex from './bookIndexActions';
import * as captcha from './captchaActions';
import * as commands from './commandActions';
import * as customFilters from './customFilterActions';
import * as oAuth from './oAuthActions';
import * as settings from './settingsActions';
import * as system from './systemActions';
import * as tags from './tagActions';

export default [
  app,
  author,
  authorIndex,
  bookFiles,
  bookHistory,
  bookIndex,
  books,
  captcha,
  commands,
  customFilters,
  oAuth,
  settings,
  system,
  tags
];
