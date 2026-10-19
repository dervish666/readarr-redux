import React, { useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import useAuthors from 'Author/useAuthors';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import NotFound from 'Components/NotFound';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import AuthorDetails from './AuthorDetails';

// Ported from Sonarr's SeriesDetailsPage (88b5b94e9): when the author's slug changes
// under the page (a refresh renamed it) the page follows the author to its new slug;
// when the author is gone (deleted) it goes back to the index.
function AuthorDetailsPage() {
  const { data: allAuthors, isFetched, isSuccess, error } = useAuthors();
  const { titleSlug } = useParams<{ titleSlug: string }>();
  const history = useHistory();

  const author = allAuthors.find((a) => a.titleSlug === titleSlug);
  const authorId = author?.id;
  const previousAuthorId = usePrevious(authorId);
  const previousTitleSlug = usePrevious(titleSlug);

  useEffect(() => {
    // Only a successful load can say the author is gone; a failed one would send the
    // page back to the index.
    if (
      !isSuccess ||
      authorId !== undefined ||
      previousAuthorId === undefined ||
      titleSlug !== previousTitleSlug
    ) {
      return;
    }

    const renamedAuthor = allAuthors.find((a) => a.id === previousAuthorId);

    if (renamedAuthor) {
      history.replace(
        `${window.Readarr.urlBase}/author/${renamedAuthor.titleSlug}`
      );
    } else {
      history.push(`${window.Readarr.urlBase}/`);
    }
  }, [
    isSuccess,
    allAuthors,
    authorId,
    previousAuthorId,
    titleSlug,
    previousTitleSlug,
    history,
  ]);

  if (!isFetched) {
    return (
      <PageContent title={translate('Loading')}>
        <PageContentBody>
          <LoadingIndicator />
        </PageContentBody>
      </PageContent>
    );
  }

  if (error && !allAuthors.length) {
    return (
      <PageContent title={translate('Author')}>
        <PageContentBody>
          <Alert kind={kinds.DANGER}>
            {translate('FailedToLoadAuthorFromApi')}
          </Alert>
        </PageContentBody>
      </PageContent>
    );
  }

  if (!author) {
    return <NotFound message={translate('SorryThatAuthorCannotBeFound')} />;
  }

  return <AuthorDetails authorId={author.id} />;
}

export default AuthorDetailsPage;
