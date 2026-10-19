import React, { useCallback, useState } from 'react';
import MiddleTruncate from 'react-middle-truncate';
import Label from 'Components/Label';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import SettingsCard from 'Components/SettingsCard/SettingsCard';
import settingsCardStyles from 'Components/SettingsCard/SettingsCard.css';
import SettingsCardAction from 'Components/SettingsCard/SettingsCardAction';
import SettingsCardStatus from 'Components/SettingsCard/SettingsCardStatus';
import { icons, kinds } from 'Helpers/Props';
import translate from 'Utilities/String/translate';
import EditCustomFormatModal from './EditCustomFormatModal';
import ExportCustomFormatModal from './ExportCustomFormatModal';
import {
  CustomFormatSpecification,
  useDeleteCustomFormat,
} from './useCustomFormats';

interface CustomFormatProps {
  id: number;
  name: string;
  specifications: CustomFormatSpecification[];
  onCloneCustomFormatPress: (id: number) => void;
}

function CustomFormat({
  id,
  name,
  specifications,
  onCloneCustomFormatPress,
}: CustomFormatProps) {
  const { deleteCustomFormat, isDeleting } = useDeleteCustomFormat(id);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleEditPress = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);

  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const handleDeletePress = useCallback(() => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteModalClose = useCallback(() => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    // The card unmounts once the format leaves the list.
    deleteCustomFormat();
  }, [deleteCustomFormat]);

  const handleClonePress = useCallback(() => {
    onCloneCustomFormatPress(id);
  }, [id, onCloneCustomFormatPress]);

  const handleExportPress = useCallback(() => {
    setIsExportModalOpen(true);
  }, []);

  const handleExportModalClose = useCallback(() => {
    setIsExportModalOpen(false);
  }, []);

  const conditionCount = specifications.length;

  return (
    <SettingsCard
      name={name}
      aria-label={translate('EditCustomFormatName', { name })}
      actions={
        <>
          <SettingsCardAction
            title={translate('CloneCustomFormat')}
            aria-label={translate('CloneCustomFormat')}
            name={icons.CLONE}
            onPress={handleClonePress}
          />

          <SettingsCardAction
            title={translate('ExportCustomFormat')}
            aria-label={translate('ExportCustomFormat')}
            name={icons.EXPORT}
            onPress={handleExportPress}
          />
        </>
      }
      onPress={handleEditPress}
    >
      <SettingsCardStatus
        dot={conditionCount ? 'active' : 'muted'}
        segments={[translate('ConditionsCount', { count: conditionCount })]}
      />

      {conditionCount ? (
        <div className={settingsCardStyles.labels}>
          {specifications.map((specification, index) => {
            if (!specification) {
              return null;
            }

            let kind = kinds.DEFAULT;

            if (specification.required) {
              kind = kinds.SUCCESS;
            }

            if (specification.negate) {
              kind = kinds.DANGER;
            }

            return (
              <Label
                key={index}
                className={settingsCardStyles.truncatedLabel}
                kind={kind}
              >
                <MiddleTruncate text={specification.name} start={10} end={10} />
              </Label>
            );
          })}
        </div>
      ) : null}

      <EditCustomFormatModal
        id={id}
        isOpen={isEditModalOpen}
        onModalClose={handleEditModalClose}
        onDeleteCustomFormatPress={handleDeletePress}
      />

      <ExportCustomFormatModal
        id={id}
        isOpen={isExportModalOpen}
        onModalClose={handleExportModalClose}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteCustomFormat')}
        message={translate('DeleteCustomFormatMessageText', { name })}
        confirmLabel={translate('Delete')}
        isSpinning={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleDeleteModalClose}
      />
    </SettingsCard>
  );
}

export default CustomFormat;
