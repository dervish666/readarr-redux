import { useQueryClient } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Book from 'Book/Book';
import useBooks from 'Book/useBooks';
import Alert from 'Components/Alert';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import NotFound from 'Components/NotFound';
import PageContent from 'Components/Page/PageContent';
import PageContentBody from 'Components/Page/PageContentBody';
import { kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import BookDetails from './BookDetails';

// Finds the book by slug: in any cached book list first (the author's books, the
// book index), so stepping to the previous or next book shows it at once, then from
// GET /book?titleSlug=. The page itself reads the author's book list.
function BookDetailsPage() {
  const { titleSlug } = useParams<{ titleSlug: string }>();
  const queryClient = useQueryClient();

  const { data: slugBooks, isFetched, error } = useBooks({ titleSlug });

  const cachedBook = useMemo(() => {
    for (const [, books] of queryClient.getQueriesData<Book[]>({
      queryKey: ['/book'],
    })) {
      const found = Array.isArray(books)
        ? books.find((b) => b.titleSlug === titleSlug)
        : undefined;

      if (found) {
        return found;
      }
    }

    return undefined;
  }, [queryClient, titleSlug]);

  const book = slugBooks.find((b) => b.titleSlug === titleSlug) ?? cachedBook;

  if (book) {
    return <BookDetails key={book.id} bookId={book.id} initialBook={book} />;
  }

  if (!isFetched) {
    return (
      <PageContent title={translate('Loading')}>
        <PageContentBody>
          <LoadingIndicator />
        </PageContentBody>
      </PageContent>
    );
  }

  if (error) {
    return (
      <PageContent title={translate('Book')}>
        <PageContentBody>
          <Alert kind={kinds.DANGER}>{translate('LoadingBooksFailed')}</Alert>
        </PageContentBody>
      </PageContent>
    );
  }

  return <NotFound message={translate('SorryThatBookCannotBeFound')} />;
}

export default BookDetailsPage;
