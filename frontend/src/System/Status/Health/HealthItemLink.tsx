import React from 'react';
import IconButton from 'Components/Link/IconButton';
import { icons } from 'Helpers/Props';
import translate from 'Utilities/String/translate';

interface HealthItemLinkProps {
  source: string;
}

function HealthItemLink({ source }: HealthItemLinkProps) {
  switch (source) {
    case 'IndexerRssCheck':
    case 'IndexerSearchCheck':
    case 'IndexerStatusCheck':
    case 'IndexerJackettAllCheck':
    case 'IndexerLongTermStatusCheck':
      return (
        <IconButton
          name={icons.SETTINGS}
          title={translate('Settings')}
          aria-label={translate('Settings')}
          to="/settings/indexers"
        />
      );
    case 'DownloadClientCheck':
    case 'DownloadClientStatusCheck':
    case 'ImportMechanismCheck':
    case 'RemotePathMappingCheck':
      return (
        <IconButton
          name={icons.SETTINGS}
          title={translate('Settings')}
          aria-label={translate('Settings')}
          to="/settings/downloadclients"
        />
      );
    case 'NotificationStatusCheck':
      return (
        <IconButton
          name={icons.SETTINGS}
          title={translate('Settings')}
          aria-label={translate('Settings')}
          to="/settings/connect"
        />
      );
    case 'MetadataSourceCheck':
      return (
        <IconButton
          name={icons.SETTINGS}
          title={translate('Settings')}
          aria-label={translate('Settings')}
          to="/settings/metadatasource"
        />
      );
    case 'RootFolderCheck':
      return (
        <IconButton
          name={icons.AUTHOR_CONTINUING}
          title={translate('AuthorEditor')}
          aria-label={translate('AuthorEditor')}
          to="/authors"
        />
      );
    case 'UpdateCheck':
      return (
        <IconButton
          name={icons.UPDATE}
          title={translate('Updates')}
          aria-label={translate('Updates')}
          to="/system/updates"
        />
      );
    default:
      return null;
  }
}

export default HealthItemLink;
