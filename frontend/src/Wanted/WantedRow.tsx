import React from 'react';
import AuthorNameLink from 'Author/AuthorNameLink';
import { useAuthor } from 'Author/useAuthors';
import Book from 'Book/Book';
import BookSearchCell from 'Book/BookSearchCell';
import BookTitleLink from 'Book/BookTitleLink';
import RelativeDateCellConnector from 'Components/Table/Cells/RelativeDateCellConnector';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import Column from 'Components/Table/Column';
import TableRow from 'Components/Table/TableRow';
import { SelectStateInputProps } from 'typings/props';

interface WantedRowProps {
  book: Book;
  columns: Column[];
  isSelected?: boolean;
  onSelectedChange: (props: SelectStateInputProps) => void;
}

// A row of the missing or cutoff unmet table.
function WantedRow({
  book,
  columns,
  isSelected,
  onSelectedChange,
}: WantedRowProps) {
  const {
    id,
    authorId,
    title,
    titleSlug,
    disambiguation,
    releaseDate,
    lastSearchTime,
  } = book;

  // The author list has the latest state; the row's own copy covers a list not loaded yet.
  const author = useAuthor(authorId) ?? book.author;

  if (!author) {
    return null;
  }

  return (
    <TableRow>
      <TableSelectCell
        id={id}
        isSelected={!!isSelected}
        onSelectedChange={onSelectedChange}
      />

      {columns.map((column) => {
        const { name, isVisible } = column;

        if (!isVisible) {
          return null;
        }

        if (name === 'authorMetadata.sortName') {
          return (
            <TableRowCell key={name}>
              <AuthorNameLink
                titleSlug={author.titleSlug}
                authorName={author.authorName}
              />
            </TableRowCell>
          );
        }

        if (name === 'books.title') {
          return (
            <TableRowCell key={name}>
              <BookTitleLink
                titleSlug={titleSlug}
                title={title}
                disambiguation={disambiguation}
              />
            </TableRowCell>
          );
        }

        if (name === 'releaseDate') {
          return <RelativeDateCellConnector key={name} date={releaseDate} />;
        }

        if (name === 'books.lastSearchTime') {
          return <RelativeDateCellConnector key={name} date={lastSearchTime} />;
        }

        if (name === 'actions') {
          return (
            <BookSearchCell
              key={name}
              bookId={id}
              bookTitle={title}
              authorName={author.authorName}
            />
          );
        }

        return null;
      })}
    </TableRow>
  );
}

export default WantedRow;
