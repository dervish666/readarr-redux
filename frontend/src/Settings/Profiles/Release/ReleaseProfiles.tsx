import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppState from 'App/State/AppState';
import PageSectionContent from 'Components/Page/PageSectionContent';
import AddCard from 'Components/SettingsCard/AddCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import useModalOpenState from 'Helpers/Hooks/useModalOpenState';
import { fetchIndexers } from 'Store/Actions/settingsActions';
import { useTagList } from 'Tags/useTags';
import translate from 'Utilities/String/translate';
import EditReleaseProfileModal from './EditReleaseProfileModal';
import ReleaseProfileItem from './ReleaseProfileItem';
import { useReleaseProfiles } from './useReleaseProfiles';

function ReleaseProfiles() {
  const dispatch = useDispatch();
  const { data, isFetched, error } = useReleaseProfiles();
  const tagList = useTagList();

  // Indexers are still redux; the cards name the indexer a profile is limited to.
  const { isPopulated: isIndexersPopulated, items: indexerList } = useSelector(
    (state: AppState) => state.settings.indexers
  );

  const [
    isAddReleaseProfileModalOpen,
    setAddReleaseProfileModalOpen,
    setAddReleaseProfileModalClosed,
  ] = useModalOpenState(false);

  useEffect(() => {
    if (!isIndexersPopulated) {
      dispatch(fetchIndexers());
    }
  }, [isIndexersPopulated, dispatch]);

  return (
    <PageSectionContent
      errorMessage={translate('UnableToLoadReleaseProfiles')}
      isFetching={!isFetched}
      isPopulated={isFetched}
      error={error}
    >
      <div className={settingsCardStyles.grid}>
        {data.map((item) => {
          return (
            <ReleaseProfileItem
              key={item.id}
              tagList={tagList}
              indexerList={indexerList}
              {...item}
            />
          );
        })}

        <AddCard
          label={translate('AddReleaseProfile')}
          onPress={setAddReleaseProfileModalOpen}
        />
      </div>

      <EditReleaseProfileModal
        isOpen={isAddReleaseProfileModalOpen}
        onModalClose={setAddReleaseProfileModalClosed}
      />
    </PageSectionContent>
  );
}

export default ReleaseProfiles;
