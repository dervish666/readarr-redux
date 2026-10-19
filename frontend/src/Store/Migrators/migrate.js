import migrateAuthorSortKey from './migrateAuthorSortKey';

export default function migrate(persistedState) {
  migrateAuthorSortKey(persistedState);
}
