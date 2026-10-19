import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Update from 'typings/Update';

const NO_UPDATES: Update[] = [];

const useUpdates = () => {
  const result = useApiQuery<Update[]>({
    path: '/update',
  });

  return {
    ...result,
    data: result.data ?? NO_UPDATES,
  };
};

export default useUpdates;
