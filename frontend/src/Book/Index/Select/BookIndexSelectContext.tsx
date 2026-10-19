import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { SelectedState } from 'Helpers/Hooks/useSelectState';
import { SelectStateInputProps } from 'typings/props';

// Select mode state for the book index cells, as AuthorIndexSelectContext: read
// through context so a cell inside the virtualized grid updates without the grid
// re-rendering.

interface BookIndexSelectContextValue {
  isSelectMode: boolean;
  selectedState: SelectedState;
  onSelectedChange: (change: SelectStateInputProps) => void;
}

const BookIndexSelectContext = createContext<BookIndexSelectContextValue>({
  isSelectMode: false,
  selectedState: {},
  onSelectedChange: () => {
    // No select mode outside the provider.
  },
});

interface BookIndexSelectProviderProps extends BookIndexSelectContextValue {
  children: ReactNode;
}

export function BookIndexSelectProvider({
  isSelectMode,
  selectedState,
  onSelectedChange,
  children,
}: BookIndexSelectProviderProps) {
  const value = useMemo(
    () => ({ isSelectMode, selectedState, onSelectedChange }),
    [isSelectMode, selectedState, onSelectedChange]
  );

  return (
    <BookIndexSelectContext.Provider value={value}>
      {children}
    </BookIndexSelectContext.Provider>
  );
}

export const useBookIndexSelect = () => useContext(BookIndexSelectContext);

export const useIsBookSelected = (bookId: number) => {
  const { selectedState } = useBookIndexSelect();

  return !!selectedState[bookId];
};
