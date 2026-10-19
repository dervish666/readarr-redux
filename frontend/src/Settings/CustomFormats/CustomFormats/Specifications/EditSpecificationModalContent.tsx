import React, { useCallback, useMemo } from 'react';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import ProviderFieldFormGroup from 'Components/Form/ProviderFieldFormGroup';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import InlineMarkdown from 'Components/Markdown/InlineMarkdown';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { usePendingChangesStore } from 'Helpers/Hooks/usePendingChangesStore';
import { usePendingFieldsStore } from 'Helpers/Hooks/usePendingFieldsStore';
import { inputTypes, kinds } from 'Helpers/Props';
import { useShowAdvancedSettings } from 'Settings/advancedSettingsStore';
import { PendingField, PendingSection } from 'typings/pending';
import selectSettings from 'Utilities/selectSettings';
import translate from 'Utilities/String/translate';
import { CustomFormatSpecification } from '../useCustomFormats';
import styles from './EditSpecificationModalContent.module.css';

export interface EditSpecificationModalContentProps {
  specification: CustomFormatSpecification;
  onSave: (spec: CustomFormatSpecification) => void;
  onDeleteSpecificationPress?: () => void;
  onModalClose: () => void;
}

// selectSettings turns fields into PendingFields and leaves implementationName bare.
type PendingSpecification = Omit<
  PendingSection<CustomFormatSpecification>,
  'fields' | 'implementationName'
> & {
  implementationName: string;
  fields: PendingField[];
};

interface InputChange {
  name: string;
  value: unknown;
}

// A condition is edited locally: Save hands it back to the custom format's own
// pending changes, and nothing reaches the server until the format is saved.
function EditSpecificationModalContent({
  specification,
  onSave,
  onDeleteSpecificationPress,
  onModalClose,
}: EditSpecificationModalContentProps) {
  const advancedSettings = useShowAdvancedSettings();

  const { pendingChanges, setPendingChange } =
    usePendingChangesStore<CustomFormatSpecification>({});

  const { pendingFields, setPendingFields, hasPendingFields } =
    usePendingFieldsStore();

  const item = useMemo(() => {
    const combinedPendingChanges = hasPendingFields
      ? { ...pendingChanges, fields: Object.fromEntries(pendingFields) }
      : pendingChanges;

    // A schema item arrives without a name (v1 omits nulls).
    return selectSettings<CustomFormatSpecification>(
      { ...specification, name: specification.name ?? '' },
      combinedPendingChanges as Partial<CustomFormatSpecification>
    ).settings as unknown as PendingSpecification;
  }, [specification, pendingChanges, pendingFields, hasPendingFields]);

  const handleInputChange = useCallback(
    ({ name, value }: InputChange) => {
      setPendingChange(
        name as keyof CustomFormatSpecification,
        value as CustomFormatSpecification[keyof CustomFormatSpecification]
      );
    },
    [setPendingChange]
  );

  const handleFieldChange = useCallback(
    ({ name, value }: InputChange) => {
      setPendingFields({ [name]: value });
    },
    [setPendingFields]
  );

  const handleSavePress = useCallback(() => {
    onSave({
      ...specification,
      ...pendingChanges,
      fields: specification.fields.map((f) =>
        pendingFields.has(f.name)
          ? { ...f, value: pendingFields.get(f.name) as typeof f.value }
          : f
      ),
    });

    onModalClose();
  }, [specification, pendingChanges, pendingFields, onSave, onModalClose]);

  const implementationName = specification.implementationName;
  const { name, negate, required, fields } = item;

  const isRegex = specification.fields.some(
    (x) => x.label === translate('CustomFormatsSpecificationRegularExpression')
  );

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {specification.id
          ? translate('EditConditionImplementation', { implementationName })
          : translate('AddConditionImplementation', { implementationName })}
      </ModalHeader>

      <ModalBody>
        <Form>
          {isRegex ? (
            <p className={styles.intro}>
              <InlineMarkdown
                data={translate('ConditionUsingRegularExpressions')}
              />{' '}
              <InlineMarkdown
                data={translate('RegularExpressionsTutorialLink', {
                  url: 'https://www.regular-expressions.info/tutorial.html',
                })}
              />{' '}
              <InlineMarkdown
                data={translate('RegularExpressionsCanBeTested', {
                  url: 'http://regexstorm.net/tester',
                })}
              />
            </p>
          ) : null}

          <FormGroup>
            <FormLabel>{translate('Name')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TEXT}
              name="name"
              {...name}
              onChange={handleInputChange}
            />
          </FormGroup>

          {fields.map((field) => (
            <ProviderFieldFormGroup
              key={field.name}
              {...field}
              advancedSettings={advancedSettings}
              provider="specifications"
              providerData={item}
              onChange={handleFieldChange}
            />
          ))}

          <FormGroup>
            <FormLabel>{translate('Negate')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="negate"
              helpText={translate('NegateHelpText', { implementationName })}
              {...negate}
              onChange={handleInputChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('Required')}</FormLabel>

            <FormInputGroup
              type={inputTypes.CHECK}
              name="required"
              helpText={translate('RequiredHelpText', { implementationName })}
              {...required}
              onChange={handleInputChange}
            />
          </FormGroup>
        </Form>
      </ModalBody>

      <ModalFooter>
        {specification.id ? (
          <Button
            className={styles.deleteButton}
            kind={kinds.DANGER}
            onPress={onDeleteSpecificationPress}
          >
            {translate('Delete')}
          </Button>
        ) : null}

        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton isSpinning={false} onPress={handleSavePress}>
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default EditSpecificationModalContent;
