import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import createAuthorSelector from 'Store/Selectors/createAuthorSelector';
import createBookSelector from 'Store/Selectors/createBookSelector';
import AuthorHistoryRow from './AuthorHistoryRow';

function createMapStateToProps() {
  return createSelector(
    createAuthorSelector(),
    createBookSelector(),
    (author, book) => {
      return {
        author,
        book
      };
    }
  );
}

export default connect(createMapStateToProps)(AuthorHistoryRow);
