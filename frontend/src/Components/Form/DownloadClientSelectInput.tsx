import React, { useCallback, useMemo } from 'react';
import DownloadProtocol from 'DownloadClient/DownloadProtocol';
import { useDownloadClientsData } from 'Settings/DownloadClients/DownloadClients/useDownloadClients';
import translate from 'Utilities/String/translate';
import EnhancedSelectInput from './EnhancedSelectInput';

interface DownloadClientSelectInputProps {
  name: string;
  value: number | string;
  includeAny?: boolean;
  protocol?: DownloadProtocol;
  onChange: (change: { name: string; value: number }) => void;
  [key: string]: unknown;
}

// inputTypes.DOWNLOAD_CLIENT_SELECT: download clients of one protocol, 0 for "Any".
function DownloadClientSelectInput({
  includeAny = false,
  protocol = 'torrent',
  onChange,
  ...otherProps
}: DownloadClientSelectInputProps) {
  const downloadClients = useDownloadClientsData();

  const values = useMemo(() => {
    const options: { key: number; value: string; hint?: string }[] =
      downloadClients
        .filter((item) => item.protocol === protocol)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((downloadClient) => ({
          key: downloadClient.id,
          value: downloadClient.name,
          hint: `(${downloadClient.id})`,
        }));

    if (includeAny) {
      options.unshift({ key: 0, value: `(${translate('Any')})` });
    }

    return options;
  }, [downloadClients, includeAny, protocol]);

  const handleChange = useCallback(
    ({ name, value }: { name: string; value: number | string }) => {
      onChange({ name, value: parseInt(String(value)) });
    },
    [onChange]
  );

  return (
    <EnhancedSelectInput
      {...otherProps}
      values={values}
      onChange={handleChange}
    />
  );
}

export default DownloadClientSelectInput;
