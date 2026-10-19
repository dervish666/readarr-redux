import classNames from 'classnames';
import React, {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import FileBrowserModal from 'Components/FileBrowser/FileBrowserModal';
import Icon from 'Components/Icon';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { icons } from 'Helpers/Props';
import { Path } from 'Path/usePaths';
import translate from 'Utilities/String/translate';
import AutoSuggestInput from './AutoSuggestInput';
import FormInputButton from './FormInputButton';
import type { PathInputProps } from './PathInput';
import styles from './PathInput.module.css';

export interface PathInputInternalProps extends PathInputProps {
  paths: Path[];
  onFetchPaths: (path: string) => void;
}

function getSuggestionValue({ path }: Path) {
  return path;
}

function renderSuggestion(
  { path }: Path,
  { query }: { query: string }
): ReactNode {
  const lastSeparatorIndex = query.lastIndexOf('\\') || query.lastIndexOf('/');

  if (lastSeparatorIndex === -1) {
    return <span>{path}</span>;
  }

  return (
    <span>
      <span className={styles.pathMatch}>
        {path.substring(0, lastSeparatorIndex)}
      </span>
      {path.substring(lastSeparatorIndex)}
    </span>
  );
}

function handleSuggestionsClearRequested() {
  // Required because props aren't always rendered, but no-op
  // because we don't want to reset the paths after a path is selected.
}

// The input itself; PathInput and the file browser each supply the paths.
function PathInputInternal({
  className = styles.inputWrapper,
  name,
  value: inputValue = '',
  paths,
  includeFiles,
  hasFileBrowser = true,
  onChange,
  onFetchPaths,
  ...otherProps
}: PathInputInternalProps) {
  const [value, setValue] = useState(inputValue);
  const [isFileBrowserModalOpen, setIsFileBrowserModalOpen] = useState(false);
  const previousInputValue = usePrevious(inputValue);

  useEffect(() => {
    if (inputValue !== previousInputValue) {
      setValue(inputValue);
    }
  }, [inputValue, previousInputValue]);

  const handleInputChange = useCallback(
    ({ value: newValue }: { value: string }) => {
      setValue(newValue);
    },
    []
  );

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        const path = paths[0];

        if (path) {
          onChange({ name, value: path.path });

          if (path.type !== 'file') {
            onFetchPaths(path.path);
          }
        }
      }
    },
    [name, paths, onChange, onFetchPaths]
  );

  const handleInputBlur = useCallback(() => {
    onChange({ name, value });
  }, [name, value, onChange]);

  const handleSuggestionsFetchRequested = useCallback(
    ({ value: newValue }: { value: string }) => {
      onFetchPaths(newValue);
    },
    [onFetchPaths]
  );

  const handleSuggestionSelected = useCallback(
    (_event: unknown, { suggestionValue }: { suggestionValue: string }) => {
      onFetchPaths(suggestionValue);
    },
    [onFetchPaths]
  );

  const handleFileBrowserOpenPress = useCallback(() => {
    setIsFileBrowserModalOpen(true);
  }, []);

  const handleFileBrowserModalClose = useCallback(() => {
    setIsFileBrowserModalOpen(false);
  }, []);

  return (
    <div
      className={classNames(
        className,
        hasFileBrowser && styles.fileBrowserGroup
      )}
    >
      <AutoSuggestInput
        {...otherProps}
        className={hasFileBrowser ? styles.hasFileBrowser : styles.pathInput}
        name={name}
        value={value}
        suggestions={paths}
        getSuggestionValue={getSuggestionValue}
        renderSuggestion={renderSuggestion}
        onInputKeyDown={handleInputKeyDown}
        onInputBlur={handleInputBlur}
        onSuggestionSelected={handleSuggestionSelected}
        onSuggestionsFetchRequested={handleSuggestionsFetchRequested}
        onSuggestionsClearRequested={handleSuggestionsClearRequested}
        onChange={handleInputChange}
      />

      {hasFileBrowser ? (
        <>
          <FormInputButton
            className={styles.fileBrowserButton}
            aria-label={translate('FileBrowser')}
            onPress={handleFileBrowserOpenPress}
          >
            <Icon name={icons.FOLDER_OPEN} />
          </FormInputButton>

          <FileBrowserModal
            isOpen={isFileBrowserModalOpen}
            name={name}
            value={value}
            includeFiles={includeFiles}
            onChange={onChange}
            onModalClose={handleFileBrowserModalClose}
          />
        </>
      ) : null}
    </div>
  );
}

export default PathInputInternal;
