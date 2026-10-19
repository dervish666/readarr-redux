import { useMemo } from 'react';
import useRootFolders from 'RootFolder/useRootFolders';
import { useDownloadClientsData } from 'Settings/DownloadClients/DownloadClients/useDownloadClients';

// The hosts a remote path mapping can name: every download client's host field,
// plus the hosts of Calibre root folders, each hinted with who uses it.
export default function useDownloadClientHostOptions() {
  const downloadClients = useDownloadClientsData();
  const { data: rootFolders } = useRootFolders();

  return useMemo(() => {
    const hosts: Record<string, string[]> = {};

    const addHost = (host: unknown, name: string) => {
      if (typeof host !== 'string') {
        return;
      }

      hosts[host] = hosts[host] ?? [];
      hosts[host].push(name);
    };

    downloadClients.forEach((downloadClient) => {
      const host = downloadClient.fields.find((field) => field.name === 'host');

      if (host) {
        addHost(host.value, downloadClient.name);
      }
    });

    rootFolders.forEach((folder) => {
      if (folder.isCalibreLibrary) {
        addHost(folder.host, folder.name);
      }
    });

    return Object.keys(hosts).map((host) => ({
      key: host,
      value: host,
      hint: hosts[host].join(', '),
    }));
  }, [downloadClients, rootFolders]);
}
