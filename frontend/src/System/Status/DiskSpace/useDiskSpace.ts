import useApiQuery from 'Helpers/Hooks/useApiQuery';
import DiskSpace from 'typings/DiskSpace';

const NO_DISK_SPACE: DiskSpace[] = [];

const useDiskSpace = () => {
  const result = useApiQuery<DiskSpace[]>({
    path: '/diskspace',
  });

  return {
    ...result,
    data: result.data ?? NO_DISK_SPACE,
  };
};

export default useDiskSpace;
