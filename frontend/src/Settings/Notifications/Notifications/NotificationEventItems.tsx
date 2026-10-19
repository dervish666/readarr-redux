import React from 'react';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormInputHelpText from 'Components/Form/FormInputHelpText';
import FormLabel from 'Components/Form/FormLabel';
import { inputTypes } from 'Helpers/Props';
import { PendingProviderSection } from 'typings/pending';
import translate from 'Utilities/String/translate';
import { NotificationModel } from '../useConnections';
import styles from './NotificationEventItems.module.css';

interface NotificationEventItemsProps {
  item: PendingProviderSection<NotificationModel>;
  onInputChange: (change: { name: string; value: unknown }) => void;
}

type TriggerName = keyof NotificationModel & `on${string}`;

interface Trigger {
  name: TriggerName | 'includeHealthWarnings';
  helpText: string;
  // The supportsOn* flag that enables the checkbox.
  supportedBy: keyof NotificationModel & `supportsOn${string}`;
  // Shown only while this trigger is on.
  dependsOn?: TriggerName;
}

// Readarr's order. On Book File Delete For Upgrade follows On Book File Delete's
// support flag, as it always has.
const TRIGGERS: Trigger[] = [
  { name: 'onGrab', helpText: 'OnGrabHelpText', supportedBy: 'supportsOnGrab' },
  {
    name: 'onReleaseImport',
    helpText: 'OnReleaseImportHelpText',
    supportedBy: 'supportsOnReleaseImport',
  },
  {
    name: 'onUpgrade',
    helpText: 'OnUpgradeHelpText',
    supportedBy: 'supportsOnUpgrade',
    dependsOn: 'onReleaseImport',
  },
  {
    name: 'onDownloadFailure',
    helpText: 'OnDownloadFailureHelpText',
    supportedBy: 'supportsOnDownloadFailure',
  },
  {
    name: 'onImportFailure',
    helpText: 'OnImportFailureHelpText',
    supportedBy: 'supportsOnImportFailure',
  },
  {
    name: 'onRename',
    helpText: 'OnRenameHelpText',
    supportedBy: 'supportsOnRename',
  },
  {
    name: 'onAuthorAdded',
    helpText: 'OnAuthorAddedHelpText',
    supportedBy: 'supportsOnAuthorAdded',
  },
  {
    name: 'onAuthorDelete',
    helpText: 'OnAuthorDeleteHelpText',
    supportedBy: 'supportsOnAuthorDelete',
  },
  {
    name: 'onBookDelete',
    helpText: 'OnBookDeleteHelpText',
    supportedBy: 'supportsOnBookDelete',
  },
  {
    name: 'onBookFileDelete',
    helpText: 'OnBookFileDeleteHelpText',
    supportedBy: 'supportsOnBookFileDelete',
  },
  {
    name: 'onBookFileDeleteForUpgrade',
    helpText: 'OnBookFileDeleteForUpgradeHelpText',
    supportedBy: 'supportsOnBookFileDelete',
  },
  {
    name: 'onBookRetag',
    helpText: 'OnBookRetagHelpText',
    supportedBy: 'supportsOnBookRetag',
  },
  {
    name: 'onApplicationUpdate',
    helpText: 'OnApplicationUpdateHelpText',
    supportedBy: 'supportsOnApplicationUpdate',
  },
  {
    name: 'onHealthIssue',
    helpText: 'OnHealthIssueHelpText',
    supportedBy: 'supportsOnHealthIssue',
  },
  {
    name: 'includeHealthWarnings',
    helpText: 'IncludeHealthWarningsHelpText',
    supportedBy: 'supportsOnHealthIssue',
    dependsOn: 'onHealthIssue',
  },
];

function NotificationEventItems({
  item,
  onInputChange,
}: NotificationEventItemsProps) {
  return (
    <FormGroup>
      <FormLabel>{translate('NotificationTriggers')}</FormLabel>

      <div>
        <FormInputHelpText
          text={translate('NotificationTriggersHelpText')}
          link="https://wiki.servarr.com/readarr/settings#connections"
        />

        <div className={styles.events}>
          {TRIGGERS.map(({ name, helpText, supportedBy, dependsOn }) => {
            if (dependsOn && !item[dependsOn].value) {
              return null;
            }

            return (
              <div key={name}>
                <FormInputGroup
                  type={inputTypes.CHECK}
                  name={name}
                  helpText={translate(helpText)}
                  isDisabled={!item[supportedBy].value}
                  {...item[name]}
                  onChange={onInputChange}
                />
              </div>
            );
          })}
        </div>
      </div>
    </FormGroup>
  );
}

export default NotificationEventItems;
