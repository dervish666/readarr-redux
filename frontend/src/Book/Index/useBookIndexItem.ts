import { useAuthor } from 'Author/useAuthors';
import Book from 'Book/Book';
import * as commandNames from 'Commands/commandNames';
import { useCommandExecuting } from 'Commands/useCommands';
import { useQualityProfile } from 'Settings/Profiles/Quality/useQualityProfiles';

// What a poster, overview or table row needs for one book. The author comes from the
// ['/author'] list (GET /book does not embed it); books have no quality profile of
// their own, so it is the author's.
const useBookIndexItem = (book: Book) => {
  const { id: bookId, authorId } = book;

  const author = useAuthor(authorId);
  const qualityProfile = useQualityProfile(author?.qualityProfileId);

  const isRefreshingAuthor = useCommandExecuting(commandNames.REFRESH_AUTHOR, {
    authorId,
  });

  const isRefreshingBook = useCommandExecuting(commandNames.REFRESH_BOOK, {
    bookId,
  });

  const isSearchingAuthor = useCommandExecuting(commandNames.AUTHOR_SEARCH, {
    authorId,
  });

  const isSearchingBook = useCommandExecuting(commandNames.BOOK_SEARCH, {
    bookIds: [bookId],
  });

  return {
    author,
    qualityProfile,
    isRefreshingBook: isRefreshingAuthor || isRefreshingBook,
    isSearchingBook: isSearchingAuthor || isSearchingBook,
  };
};

export default useBookIndexItem;
