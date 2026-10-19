import React, { useCallback, useMemo, useState } from 'react';
import Card from 'Components/Card';
import Label from 'Components/Label';
import IconButton from 'Components/Link/IconButton';
import ConfirmModal from 'Components/Modal/ConfirmModal';
import { icons, kinds, sizes } from 'Helpers/Props';
import Field from 'typings/Field';
import translate from 'Utilities/String/translate';
import { CustomFormatSpecification } from '../useCustomFormats';
import EditSpecificationModal from './EditSpecificationModal';
import styles from './Specification.css';

interface SpecificationProps {
  id: number;
  implementation: string;
  implementationName: string;
  infoLink: string;
  name: string;
  negate: boolean;
  required: boolean;
  fields: Field[];
  onSaveSpecification: (spec: CustomFormatSpecification) => void;
  onConfirmDeleteSpecification: (specId: number) => void;
  onCloneSpecificationPress: (specId: number) => void;
}

function Specification({
  id,
  implementation,
  implementationName,
  infoLink,
  name,
  negate,
  required,
  fields,
  onSaveSpecification,
  onConfirmDeleteSpecification,
  onCloneSpecificationPress,
}: SpecificationProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const spec = useMemo<CustomFormatSpecification>(
    () => ({
      id,
      implementation,
      implementationName,
      infoLink,
      name,
      negate,
      required,
      fields,
    }),
    [
      id,
      implementation,
      implementationName,
      infoLink,
      name,
      negate,
      required,
      fields,
    ]
  );

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
    setIsDeleteModalOpen(false);
    onConfirmDeleteSpecification(id);
  }, [id, onConfirmDeleteSpecification]);

  const handleClonePress = useCallback(() => {
    onCloneSpecificationPress(id);
  }, [id, onCloneSpecificationPress]);

  return (
    <Card
      className={styles.specification}
      overlayClassName={styles.overlay}
      overlayContent={true}
      aria-label={translate('EditConditionImplementation', {
        implementationName,
      })}
      onPress={handleEditPress}
    >
      <div className={styles.nameContainer}>
        <div className={styles.name}>{name}</div>

        <div className={styles.rightCluster}>
          <IconButton
            className={styles.cloneButton}
            title={translate('CloneCondition')}
            aria-label={translate('CloneCondition')}
            name={icons.CLONE}
            onPress={handleClonePress}
          />
        </div>
      </div>

      <div className={styles.labels}>
        <Label kind={kinds.DEFAULT} size={sizes.MEDIUM}>
          {implementationName}
        </Label>

        {negate ? (
          <Label kind={kinds.DANGER} size={sizes.MEDIUM}>
            {translate('Negated')}
          </Label>
        ) : null}

        {required ? (
          <Label kind={kinds.SUCCESS} size={sizes.MEDIUM}>
            {translate('Required')}
          </Label>
        ) : null}
      </div>

      <EditSpecificationModal
        isOpen={isEditModalOpen}
        specification={spec}
        onSave={onSaveSpecification}
        onDeleteSpecificationPress={handleDeletePress}
        onModalClose={handleEditModalClose}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        kind={kinds.DANGER}
        title={translate('DeleteCondition')}
        message={translate('DeleteConditionMessageText', { name })}
        confirmLabel={translate('Delete')}
        onConfirm={handleConfirmDelete}
        onCancel={handleDeleteModalClose}
      />
    </Card>
  );
}

export default Specification;
