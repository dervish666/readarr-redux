import { useMutation, useQueryClient } from '@tanstack/react-query';
import useApiMutation from 'Helpers/Hooks/useApiMutation';
import useApiQuery from 'Helpers/Hooks/useApiQuery';
import Backup from 'typings/Backup';
import { ApiError, ApiErrorResponse } from 'Utilities/Fetch/fetchJson';
import getQueryPath from 'Utilities/Fetch/getQueryPath';

const NO_BACKUPS: Backup[] = [];

const useBackups = () => {
  const result = useApiQuery<Backup[]>({
    path: '/system/backup',
  });

  return {
    ...result,
    data: result.data ?? NO_BACKUPS,
  };
};

export default useBackups;

export const useDeleteBackup = (id: number) => {
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useApiMutation<unknown, void>({
    path: `/system/backup/${id}`,
    method: 'DELETE',
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/system/backup'] });
      },
    },
  });

  return {
    deleteBackup: mutate,
    isDeleting: isPending,
    deleteError: error,
  };
};

interface RestoreBackupResponse {
  restartRequired: boolean;
}

export const useRestoreBackup = (id: number) => {
  const { mutate, isPending, error } = useApiMutation<
    RestoreBackupResponse,
    void
  >({
    path: `/system/backup/restore/${id}`,
    method: 'POST',
  });

  return {
    restoreBackupById: mutate,
    isRestoringBackup: isPending,
    restoreBackupError: error,
  };
};

// fetchJson always sends JSON, so the upload posts the multipart form itself.
export const useRestoreBackupUpload = () => {
  const { mutate, isPending, error } = useMutation<
    RestoreBackupResponse,
    ApiError,
    FormData
  >({
    mutationFn: async (formData: FormData) => {
      const path = getQueryPath('/system/backup/restore/upload');

      const response = await fetch(path, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-Api-Key': window.Readarr.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        let body: ApiErrorResponse | undefined = undefined;

        try {
          body = (await response.json()) as ApiErrorResponse;
        } catch {
          // No JSON body; the status alone describes the failure.
        }

        throw new ApiError(path, response.status, response.statusText, body);
      }

      return response.json();
    },
  });

  return {
    uploadBackup: mutate,
    isUploadingBackup: isPending,
    uploadBackupError: error,
  };
};
