import { useState } from 'react';
import { useHistory } from 'react-router';
import { create } from 'zustand';

interface PageStore {
  queue: number;
}

const pageStore = create<PageStore>(() => ({
  queue: 1,
}));

// The current page of a paged list. Going back to the list (a POP) keeps the page
// the user left; any other navigation starts again at page 1, as withCurrentPage did.
const usePage = (kind: keyof PageStore) => {
  const history = useHistory();

  useState(() => {
    if (history.action !== 'POP') {
      pageStore.setState({ [kind]: 1 });
    }

    return null;
  });

  const goToPage = (page: number) => {
    pageStore.setState({ [kind]: page });
  };

  return {
    page: pageStore((state) => state[kind]),
    goToPage,
  };
};

export default usePage;

export const resetPage = (kind: keyof PageStore) => {
  pageStore.setState({ [kind]: 1 });
};
