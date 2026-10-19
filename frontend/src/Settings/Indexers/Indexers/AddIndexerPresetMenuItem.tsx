import React, { useCallback } from 'react';
import MenuItem from 'Components/Menu/MenuItem';
import { SelectedSchema } from 'Settings/useProviderSchema';

interface AddIndexerPresetMenuItemProps {
  name: string;
  implementation: string;
  implementationName: string;
  onPress: (selectedSchema: SelectedSchema) => void;
}

function AddIndexerPresetMenuItem({
  name,
  implementation,
  implementationName,
  onPress,
}: AddIndexerPresetMenuItemProps) {
  const handlePress = useCallback(() => {
    onPress({ implementation, implementationName, presetName: name });
  }, [name, implementation, implementationName, onPress]);

  return <MenuItem onPress={handlePress}>{name}</MenuItem>;
}

export default AddIndexerPresetMenuItem;
