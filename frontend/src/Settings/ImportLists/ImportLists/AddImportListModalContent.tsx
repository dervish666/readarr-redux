import React, { useMemo } from 'react';
import Alert from 'Components/Alert';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { kinds } from 'Helpers/Props';
import { SelectedSchema } from 'Settings/useProviderSchema';
import titleCase from 'Utilities/String/titleCase';
import translate from 'Utilities/String/translate';
import AddImportListItem from './AddImportListItem';
import { ImportListModel, useImportListSchema } from './useImportLists';
import styles from './AddImportListModalContent.module.css';

export interface AddImportListModalContentProps {
  onImportListSelect: (selectedSchema: SelectedSchema) => void;
  onModalClose: () => void;
}

function AddImportListModalContent({
  onImportListSelect,
  onModalClose,
}: AddImportListModalContentProps) {
  const { isSchemaLoading, isSchemaFetched, schemaError, schema } =
    useImportListSchema();

  // Grouped by list type (program, Goodreads, other), each in list order.
  const listGroups = useMemo(() => {
    const groups = [...schema]
      .sort((a, b) => a.listOrder - b.listOrder)
      .reduce<Record<string, ImportListModel[]>>((acc, item) => {
        acc[item.listType] = acc[item.listType] ?? [];
        acc[item.listType].push(item);

        return acc;
      }, {});

    return Object.entries(groups);
  }, [schema]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('AddImportList')}</ModalHeader>

      <ModalBody>
        {isSchemaLoading ? <LoadingIndicator /> : null}

        {!isSchemaLoading && !!schemaError ? (
          <Alert kind={kinds.DANGER}>
            {translate('UnableToAddANewListPleaseTryAgain')}
          </Alert>
        ) : null}

        {isSchemaFetched && !schemaError ? (
          <>
            <Alert kind={kinds.INFO}>
              <div>
                {translate(
                  'ReadarrSupportsMultipleListsForImportingBooksAndAuthorsIntoTheDatabase'
                )}
              </div>
              <div>
                {translate(
                  'ForMoreInformationOnTheIndividualListsClickOnTheInfoButtons'
                )}
              </div>
            </Alert>

            <div className={styles.lists}>
              {listGroups.map(([listType, lists]) => (
                <div key={listType} className={styles.group}>
                  <h3 className={styles.groupHeading}>
                    {translate('TypeOfList', {
                      typeOfList: titleCase(listType),
                    })}
                  </h3>

                  {lists.map((list) => (
                    <AddImportListItem
                      key={list.implementation}
                      {...list}
                      onImportListSelect={onImportListSelect}
                    />
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Close')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default AddImportListModalContent;
