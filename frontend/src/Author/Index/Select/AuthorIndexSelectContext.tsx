import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { SelectedState } from 'Helpers/Hooks/useSelectState';
import { SelectStateInputProps } from 'typings/props';

// Select mode state for the index cells. Read through context so a poster, overview
// row or table row inside the virtualized grid updates without the grid re-rendering.

interface AuthorIndexSelectContextValue {
  isSelectMode: boolean;
  selectedState: SelectedState;
  onSelectedChange: (change: SelectStateInputProps) => void;
}

const AuthorIndexSelectContext = createContext<AuthorIndexSelectContextValue>({
  isSelectMode: false,
  selectedState: {},
  onSelectedChange: () => {
    // No select mode outside the provider.
  },
});

interface AuthorIndexSelectProviderProps extends AuthorIndexSelectContextValue {
  children: ReactNode;
}

export function AuthorIndexSelectProvider({
  isSelectMode,
  selectedState,
  onSelectedChange,
  children,
}: AuthorIndexSelectProviderProps) {
  const value = useMemo(
    () => ({ isSelectMode, selectedState, onSelectedChange }),
    [isSelectMode, selectedState, onSelectedChange]
  );

  return (
    <AuthorIndexSelectContext.Provider value={value}>
      {children}
    </AuthorIndexSelectContext.Provider>
  );
}

export const useAuthorIndexSelect = () => useContext(AuthorIndexSelectContext);

export const useIsAuthorSelected = (authorId: number) => {
  const { selectedState } = useAuthorIndexSelect();

  return !!selectedState[authorId];
};
