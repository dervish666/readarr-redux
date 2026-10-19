import React, { useCallback, useEffect, useState } from 'react';
import Alert from 'Components/Alert';
import PathInputInternal from 'Components/Form/PathInputInternal';
import Button from 'Components/Link/Button';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import InlineMarkdown from 'Components/Markdown/InlineMarkdown';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import Scroller from 'Components/Scroller/Scroller';
import Column from 'Components/Table/Column';
import Table from 'Components/Table/Table';
import TableBody from 'Components/Table/TableBody';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { kinds, scrollDirections } from 'Helpers/Props';
import usePaths from 'Path/usePaths';
import { useSystemStatusData } from 'System/Status/useSystemStatus';
import translate from 'Utilities/String/translate';
import FileBrowserRow from './FileBrowserRow';
import styles from './FileBrowserModalContent.module.css';

const columns: Column[] = [
  {
    name: 'type',
    label: () => translate('Type'),
    isVisible: true,
  },
  {
    name: 'name',
    label: () => translate('Name'),
    isVisible: true,
  },
];

export interface FileBrowserModalContentProps {
  name: string;
  value: string;
  includeFiles?: boolean;
  onChange: (change: { name: string; value: string }) => void;
  onModalClose: () => void;
}

function FileBrowserModalContent({
  name,
  value,
  includeFiles = false,
  onChange,
  onModalClose,
}: FileBrowserModalContentProps) {
  const [currentPath, setCurrentPath] = useState(value);
  const previousValue = usePrevious(value);
  const systemStatus = useSystemStatusData();

  const { isFetching, isFetched, error, data } = usePaths({
    path: currentPath,
    allowFoldersWithoutTrailingSlashes: true,
    includeFiles,
  });

  const { directories, files, parent, paths } = data;
  const emptyParent = parent === '';
  const isWindowsService =
    !!systemStatus?.isWindows && systemStatus.mode === 'service';

  useEffect(() => {
    if (value !== previousValue && value !== currentPath) {
      setCurrentPath(value);
    }
  }, [value, previousValue, currentPath]);

  const handlePathChange = useCallback(
    ({ value: newValue }: { value: string }) => {
      setCurrentPath(newValue);
    },
    []
  );

  const handleOkPress = useCallback(() => {
    onChange({ name, value: currentPath });
    onModalClose();
  }, [name, currentPath, onChange, onModalClose]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('FileBrowser')}</ModalHeader>

      <ModalBody
        className={styles.modalBody}
        scrollDirection={scrollDirections.NONE}
      >
        {isWindowsService ? (
          <Alert className={styles.mappedDrivesWarning} kind={kinds.WARNING}>
            <InlineMarkdown
              data={translate('MappedNetworkDrivesWindowsService', {
                url: 'https://wiki.servarr.com/readarr/faq',
              })}
            />
          </Alert>
        ) : null}

        <PathInputInternal
          className={styles.pathInput}
          placeholder={translate('StartTypingOrSelectAPathBelow')}
          hasFileBrowser={false}
          includeFiles={includeFiles}
          paths={paths}
          name={name}
          value={currentPath}
          onChange={handlePathChange}
          onFetchPaths={setCurrentPath}
        />

        <Scroller
          className={styles.scroller}
          scrollDirection={scrollDirections.BOTH}
        >
          {error ? (
            <div className={styles.error} role="alert">
              {translate('ErrorLoadingContents')}
            </div>
          ) : null}

          {isFetched && !error ? (
            <Table horizontalScroll={false} columns={columns}>
              <TableBody>
                {emptyParent ? (
                  <FileBrowserRow
                    type="computer"
                    name={translate('MyComputer')}
                    path={parent}
                    onPress={setCurrentPath}
                  />
                ) : null}

                {!emptyParent && parent ? (
                  <FileBrowserRow
                    type="parent"
                    name="..."
                    path={parent}
                    onPress={setCurrentPath}
                  />
                ) : null}

                {directories.map((directory) => {
                  return (
                    <FileBrowserRow
                      key={directory.path}
                      type={directory.type}
                      name={directory.name}
                      path={directory.path}
                      onPress={setCurrentPath}
                    />
                  );
                })}

                {files.map((file) => {
                  return (
                    <FileBrowserRow
                      key={file.path}
                      type={file.type}
                      name={file.name}
                      path={file.path}
                      onPress={setCurrentPath}
                    />
                  );
                })}
              </TableBody>
            </Table>
          ) : null}
        </Scroller>
      </ModalBody>

      <ModalFooter>
        {isFetching ? (
          <LoadingIndicator className={styles.loading} size={20} />
        ) : null}

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <Button onPress={handleOkPress}>{translate('Ok')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default FileBrowserModalContent;
