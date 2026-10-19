import React, { useCallback, useMemo } from 'react';
import Icon from 'Components/Icon';
import { icons } from 'Helpers/Props';
import useProviderOptions, {
  ProviderOptionsData,
} from 'Settings/useProviderOptions';
import FormInputButton from './FormInputButton';
import TagInput from './TagInput';
import styles from './DeviceInput.module.css';

interface Device {
  id: string | number;
  name: string;
}

interface DeviceTag {
  id?: string | number;
  name: string;
}

interface DeviceInputProps {
  className?: string;
  name: string;
  value: (string | number)[];
  hasError?: boolean;
  hasWarning?: boolean;
  provider: string;
  providerData: ProviderOptionsData;
  onChange: (change: { name: string; value: (string | number)[] }) => void;
}

// inputTypes.DEVICE: a tag input of the devices a provider reports (Pushbullet),
// which also takes device IDs typed by hand.
function DeviceInput({
  className = styles.deviceInputWrapper,
  name,
  value,
  hasError,
  hasWarning,
  provider,
  providerData,
  onChange,
}: DeviceInputProps) {
  // Without an API key the action answers { devices: [] } instead of options.
  const { data, isFetching, refetch } = useProviderOptions<{
    options?: Device[];
  }>({
    provider,
    action: 'getDevices',
    providerData,
  });

  const { items, selectedDevices } = useMemo(() => {
    const devices = data?.options ?? [];

    return {
      items: devices,
      selectedDevices: value.map((valueDevice) => {
        // IDs typed by hand are strings; the provider's may be numbers.
        const device = devices.find(
          (d) => String(d.id) === String(valueDevice)
        );

        if (device) {
          return { id: device.id, name: `${device.name} (${device.id})` };
        }

        return { id: valueDevice, name: `Unknown (${valueDevice})` };
      }),
    };
  }, [data, value]);

  const handleRefreshPress = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleTagAdd = useCallback(
    (device: DeviceTag) => {
      // New tags won't have an ID, only a name.
      const deviceId = device.id || device.name;

      onChange({ name, value: [...value, deviceId] });
    },
    [name, value, onChange]
  );

  const handleTagDelete = useCallback(
    ({ index }: { index: number }) => {
      const newValue = value.slice();
      newValue.splice(index, 1);

      onChange({ name, value: newValue });
    },
    [name, value, onChange]
  );

  return (
    <div className={className}>
      <TagInput
        inputContainerClassName={styles.input}
        name={name}
        tags={selectedDevices}
        tagList={items}
        allowNew={true}
        minQueryLength={0}
        hasError={hasError}
        hasWarning={hasWarning}
        onTagAdd={handleTagAdd}
        onTagDelete={handleTagDelete}
      />

      <FormInputButton onPress={handleRefreshPress}>
        <Icon name={icons.REFRESH} isSpinning={isFetching} />
      </FormInputButton>
    </div>
  );
}

export default DeviceInput;
