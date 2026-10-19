import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useAuthors from 'Author/useAuthors';
import TextInput from 'Components/Form/TextInput';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import Link from 'Components/Link/Link';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import PageHeading from 'Components/Page/PageHeading';
import useDebounce from 'Helpers/Hooks/useDebounce';
import { icons, kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import translate from 'Utilities/String/translate';
import AddNewAuthorSearchResult from './Author/AddNewAuthorSearchResult';
import AddNewBookSearchResult from './Book/AddNewBookSearchResult';
import { useSearchLookup } from './useAddNew';
import styles from './AddNewItem.module.css';

const GOODREADS_SEARCH_HINT =
  'of a book (e.g. edition:656), work (e.g. work:4912783) or author (e.g. author:128382), the isbn (e.g. isbn:067003469X) or the asin (e.g. asin:B00JCDK5ME)';

function SearchHint() {
  return (
    <div className={styles.emptyBody}>
      You can also search using the
      <Link className={styles.emptyLink} to="https://goodreads.com">
        {' '}
        Goodreads ID{' '}
      </Link>
      {GOODREADS_SEARCH_HINT}
    </div>
  );
}

// /add/search: the combined author and book lookup (GET /search). ?term= from the
// header search fills the box and searches straight away.
function AddNewItem() {
  const { search } = useLocation();
  const initialTerm = new URLSearchParams(search).get('term') ?? '';

  // Only offer the root folder hint once the library is known to be empty.
  const { data: authors, isSuccess: isAuthorsLoaded } = useAuthors();
  const hasNoAuthors = isAuthorsLoaded && !authors.length;
  const [term, setTerm] = useState(initialTerm);
  const [isFetching, setIsFetching] = useState(!!initialTerm.trim());
  const query = useDebounce(term.trim(), term ? 300 : 0);

  const { isFetching: isFetchingApi, error, data } = useSearchLookup(query);

  useEffect(() => {
    setIsFetching(isFetchingApi);
  }, [isFetchingApi]);

  useEffect(() => {
    if (initialTerm) {
      setTerm(initialTerm);
    }
  }, [initialTerm]);

  const handleSearchInputChange = useCallback(
    ({ value }: InputChanged<string>) => {
      setTerm(value);
      setIsFetching(!!value.trim());
    },
    []
  );

  const handleClearPress = useCallback(() => {
    setTerm('');
    setIsFetching(false);
  }, []);

  return (
    <PageContent title={translate('AddNewItem')}>
      <PageContentBody>
        <PageHeading scope={translate('Authors')} title={translate('AddNew')} />

        <div className={styles.searchSticky}>
          <div className={styles.searchWrap}>
            <Icon className={styles.searchIcon} name={icons.SEARCH} size={18} />

            <TextInput
              className={styles.searchInput}
              name="searchBox"
              value={term}
              placeholder={translate('SearchBoxPlaceHolder')}
              autoFocus={true}
              onChange={handleSearchInputChange}
            />

            {term ? (
              <Button
                className={styles.clearLookupButton}
                aria-label={translate('Clear')}
                onPress={handleClearPress}
              >
                <Icon name={icons.REMOVE} size={14} />
              </Button>
            ) : null}
          </div>
        </div>

        {isFetching ? <LoadingIndicator /> : null}

        {!isFetching && !!error && !!term ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>
              {translate('FailedLoadingSearchResults')}
            </div>
            <p className={styles.error}>{getErrorMessage(error)}</p>
            <Link
              className={styles.emptyLink}
              to="https://github.com/dervish666/readarr-redux#you-need-a-metadata-source"
            >
              {translate('WhySearchesCouldBeFailing')}
            </Link>
          </div>
        ) : null}

        {!isFetching && !error && !!term && !!data.length ? (
          <div className={styles.searchResults}>
            <div className={styles.resultsLabel}>
              {data.length === 1
                ? translate('CountResult', { count: data.length })
                : translate('CountResults', { count: data.length })}
            </div>

            {data.map((item) => {
              if (item.author) {
                return (
                  <AddNewAuthorSearchResult
                    key={item.id}
                    author={item.author}
                  />
                );
              }

              if (item.book) {
                return (
                  <AddNewBookSearchResult key={item.id} book={item.book} />
                );
              }

              return null;
            })}
          </div>
        ) : null}

        {!isFetching && !error && !!query && !data.length ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>
              {translate('CouldntFindAnyResultsForTerm', { 0: query })}
            </div>
            <SearchHint />
          </div>
        ) : null}

        {term ? null : (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>
              {translate(
                'ItsEasyToAddANewAuthorOrBookJustStartTypingTheNameOfTheItemYouWantToAdd'
              )}
            </div>
            <SearchHint />

            {hasNoAuthors ? (
              <>
                <div className={styles.emptyDivider} />
                <div className={styles.emptyNoLibrary}>
                  You haven't added any authors yet, do you want to add an
                  existing library location (Root Folder) and update?
                </div>
                <Button to="/settings/mediamanagement" kind={kinds.PRIMARY}>
                  {translate('AddRootFolder')}
                </Button>
              </>
            ) : null}
          </div>
        )}
      </PageContentBody>
    </PageContent>
  );
}

export default AddNewItem;
