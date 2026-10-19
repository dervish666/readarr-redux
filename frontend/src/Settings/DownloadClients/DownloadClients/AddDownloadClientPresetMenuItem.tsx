import React, { useCallback } from 'react';
import MenuItem from 'Components/Menu/MenuItem';
import { SelectedSchema } from 'Settings/useProviderSchema';

interface AddDownloadClientPresetMenuItemProps {
  name: string;
  implementation: string;
  implementationName: string;
  onPress: (selectedSchema: SelectedSchema) => void;
}

function AddDownloadClientPresetMenuItem({
  name,
  implementation,
  implementationName,
  onPress,
}: AddDownloadClientPresetMenuItemProps) {
  const handlePress = useCallback(() => {
    onPress({ implementation, implementationName, presetName: name });
  }, [name, implementation, implementationName, onPress]);

  return <MenuItem onPress={handlePress}>{name}</MenuItem>;
}

export default AddDownloadClientPresetMenuItem;
