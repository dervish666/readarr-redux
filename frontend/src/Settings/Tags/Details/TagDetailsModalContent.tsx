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
import { useDownloadClientsData } from 'Settings/DownloadClients/DownloadClients/useDownloadClients';
import { useImportListsData } from 'Settings/ImportLists/ImportLists/useImportLists';
import { useIndexersData } from 'Settings/Indexers/useIndexers';
import { useConnectionsData } from 'Settings/Notifications/useConnections';
import { useDelayProfiles } from 'Settings/Profiles/Delay/useDelayProfiles';
import { useReleaseProfiles } from 'Settings/Profiles/Release/useReleaseProfiles';
import translate from 'Utilities/String/translate';
import TagDetailsDelayProfile from './TagDetailsDelayProfile';
import styles from './TagDetailsModalContent.css';

// Authors are still a redux feed; everything else here is on react-query.
interface TagLinksState {
  authors: { items: Author[] };
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

  const { data: allDelayProfiles } = useDelayProfiles();
  const delayProfiles = useMemo(
    () => allDelayProfiles.filter((item) => delayProfileIds.includes(item.id)),
    [allDelayProfiles, delayProfileIds]
  );
  const allImportLists = useImportListsData();
  const importLists = useMemo(
    () => allImportLists.filter((item) => importListIds.includes(item.id)),
    [allImportLists, importListIds]
  );
  const allNotifications = useConnectionsData();
  const notifications = useMemo(
    () => allNotifications.filter((item) => notificationIds.includes(item.id)),
    [allNotifications, notificationIds]
  );
  const { data: allReleaseProfiles } = useReleaseProfiles();
  const releaseProfiles = useMemo(
    () =>
      allReleaseProfiles.filter((item) => releaseProfileIds.includes(item.id)),
    [allReleaseProfiles, releaseProfileIds]
  );
  const allIndexers = useIndexersData();
  const indexers = useMemo(
    () => allIndexers.filter((item) => indexerIds.includes(item.id)),
    [allIndexers, indexerIds]
  );
  const allDownloadClients = useDownloadClientsData();
  const downloadClients = useMemo(
    () =>
      allDownloadClients.filter((item) => downloadClientIds.includes(item.id)),
    [allDownloadClients, downloadClientIds]
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
