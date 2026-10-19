import classNames from 'classnames';
import React, { useMemo } from 'react';
import { ColorImpairedConsumer } from 'App/ColorImpairedContext';
import DescriptionList from 'Components/DescriptionList/DescriptionList';
import DescriptionListItem from 'Components/DescriptionList/DescriptionListItem';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import useBookIndex from './useBookIndex';
import styles from './BookIndexFooter.css';

// Legend and totals for the books the index currently shows.
function BookIndexFooter() {
  const { data: books } = useBookIndex();

  const totals = useMemo(() => {
    const authorIds = new Set<number>();

    const sums = books.reduce(
      (acc, book) => {
        const {
          bookCount = 0,
          bookFileCount = 0,
          sizeOnDisk = 0,
        } = book.statistics ?? {};

        authorIds.add(book.authorId);
        acc.books += bookCount;
        acc.bookFiles += bookFileCount;
        acc.totalFileSize += sizeOnDisk;

        if (book.monitored) {
          acc.monitored++;
        }

        return acc;
      },
      { books: 0, bookFiles: 0, monitored: 0, totalFileSize: 0 }
    );

    return { ...sums, authors: authorIds.size };
  }, [books]);

  const count = books.length;

  return (
    <ColorImpairedConsumer>
      {(enableColorImpairedMode: boolean) => {
        return (
          <div className={styles.footer}>
            <div>
              <div className={styles.legendItem}>
                <div
                  className={classNames(
                    styles.continuing,
                    enableColorImpairedMode && 'colorImpaired'
                  )}
                />
                <div>{translate('ContinuingAllBooksDownloaded')}</div>
              </div>

              <div className={styles.legendItem}>
                <div
                  className={classNames(
                    styles.ended,
                    enableColorImpairedMode && 'colorImpaired'
                  )}
                />
                <div>{translate('EndedAllBooksDownloaded')}</div>
              </div>

              <div className={styles.legendItem}>
                <div
                  className={classNames(
                    styles.missingMonitored,
                    enableColorImpairedMode && 'colorImpaired'
                  )}
                />
                <div>{translate('MissingBooksAuthorMonitored')}</div>
              </div>

              <div className={styles.legendItem}>
                <div
                  className={classNames(
                    styles.missingUnmonitored,
                    enableColorImpairedMode && 'colorImpaired'
                  )}
                />
                <div>{translate('MissingBooksAuthorNotMonitored')}</div>
              </div>
            </div>

            <div className={styles.statistics}>
              <DescriptionList>
                <DescriptionListItem
                  title={translate('Monitored')}
                  data={totals.monitored}
                />
                <DescriptionListItem
                  title={translate('Unmonitored')}
                  data={count - totals.monitored}
                />
              </DescriptionList>

              <DescriptionList>
                <DescriptionListItem
                  title={translate('Authors')}
                  data={totals.authors}
                />
                <DescriptionListItem
                  title={translate('Books')}
                  data={totals.books}
                />
                <DescriptionListItem
                  title={translate('Files')}
                  data={totals.bookFiles}
                />
              </DescriptionList>

              <DescriptionList>
                <DescriptionListItem
                  title={translate('TotalFileSize')}
                  data={formatBytes(totals.totalFileSize)}
                />
              </DescriptionList>
            </div>
          </div>
        );
      }}
    </ColorImpairedConsumer>
  );
}

export default BookIndexFooter;
