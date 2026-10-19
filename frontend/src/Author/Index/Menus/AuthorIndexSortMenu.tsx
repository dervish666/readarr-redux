import React from 'react';
import MenuContent from 'Components/Menu/MenuContent';
import SortMenu from 'Components/Menu/SortMenu';
import SortMenuItem from 'Components/Menu/SortMenuItem';
import { align } from 'Helpers/Props';
import SortDirection from 'Helpers/Props/SortDirection';
import translate from 'Utilities/String/translate';

interface AuthorIndexSortMenuProps {
  sortKey?: string;
  sortDirection?: SortDirection;
  isDisabled: boolean;
  onSortSelect(sortKey: string): void;
}

function AuthorIndexSortMenu(props: AuthorIndexSortMenuProps) {
  const { sortKey, sortDirection, isDisabled, onSortSelect } = props;

  return (
    <SortMenu isDisabled={isDisabled} alignMenu={align.RIGHT}>
      <MenuContent>
        <SortMenuItem
          name="status"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('MonitoredStatus')}
        </SortMenuItem>

        <SortMenuItem
          name="sortName"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('FirstName')}
        </SortMenuItem>

        <SortMenuItem
          name="sortNameLastFirst"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('LastName')}
        </SortMenuItem>

        <SortMenuItem
          name="qualityProfileId"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('QualityProfile')}
        </SortMenuItem>

        <SortMenuItem
          name="metadataProfileId"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('MetadataProfile')}
        </SortMenuItem>

        <SortMenuItem
          name="nextBook"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('NextBook')}
        </SortMenuItem>

        <SortMenuItem
          name="lastBook"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('LastBook')}
        </SortMenuItem>

        <SortMenuItem
          name="added"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('Added')}
        </SortMenuItem>

        <SortMenuItem
          name="bookCount"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('Books')}
        </SortMenuItem>

        <SortMenuItem
          name="bookProgress"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('BookProgress')}
        </SortMenuItem>

        <SortMenuItem
          name="path"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('Path')}
        </SortMenuItem>

        <SortMenuItem
          name="sizeOnDisk"
          sortKey={sortKey}
          sortDirection={sortDirection}
          onPress={onSortSelect}
        >
          {translate('SizeOnDisk')}
        </SortMenuItem>
      </MenuContent>
    </SortMenu>
  );
}

export default AuthorIndexSortMenu;
