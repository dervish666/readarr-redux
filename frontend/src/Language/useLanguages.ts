import useApiQuery from 'Helpers/Hooks/useApiQuery';

// Readarr.Api.V1/Languages/LanguageResource.
export interface Language {
  id: number;
  name: string;
  nameLower: string;
}

const useLanguages = () => {
  const result = useApiQuery<Language[]>({
    path: '/language',
    queryOptions: { staleTime: Infinity },
  });

  return {
    ...result,
    data: result.data ?? [],
  };
};

export default useLanguages;
