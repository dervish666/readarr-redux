import React from 'react';
import Alert from 'Components/Alert';
import DescriptionList from 'Components/DescriptionList/DescriptionList';
import DescriptionListItemDescription from 'Components/DescriptionList/DescriptionListItemDescription';
import DescriptionListItemTitle from 'Components/DescriptionList/DescriptionListItemTitle';
import FieldSet from 'Components/FieldSet';
import Link from 'Components/Link/Link';
import { kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';

function MoreInfo() {
  return (
    <FieldSet legend={translate('MoreInfo')}>
      <Alert kind={kinds.INFO}>{translate('UnofficialForkNotice')}</Alert>

      <DescriptionList>
        <DescriptionListItemTitle>
          {translate('Source')}
        </DescriptionListItemTitle>
        <DescriptionListItemDescription>
          <Link to="https://github.com/dervish666/readarr-redux">
            github.com/dervish666/readarr-redux
          </Link>
        </DescriptionListItemDescription>

        <DescriptionListItemTitle>
          {translate('Issues')}
        </DescriptionListItemTitle>
        <DescriptionListItemDescription>
          <Link to="https://github.com/dervish666/readarr-redux/issues">
            github.com/dervish666/readarr-redux/issues
          </Link>
        </DescriptionListItemDescription>

        <DescriptionListItemTitle>
          {translate('Discussions')}
        </DescriptionListItemTitle>
        <DescriptionListItemDescription>
          <Link to="https://github.com/dervish666/readarr-redux/discussions">
            github.com/dervish666/readarr-redux/discussions
          </Link>
        </DescriptionListItemDescription>

        <DescriptionListItemTitle>
          {translate('UpstreamWiki')}
        </DescriptionListItemTitle>
        <DescriptionListItemDescription>
          <Link to="https://wiki.servarr.com/readarr">
            wiki.servarr.com/readarr
          </Link>
        </DescriptionListItemDescription>

        <DescriptionListItemTitle>
          {translate('Upstream')}
        </DescriptionListItemTitle>
        <DescriptionListItemDescription>
          <Link to="https://github.com/Readarr/Readarr">
            github.com/Readarr/Readarr
          </Link>{' '}
          ({translate('Retired')})
        </DescriptionListItemDescription>
      </DescriptionList>
    </FieldSet>
  );
}

export default MoreInfo;
