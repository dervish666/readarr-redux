import { NewItemMonitorType } from 'Author/Author';
import { createOptionsStore } from 'Helpers/Hooks/useOptionsStore';

// The add author and add book forms remember their last choices apart, as the redux
// search slice did (authorDefaults, bookDefaults). Persisted as
// <instance>_add_author_options and <instance>_add_book_options; the old redux
// defaults are not carried over. The search checkboxes are not remembered.

// 'specificBook' (only this book) is offered by the add book form alone.
export type AddNewMonitor =
  | 'all'
  | 'future'
  | 'missing'
  | 'existing'
  | 'first'
  | 'latest'
  | 'none'
  | 'specificBook';

export interface AddNewOptions {
  rootFolderPath: string;
  monitor: AddNewMonitor;
  monitorNewItems: NewItemMonitorType;
  qualityProfileId: number;
  metadataProfileId: number;
  tags: number[];
}

const getDefaults = (): AddNewOptions => ({
  rootFolderPath: '',
  monitor: 'all',
  monitorNewItems: 'all',
  qualityProfileId: 0,
  metadataProfileId: 0,
  tags: [],
});

export const addAuthorOptions = createOptionsStore<AddNewOptions>(
  'add_author_options',
  getDefaults
);

export const addBookOptions = createOptionsStore<AddNewOptions>(
  'add_book_options',
  getDefaults
);
