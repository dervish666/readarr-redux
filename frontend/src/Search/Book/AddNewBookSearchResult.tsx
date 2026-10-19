import moment from 'moment';
import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import Book from 'Book/Book';
import BookCover from 'Book/BookCover';
import HeartRating from 'Components/HeartRating';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import { icons } from 'Helpers/Props';
import { useExistingAuthor, useExistingBook } from 'Search/useAddNew';
import stripHtml from 'Utilities/String/stripHtml';
import translate from 'Utilities/String/translate';
import AddNewBookModal from './AddNewBookModal';
import styles from './AddNewBookSearchResult.css';

interface AddNewBookSearchResultProps {
  book: Book;
}

function AddNewBookSearchResult({ book }: AddNewBookSearchResultProps) {
  const {
    foreignBookId,
    title,
    seriesTitle,
    releaseDate,
    disambiguation,
    overview,
    ratings,
    images,
    author,
    editions,
  } = book;

  const existingBook = useExistingBook(foreignBookId);
  const existingAuthor = useExistingAuthor(author?.foreignAuthorId);
  const isExistingBook = !!existingBook;
  const isSmallScreen = useSelector(
    (state: AppState) => state.app.dimensions.isSmallScreen
  );
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

  useEffect(() => {
    if (isExistingBook) {
      setIsAddModalOpen(false);
    }
  }, [isExistingBook]);

  const linkProps = existingBook
    ? { to: `/book/${existingBook.titleSlug}` }
    : { onPress: handlePress };

  // The metadata source's own page for the edition, whichever site that is.
  const editionLinks = editions?.length ? editions[0].links : null;
  const sourceLink = editionLinks?.length ? editionLinks[0] : null;

  return (
    <div className={styles.searchResult}>
      <Link className={styles.underlay} aria-label={title} {...linkProps} />

      <div className={styles.overlay}>
        {isSmallScreen ? null : (
          <BookCover
            className={styles.poster}
            images={images}
            size={250}
            lazy={false}
          />
        )}

        <div className={styles.content}>
          <div className={styles.titleRow}>
            <div className={styles.titleContainer}>
              <div className={styles.title}>
                {title}

                {disambiguation ? (
                  <span className={styles.disambiguation}>
                    ({disambiguation})
                  </span>
                ) : null}
              </div>
            </div>

            <div className={styles.icons}>
              {isExistingBook ? (
                <Icon
                  className={styles.alreadyExistsIcon}
                  name={icons.CHECK_CIRCLE}
                  size={24}
                  title={translate('AlreadyInYourLibrary')}
                />
              ) : null}

              {sourceLink ? (
                <Link
                  className={styles.sourceLink}
                  to={sourceLink.url}
                  aria-label={sourceLink.name}
                  onPress={handleSourceLinkPress}
                >
                  <Icon name={icons.EXTERNAL_LINK} size={16} />
                </Link>
              ) : null}
            </div>
          </div>

          {seriesTitle ? (
            <div className={styles.series}>{seriesTitle}</div>
          ) : null}

          <div className={styles.chips}>
            {author ? (
              <span className={styles.chip}>{author.authorName}</span>
            ) : null}

            <span className={styles.chip}>
              <HeartRating rating={ratings?.value ?? 0} iconSize={11} />
            </span>

            {releaseDate ? (
              <span className={styles.chip}>
                {moment(releaseDate).format('YYYY')}
              </span>
            ) : null}
          </div>

          {overview ? (
            <div className={styles.overview}>{stripHtml(overview)}</div>
          ) : null}
        </div>
      </div>

      <AddNewBookModal
        isOpen={isAddModalOpen && !isExistingBook}
        book={book}
        isExistingAuthor={!!existingAuthor}
        onModalClose={handleModalClose}
      />
    </div>
  );
}

export default AddNewBookSearchResult;
