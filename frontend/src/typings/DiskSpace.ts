interface DiskSpace {
  id: number;
  path: string;
  label: string;
  freeSpace: number;
  totalSpace: number;
}

export default DiskSpace;
