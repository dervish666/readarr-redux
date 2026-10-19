import React, { useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import useAuthors from 'Author/useAuthors';
import useBooks from 'Book/useBooks';
import { Tag, useTagList } from 'Tags/useTags';
import AuthorSearchInput from './AuthorSearchInput';

// The header search: authors and books from the react-query lists (the redux
// AuthorSearchInputConnector read the authors and books feeds), fuzzy matched by
// AuthorSearchInput's fuse worker.
function AuthorSearch() {
  const history = useHistory();
  const { data: authors } = useAuthors();
  const { data: books } = useBooks();
  const tagList = useTagList();

  const items = useMemo(() => {
    const tagsById = new Map<number, Tag>(tagList.map((tag) => [tag.id, tag]));

    const authorItems = authors.map((author) => {
      const { authorName, sortName, images, titleSlug, tags = [] } = author;

      return {
        type: 'author',
        name: authorName,
        sortName,
        titleSlug,
        images,
        firstCharacter: authorName.charAt(0).toLowerCase(),
        tags: tags.reduce<Tag[]>((acc, id) => {
          const tag = tagsById.get(id);

          if (tag) {
            acc.push(tag);
          }

          return acc;
        }, []),
      };
    });

    const bookItems = books.map((book) => {
      const { title, images, titleSlug } = book;

      return {
        type: 'book',
        name: title,
        sortName: title,
        titleSlug,
        images,
        firstCharacter: title.charAt(0).toLowerCase(),
        tags: [],
      };
    });

    return [...authorItems, ...bookItems];
  }, [authors, books, tagList]);

  const handleGoToAuthor = useCallback(
    (titleSlug: string) => {
      history.push(`${window.Readarr.urlBase}/author/${titleSlug}`);
    },
    [history]
  );

  const handleGoToBook = useCallback(
    (titleSlug: string) => {
      history.push(`${window.Readarr.urlBase}/book/${titleSlug}`);
    },
    [history]
  );

  const handleGoToAddNewAuthor = useCallback(
    (query: string) => {
      history.push(
        `${window.Readarr.urlBase}/add/search?term=${encodeURIComponent(query)}`
      );
    },
    [history]
  );

  return (
    <AuthorSearchInput
      items={items}
      onGoToAuthor={handleGoToAuthor}
      onGoToBook={handleGoToBook}
      onGoToAddNewAuthor={handleGoToAddNewAuthor}
    />
  );
}

export default AuthorSearch;
