import React from 'react';
import Alert from 'Components/Alert';
import Icon from 'Components/Icon';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import Column from 'Components/Table/Column';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import AuthorHistoryRow from './AuthorHistoryRow';
import useAuthorHistory from './useAuthorHistory';
import styles from './AuthorHistoryTable.module.css';

const columns: Column[] = [
  {
    name: 'eventType',
    label: '',
    isVisible: true,
  },
  {
    name: 'book',
    label: () => translate('Book'),
    isVisible: true,
  },
  {
    name: 'sourceTitle',
    label: () => translate('SourceTitle'),
    isVisible: true,
  },
  {
    name: 'quality',
    label: () => translate('Quality'),
    isVisible: true,
  },
  {
    name: 'customFormats',
    label: () => translate('CustomFormats'),
    isSortable: false,
    isVisible: true,
  },
  {
    name: 'customFormatScore',
    label: React.createElement(Icon, {
      name: icons.SCORE,
      title: () => translate('CustomFormatScore'),
    }),
    isSortable: true,
    isVisible: true,
  },
  {
    name: 'date',
    label: () => translate('Date'),
    isVisible: true,
  },
  {
    name: 'actions',
    label: '',
    isVisible: true,
  },
];

interface AuthorHistoryTableProps {
  authorId: number;
  bookId?: number;
}

// The History tab of the author page and (with bookId) the book page.
function AuthorHistoryTable({ authorId, bookId }: AuthorHistoryTableProps) {
  const { data, isFetching, isFetched, error } = useAuthorHistory(
    authorId,
    bookId
  );

  const hasItems = data.length > 0;

  return (
    <div className={styles.container}>
      {isFetching && !isFetched ? <LoadingIndicator /> : null}

      {!isFetching && error ? (
        <Alert kind={kinds.DANGER}>{translate('UnableToLoadHistory')}</Alert>
      ) : null}

      {isFetched && !hasItems && !error ? (
        <div className={styles.blankpad}>{translate('NoHistory')}</div>
      ) : null}

      {isFetched && hasItems && !error ? (
        <Table columns={columns}>
          <TableBody>
            {data.map((item) => {
              return <AuthorHistoryRow key={item.id} item={item} />;
            })}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}

export default AuthorHistoryTable;
