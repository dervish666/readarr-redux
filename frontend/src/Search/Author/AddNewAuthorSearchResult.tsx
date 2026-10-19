import classNames from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import { useAppDimension } from 'App/appStore';
import Author from 'Author/Author';
import AuthorPoster from 'Author/AuthorPoster';
import HeartRating from 'Components/HeartRating';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import { icons } from 'Helpers/Props';
import { useExistingAuthor } from 'Search/useAddNew';
import stripHtml from 'Utilities/String/stripHtml';
import translate from 'Utilities/String/translate';
import AddNewAuthorModal from './AddNewAuthorModal';
import styles from './AddNewAuthorSearchResult.css';

interface AddNewAuthorSearchResultProps {
  author: Author;
}

function AddNewAuthorSearchResult({ author }: AddNewAuthorSearchResultProps) {
  const {
    foreignAuthorId,
    authorName,
    disambiguation,
    status,
    overview,
    ratings,
    images,
    links,
  } = author;

  const existingAuthor = useExistingAuthor(foreignAuthorId);
  const isExistingAuthor = !!existingAuthor;
  const isSmallScreen = useAppDimension('isSmallScreen');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handlePress = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const handleSourceLinkPress = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  // Once added, the result links to the author instead of the modal.
  useEffect(() => {
    if (isExistingAuthor) {
      setIsAddModalOpen(false);
    }
  }, [isExistingAuthor]);

  const linkProps = existingAuthor
    ? { to: `/author/${existingAuthor.titleSlug}` }
    : { onPress: handlePress };

  // The metadata source's own page for the author, whichever site that is.
  const sourceUrl = links?.length ? links[0].url : null;

  return (
    <div className={styles.searchResult}>
      <Link
        className={styles.underlay}
        aria-label={authorName}
        {...linkProps}
      />

      <div className={styles.overlay}>
        {isSmallScreen ? null : (
          <AuthorPoster
            className={styles.poster}
            images={images}
            size={250}
            overflow={true}
            lazy={false}
          />
        )}

        <div className={styles.content}>
          <div className={styles.nameRow}>
            <div className={styles.nameContainer}>
              <div className={styles.name}>
                {authorName}

                {disambiguation ? (
                  <span className={styles.disambiguation}>
                    ({disambiguation})
                  </span>
                ) : null}
              </div>
            </div>

            <div className={styles.icons}>
              {isExistingAuthor ? (
                <Icon
                  className={styles.alreadyExistsIcon}
                  name={icons.CHECK_CIRCLE}
                  size={24}
                  title={translate('AlreadyInYourLibrary')}
                />
              ) : null}

              {sourceUrl ? (
                <Link
                  className={styles.sourceLink}
                  to={sourceUrl}
                  aria-label={links[0].name}
                  onPress={handleSourceLinkPress}
                >
                  <Icon name={icons.EXTERNAL_LINK} size={16} />
                </Link>
              ) : null}
            </div>
          </div>

          <div className={styles.chips}>
            {ratings?.votes > 0 ? (
              <span className={styles.chip}>
                <HeartRating rating={ratings.value} iconSize={11} />
              </span>
            ) : null}

            {status === 'ended' ? (
              <span className={styles.chip}>
                <span
                  className={classNames(styles.chipDot, styles.chipDotEnded)}
                />
                {translate('StatusEndedDeceased')}
              </span>
            ) : null}
          </div>

          {overview ? (
            <div className={styles.overview}>{stripHtml(overview)}</div>
          ) : null}
        </div>
      </div>

      <AddNewAuthorModal
        isOpen={isAddModalOpen && !isExistingAuthor}
        author={author}
        onModalClose={handleModalClose}
      />
    </div>
  );
}

export default AddNewAuthorSearchResult;
