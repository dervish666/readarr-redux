// GET /release takes one of these (Readarr.Api.V1/Indexers/ReleaseController).
interface BookSearchPayload {
  bookId: number;
}

interface AuthorSearchPayload {
  authorId: number;
}

type InteractiveSearchPayload = BookSearchPayload | AuthorSearchPayload;

export default InteractiveSearchPayload;
