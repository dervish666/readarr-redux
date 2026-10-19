import React, { useCallback, useState } from 'react';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import InlineMarkdown from 'Components/Markdown/InlineMarkdown';
import PageSectionContent from 'Components/Page/PageSectionContent';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import EditRemotePathMappingModal from './EditRemotePathMappingModal';
import RemotePathMapping from './RemotePathMapping';
import { useRemotePathMappings } from './useRemotePathMappings';
import styles from './RemotePathMappings.css';

function RemotePathMappings() {
  const { isFetched, error, data } = useRemotePathMappings();

  const [isAddRemotePathMappingModalOpen, setIsAddRemotePathMappingModalOpen] =
    useState(false);

  const handleAddRemotePathMappingPress = useCallback(() => {
    setIsAddRemotePathMappingModalOpen(true);
  }, []);

  const handleAddRemotePathMappingModalClose = useCallback(() => {
    setIsAddRemotePathMappingModalOpen(false);
  }, []);

  return (
    <FieldSet legend={translate('RemotePathMappings')}>
      <PageSectionContent
        errorMessage={translate('UnableToLoadRemotePathMappings')}
        error={error}
        isFetching={!isFetched}
        isPopulated={isFetched}
      >
        <Alert kind={kinds.INFO}>
          <InlineMarkdown
            data={translate('RemotePathMappingsInfo', {
              app: 'Readarr',
              wikiLink:
                'https://wiki.servarr.com/readarr/settings#remote-path-mappings',
            })}
          />
        </Alert>

        <div className={styles.remotePathMappingsHeader}>
          <div className={styles.host}>{translate('Host')}</div>
          <div className={styles.path}>
            {translate('SettingsRemotePathMappingRemotePath')}
          </div>
          <div className={styles.path}>
            {translate('SettingsRemotePathMappingLocalPath')}
          </div>
        </div>

        <div>
          {data.map((item) => {
            return <RemotePathMapping key={item.id} {...item} />;
          })}
        </div>

        <Link
          className={styles.addRow}
          onPress={handleAddRemotePathMappingPress}
        >
          <Icon name={icons.ADD} size={12} />
          {translate('AddRemotePathMapping')}
        </Link>

        <EditRemotePathMappingModal
          isOpen={isAddRemotePathMappingModalOpen}
          onModalClose={handleAddRemotePathMappingModalClose}
        />
      </PageSectionContent>
    </FieldSet>
  );
}

export default RemotePathMappings;
