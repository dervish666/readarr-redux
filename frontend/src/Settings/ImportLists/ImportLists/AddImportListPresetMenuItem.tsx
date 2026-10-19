import React, { useCallback } from 'react';
import MenuItem from 'Components/Menu/MenuItem';
import { SelectedSchema } from 'Settings/useProviderSchema';

interface AddImportListPresetMenuItemProps {
  name: string;
  implementation: string;
  implementationName: string;
  onPress: (selectedSchema: SelectedSchema) => void;
}

function AddImportListPresetMenuItem({
  name,
  implementation,
  implementationName,
  onPress,
}: AddImportListPresetMenuItemProps) {
  const handlePress = useCallback(() => {
    onPress({ implementation, implementationName, presetName: name });
  }, [name, implementation, implementationName, onPress]);

  return <MenuItem onPress={handlePress}>{name}</MenuItem>;
}

export default AddImportListPresetMenuItem;
