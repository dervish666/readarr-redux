import React, { useCallback } from 'react';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import { kinds } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import translate from 'Utilities/String/translate';
import InteractiveSearchPayload from './InteractiveSearchPayload';
import InteractiveSearchRow from './InteractiveSearchRow';
import { useReleaseOptions } from './releaseOptionsStore';
import useReleases, { setReleaseSort } from './useReleases';
import styles from './InteractiveSearch.css';

interface InteractiveSearchProps {
  searchPayload: InteractiveSearchPayload;
}

// The release list of the author and book Search tabs and the book search modal.
// The filter menu sits in the page's tab bar (InteractiveSearchFilterMenu).
function InteractiveSearch({ searchPayload }: InteractiveSearchProps) {
  const { columns } = useReleaseOptions();

  const {
    data,
    totalItems,
    isFetching,
    isFetched,
    error,
    sortKey,
    sortDirection,
  } = useReleases(searchPayload);

  const handleSortPress = useCallback(
    (sortKey: string, sortDirection?: SortDirection) => {
      setReleaseSort(sortKey, sortDirection);
    },
    []
  );

  return (
    <div>
      {isFetching ? <LoadingIndicator /> : null}

      {!isFetching && error ? (
        <Alert kind={kinds.DANGER}>
          {translate('InteractiveSearchResultsLoadError')}
        </Alert>
      ) : null}

      {!isFetching && isFetched && !error && !totalItems ? (
        <Alert kind={kinds.INFO}>{translate('NoResultsFound')}</Alert>
      ) : null}

      {!isFetching && !!totalItems && !data.length ? (
        <Alert kind={kinds.WARNING}>
          {translate('AllResultsAreHiddenByTheAppliedFilter')}
        </Alert>
      ) : null}

      {!isFetching && !!data.length ? (
        <div className={styles.container}>
          <div className={styles.table}>
            <Table
              columns={columns}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSortPress={handleSortPress}
            >
              <TableBody>
                {data.map((item) => {
                  return (
                    <InteractiveSearchRow
                      key={`${item.indexerId}-${item.guid}`}
                      release={item}
                      searchPayload={searchPayload}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      {!isFetching && totalItems !== data.length && !!data.length ? (
        <div className={styles.filteredMessage}>
          {translate('SomeResultsAreHiddenByTheAppliedFilter')}
        </div>
      ) : null}
    </div>
  );
}

export default InteractiveSearch;
