import React, { useCallback, useMemo, useState } from 'react';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import TableRowCell from 'Components/Table/Cells/TableRowCell';
import TableSelectCell from 'Components/Table/Cells/TableSelectCell';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import TableRow from 'Components/Table/TableRow';
import useProviderOptions, {
  ProviderOptionsData,
} from 'Settings/useProviderOptions';
import getSelectedIds from 'Utilities/Table/getSelectedIds';
import selectAll from 'Utilities/Table/selectAll';
import toggleSelected from 'Utilities/Table/toggleSelected';
import styles from './BookshelfInput.css';

interface Bookshelf {
  id: string;
  name: string;
}

// GoodreadsBookshelf.RequestAction("getBookshelves") options.
interface BookshelfOptions {
  helptext?: Record<string, string>;
  user?: string;
  shelves?: Bookshelf[];
}

interface SelectionState {
  allSelected: boolean;
  allUnselected: boolean;
  lastToggled: string | null;
  selectedState: Record<string, boolean>;
}

interface BookshelfInputProps {
  className?: string;
  name: string;
  value: string[];
  provider: string;
  providerData: ProviderOptionsData;
  onChange: (change: { name: string; value: string[] }) => void;
}

const columns = [
  {
    name: 'name',
    label: 'Bookshelf',
    isSortable: false,
    isVisible: true,
  },
];

function getAccessToken(providerData: ProviderOptionsData) {
  return providerData.fields?.find((field) => field.name === 'accessToken')
    ?.value as string | undefined;
}

// inputTypes.BOOKSHELF: the signed-in Goodreads user's shelves, as a selectable
// table. Asks the provider once there is an access token, and again whenever the
// token changes (a new sign-in).
function BookshelfInput({
  className = styles.bookshelfInputWrapper,
  name,
  value,
  provider,
  providerData,
  onChange,
}: BookshelfInputProps) {
  const accessToken = getAccessToken(providerData);

  const { data, isFetching, isSuccess } = useProviderOptions<{
    options?: BookshelfOptions;
  }>({
    provider,
    action: 'getBookshelves',
    providerData,
    queryParams: { name },
    requestKey: accessToken,
    enabled: !!accessToken,
  });

  const options = isSuccess ? data?.options : undefined;
  const isPopulated = isSuccess;
  const user = options?.user ?? '';
  const items = useMemo(() => options?.shelves ?? [], [options]);
  const helptext = options?.helptext?.[name] ?? '';

  const [selection, setSelection] = useState<SelectionState>(() => ({
    allSelected: false,
    allUnselected: false,
    lastToggled: null,
    selectedState: Object.fromEntries(value.map((id) => [id, true])),
  }));

  const applySelection = useCallback(
    (next: SelectionState) => {
      setSelection(next);

      const oldSelected = (
        getSelectedIds(selection.selectedState, { parseIds: false }) as string[]
      ).sort();
      const newSelected = (
        getSelectedIds(next.selectedState, { parseIds: false }) as string[]
      ).sort();

      if (oldSelected.join('\n') !== newSelected.join('\n')) {
        onChange({ name, value: newSelected });
      }
    },
    [name, selection, onChange]
  );

  const handleSelectAllChange = useCallback(
    ({ value: selected }: { value: boolean }) => {
      applySelection(selectAll(selection.selectedState, selected));
    },
    [selection, applySelection]
  );

  const handleSelectedChange = useCallback(
    ({
      id,
      value: selected,
      shiftKey = false,
    }: {
      id: string;
      value: boolean;
      shiftKey?: boolean;
    }) => {
      applySelection(toggleSelected(selection, items, id, selected, shiftKey));
    },
    [selection, items, applySelection]
  );

  return (
    <div className={className}>
      {isFetching ? <LoadingIndicator /> : null}

      {!isPopulated && !isFetching ? (
        <div>Authenticate with Goodreads to retrieve bookshelves.</div>
      ) : null}

      {isPopulated && !isFetching && !user ? (
        <div>
          Could not retrieve data from Goodreads. Try re-authenticating.
        </div>
      ) : null}

      {isPopulated && !isFetching && user && !items.length ? (
        <div>No bookshelves found for Goodreads user {user}.</div>
      ) : null}

      {isPopulated && !isFetching && user && !!items.length ? (
        <div className={className}>
          {helptext}
          <Table
            columns={columns}
            selectAll={true}
            allSelected={selection.allSelected}
            allUnselected={selection.allUnselected}
            onSelectAllChange={handleSelectAllChange}
          >
            <TableBody>
              {items.map((item) => {
                return (
                  <TableRow key={item.id}>
                    <TableSelectCell
                      id={item.id}
                      isSelected={!!selection.selectedState[item.id]}
                      onSelectedChange={handleSelectedChange}
                    />

                    <TableRowCell title={item.name}>{item.name}</TableRowCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}

export default BookshelfInput;
