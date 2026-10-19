import React from 'react';
import Alert from 'Components/Alert';
import InlineMarkdown from 'Components/Markdown/InlineMarkdown';
import PageSectionContent from 'Components/Page/PageSectionContent';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import { kinds } from 'Helpers/Props';
import { useDownloadClients } from 'Settings/DownloadClients/DownloadClients/useDownloadClients';
import { useImportLists } from 'Settings/ImportLists/ImportLists/useImportLists';
import { useIndexers } from 'Settings/Indexers/useIndexers';
import { useConnections } from 'Settings/Notifications/useConnections';
import useTagDetails from 'Tags/useTagDetails';
import useTags, { useSortedTagList } from 'Tags/useTags';
import translate from 'Utilities/String/translate';
import Tag from './Tag';

const WIKI_LINK = '[here](https://wiki.servarr.com/readarr/settings#tags)';

function Tags() {
  const { isFetched, error } = useTags();
  const items = useSortedTagList();

  const { isFetched: isDetailsFetched, error: detailsError } = useTagDetails();

  // The details modal names what a tag is linked to; prime those lists here.
  useIndexers();
  useDownloadClients();
  useImportLists();
  useConnections();

  if (isFetched && !error && !items.length) {
    return (
      <Alert kind={kinds.INFO}>
        <InlineMarkdown
          data={translate('NoTagsHaveBeenAddedYet', { 0: WIKI_LINK })}
        />
      </Alert>
    );
  }

  return (
    <PageSectionContent
      errorMessage={translate('UnableToLoadTags')}
      error={error || detailsError}
      // Spinner only for the first load. A refetch that unmounted the cards would
      // remount their tag detail observers, which refetch, which loops.
      isFetching={!isFetched || !isDetailsFetched}
      isPopulated={isFetched && isDetailsFetched}
    >
      <div className={settingsCardStyles.grid}>
        {items.map((item) => {
          return <Tag key={item.id} id={item.id} label={item.label} />;
        })}
      </div>
    </PageSectionContent>
  );
}

export default Tags;
