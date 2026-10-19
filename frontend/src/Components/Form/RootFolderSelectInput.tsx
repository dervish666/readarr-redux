import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import usePrevious from 'Helpers/Hooks/usePrevious';
import useRootFolders from 'RootFolder/useRootFolders';
import EditRootFolderModal from 'Settings/MediaManagement/RootFolder/EditRootFolderModal';
import translate from 'Utilities/String/translate';
import EnhancedSelectInput from './EnhancedSelectInput';
import RootFolderSelectInputOption from './RootFolderSelectInputOption';
import RootFolderSelectInputSelectedValue from './RootFolderSelectInputSelectedValue';

const ADD_NEW_KEY = 'addNew';

interface RootFolderSelectValue {
  key: string;
  value: string;
  name?: string;
  freeSpace?: number;
  isMissing?: boolean;
  isDisabled?: boolean;
  isHidden?: boolean;
}

interface RootFolderSelectInputProps {
  name: string;
  value?: string | null;
  includeMissingValue?: boolean;
  includeNoChange?: boolean;
  includeNoChangeDisabled?: boolean;
  onChange: (change: { name: string; value: string }) => void;
  [key: string]: unknown;
}

// The root folder select (inputTypes.ROOT_FOLDER_SELECT). Root folders come from
// react-query; "Add a new path" opens the add root folder modal and selects the result.
function RootFolderSelectInput({
  name,
  value,
  includeMissingValue = false,
  includeNoChange = false,
  includeNoChangeDisabled = true,
  onChange,
  ...otherProps
}: RootFolderSelectInputProps) {
  const { data: rootFolders, isFetched } = useRootFolders();
  const [isAddNewRootFolderModalOpen, setIsAddNewRootFolderModalOpen] =
    useState(false);
  const hasSetDefault = useRef(false);

  const values = useMemo(() => {
    const result: RootFolderSelectValue[] = rootFolders.map((rootFolder) => {
      return {
        key: rootFolder.path,
        value: rootFolder.path,
        name: rootFolder.name,
        freeSpace: rootFolder.freeSpace,
        isMissing: false,
      };
    });

    if (includeNoChange) {
      result.unshift({
        key: 'noChange',
        value: translate('NoChange'),
        isDisabled: includeNoChangeDisabled,
        isMissing: false,
      });
    }

    if (!result.length) {
      result.push({
        key: '',
        value: '',
        isDisabled: true,
        isHidden: true,
      });
    }

    if (includeMissingValue && value && !result.some((v) => v.key === value)) {
      result.push({
        key: value,
        value,
        isMissing: true,
        isDisabled: true,
      });
    }

    result.push({
      key: ADD_NEW_KEY,
      value: translate('AddANewPath'),
    });

    return result;
  }, [
    rootFolders,
    value,
    includeMissingValue,
    includeNoChange,
    includeNoChangeDisabled,
  ]);

  const previousValues = usePrevious(values);

  useEffect(() => {
    // Wait for the list before choosing a default, or a value that is about to
    // appear in it would be replaced.
    if (!isFetched) {
      return;
    }

    const defaultValue = values[0];

    if (!hasSetDefault.current) {
      hasSetDefault.current = true;

      if (
        !value ||
        value === ADD_NEW_KEY ||
        !values.some((v) => v.key === value)
      ) {
        onChange({
          name,
          value: defaultValue.key === ADD_NEW_KEY ? '' : defaultValue.key,
        });
      }

      return;
    }

    if (
      previousValues !== values &&
      !value &&
      values.some((v) => !!v.key && v.key !== ADD_NEW_KEY) &&
      defaultValue.key !== ADD_NEW_KEY
    ) {
      onChange({ name, value: defaultValue.key });
    }
  }, [isFetched, name, value, values, previousValues, onChange]);

  const handleChange = useCallback(
    (change: { name: string; value: string }) => {
      if (change.value === ADD_NEW_KEY) {
        setIsAddNewRootFolderModalOpen(true);
      } else {
        onChange(change);
      }
    },
    [onChange]
  );

  const handleRootFolderAdded = useCallback(
    (path: string) => {
      onChange({ name, value: path });
    },
    [name, onChange]
  );

  const handleAddRootFolderModalClose = useCallback(() => {
    setIsAddNewRootFolderModalOpen(false);
  }, []);

  return (
    <div>
      <EnhancedSelectInput
        {...otherProps}
        name={name}
        value={value ?? ''}
        values={values}
        selectedValueComponent={RootFolderSelectInputSelectedValue}
        optionComponent={RootFolderSelectInputOption}
        onChange={handleChange}
      />

      <EditRootFolderModal
        isOpen={isAddNewRootFolderModalOpen}
        onModalClose={handleAddRootFolderModalClose}
        onRootFolderAdded={handleRootFolderAdded}
      />
    </div>
  );
}

export default RootFolderSelectInput;
