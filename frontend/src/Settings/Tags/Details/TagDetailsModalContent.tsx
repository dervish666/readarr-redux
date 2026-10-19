import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import ModelBase from 'App/ModelBase';
import Author from 'Author/Author';
import FieldSet from 'Components/FieldSet';
import Label from 'Components/Label';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import TagDetailsDelayProfile from './TagDetailsDelayProfile';
import styles from './TagDetailsModalContent.css';

interface NamedItem extends ModelBase {
  name: string;
}

interface DelayProfile extends ModelBase {
  preferredProtocol: string;
  enableUsenet: boolean;
  enableTorrent: boolean;
  usenetDelay: number;
  torrentDelay: number;
}

interface ReleaseProfile extends ModelBase {
  required: string[];
  ignored: string[];
}

// Authors and these settings are still redux feeds; only the parts read here.
interface TagLinksState {
  authors: { items: Author[] };
  settings: {
    delayProfiles: { items: DelayProfile[] };
    importLists: { items: NamedItem[] };
    notifications: { items: NamedItem[] };
    releaseProfiles: { items: ReleaseProfile[] };
    indexers: { items: NamedItem[] };
    downloadClients: { items: NamedItem[] };
  };
}

function useMatchingItems<T extends ModelBase>(
  ids: number[],
  selectItems: (state: TagLinksState) => T[]
) {
  const items = useSelector(selectItems);

  return useMemo(
    () => items.filter((item) => ids.includes(item.id)),
    [ids, items]
  );
}

export interface TagDetailsModalContentProps {
  label: string;
  isTagUsed: boolean;
  authorIds: number[];
  delayProfileIds: number[];
  importListIds: number[];
  notificationIds: number[];
  releaseProfileIds: number[];
  indexerIds: number[];
  downloadClientIds: number[];
  onModalClose: () => void;
  onDeleteTagPress: () => void;
}

function TagDetailsModalContent({
  label,
  isTagUsed,
  authorIds,
  delayProfileIds,
  importListIds,
  notificationIds,
  releaseProfileIds,
  indexerIds,
  downloadClientIds,
  onModalClose,
  onDeleteTagPress,
}: TagDetailsModalContentProps) {
  const matchingAuthors = useMatchingItems(
    authorIds,
    (state) => state.authors.items
  );

  const authors = useMemo(
    () =>
      [...matchingAuthors].sort((a, b) => a.sortName.localeCompare(b.sortName)),
    [matchingAuthors]
  );

  const delayProfiles = useMatchingItems(
    delayProfileIds,
    (state) => state.settings.delayProfiles.items
  );
  const importLists = useMatchingItems(
    importListIds,
    (state) => state.settings.importLists.items
  );
  const notifications = useMatchingItems(
    notificationIds,
    (state) => state.settings.notifications.items
  );
  const releaseProfiles = useMatchingItems(
    releaseProfileIds,
    (state) => state.settings.releaseProfiles.items
  );
  const indexers = useMatchingItems(
    indexerIds,
    (state) => state.settings.indexers.items
  );
  const downloadClients = useMatchingItems(
    downloadClientIds,
    (state) => state.settings.downloadClients.items
  );

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('TagDetails', { label })}</ModalHeader>

      <ModalBody>
        {isTagUsed ? null : (
          <div>{translate('TagIsNotUsedAndCanBeDeleted')}</div>
        )}

        {authors.length ? (
          <FieldSet legend={translate('Authors')}>
            {authors.map((item) => {
              return <div key={item.id}>{item.authorName}</div>;
            })}
          </FieldSet>
        ) : null}

        {delayProfiles.length ? (
          <FieldSet legend={translate('DelayProfile')}>
            {delayProfiles.map((item) => {
              return (
                <TagDetailsDelayProfile
                  key={item.id}
                  preferredProtocol={item.preferredProtocol}
                  enableUsenet={item.enableUsenet}
                  enableTorrent={item.enableTorrent}
                  usenetDelay={item.usenetDelay}
                  torrentDelay={item.torrentDelay}
                />
              );
            })}
          </FieldSet>
        ) : null}

        {notifications.length ? (
          <FieldSet legend={translate('Connections')}>
            {notifications.map((item) => {
              return <div key={item.id}>{item.name}</div>;
            })}
          </FieldSet>
        ) : null}

        {importLists.length ? (
          <FieldSet legend={translate('ImportLists')}>
            {importLists.map((item) => {
              return <div key={item.id}>{item.name}</div>;
            })}
          </FieldSet>
        ) : null}

        {releaseProfiles.length ? (
          <FieldSet legend={translate('ReleaseProfiles')}>
            {releaseProfiles.map((item) => {
              return (
                <div key={item.id} className={styles.restriction}>
                  <div>
                    {item.required.map((term) => {
                      return (
                        <Label key={term} kind={kinds.SUCCESS}>
                          {term}
                        </Label>
                      );
                    })}
                  </div>

                  <div>
                    {item.ignored.map((term) => {
                      return (
                        <Label key={term} kind={kinds.DANGER}>
                          {term}
                        </Label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </FieldSet>
        ) : null}

        {indexers.length ? (
          <FieldSet legend={translate('Indexers')}>
            {indexers.map((item) => {
              return <div key={item.id}>{item.name}</div>;
            })}
          </FieldSet>
        ) : null}

        {downloadClients.length ? (
          <FieldSet legend={translate('DownloadClients')}>
            {downloadClients.map((item) => {
              return <div key={item.id}>{item.name}</div>;
            })}
          </FieldSet>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button
          className={styles.deleteButton}
          kind={kinds.DANGER}
          title={
            isTagUsed
              ? translate('IsTagUsedCannotBeDeletedWhileInUse')
              : undefined
          }
          isDisabled={isTagUsed}
          onPress={onDeleteTagPress}
        >
          {translate('Delete')}
        </Button>

        <Button onPress={onModalClose}>{translate('Close')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default TagDetailsModalContent;
