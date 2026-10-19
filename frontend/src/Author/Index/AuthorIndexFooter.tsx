import classNames from 'classnames';
import React, { useMemo } from 'react';
import { ColorImpairedConsumer } from 'App/ColorImpairedContext';
import DescriptionList from 'Components/DescriptionList/DescriptionList';
import DescriptionListItem from 'Components/DescriptionList/DescriptionListItem';
import formatBytes from 'Utilities/Number/formatBytes';
import translate from 'Utilities/String/translate';
import useAuthorIndex from './useAuthorIndex';
import styles from './AuthorIndexFooter.module.css';

// Legend and totals for the authors the index currently shows.
function AuthorIndexFooter() {
  const { data: authors } = useAuthorIndex();

  const totals = useMemo(() => {
    return authors.reduce(
      (acc, author) => {
        const {
          bookCount = 0,
          bookFileCount = 0,
          sizeOnDisk = 0,
        } = author.statistics ?? {};

        acc.books += bookCount;
        acc.bookFiles += bookFileCount;
        acc.totalFileSize += sizeOnDisk;

        if (author.status === 'ended') {
          acc.ended++;
        } else {
          acc.continuing++;
        }

        if (author.monitored) {
          acc.monitored++;
        }

        return acc;
      },
      {
        books: 0,
        bookFiles: 0,
        ended: 0,
        continuing: 0,
        monitored: 0,
        totalFileSize: 0,
      }
    );
  }, [authors]);

  const count = authors.length;

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
                  title={translate('Authors')}
                  data={count}
                />
                <DescriptionListItem
                  title={translate('Ended')}
                  data={totals.ended}
                />
                <DescriptionListItem
                  title={translate('Continuing')}
                  data={totals.continuing}
                />
              </DescriptionList>

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

export default AuthorIndexFooter;
