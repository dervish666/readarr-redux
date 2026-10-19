import React, { useCallback, useEffect, useRef, useState } from 'react';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Button from 'Components/Link/Button';
import SpinnerErrorButton from 'Components/Link/SpinnerErrorButton';
import LoadingIndicator from 'Components/Loading/LoadingIndicator';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes, sizes } from 'Helpers/Props';
import Field from 'typings/Field';
import translate from 'Utilities/String/translate';
import {
  CustomFormat,
  CustomFormatSpecification,
  useCustomFormatSchema,
} from './useCustomFormats';
import styles from './ImportCustomFormatModalContent.css';

interface ImportCustomFormatModalContentProps {
  onImport: (customFormat: CustomFormat) => void;
  onModalClose: () => void;
}

// The export format: fields are a name -> value map.
interface RawSpec {
  name: string;
  implementation: string;
  negate?: boolean;
  required?: boolean;
  fields?: Record<string, unknown>;
}

interface RawCustomFormat {
  name?: string;
  includeCustomFormatWhenRenaming?: boolean;
  specifications?: RawSpec[];
}

interface ParseError {
  message: string;
  detailedMessage?: string;
}

// SpinnerErrorButton shows a failure for any non-400 status.
const PARSE_FAILED = { status: 0 };

function ImportCustomFormatModalContent({
  onImport,
  onModalClose,
}: ImportCustomFormatModalContentProps) {
  const { isSchemaLoading, schemaError, schema } = useCustomFormatSchema();

  const importTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [json, setJson] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [parseError, setParseError] = useState<ParseError>();

  useEffect(() => () => clearTimeout(importTimeout.current), []);

  const handleChange = useCallback(({ value }: { value: string }) => {
    setJson(value);
  }, []);

  const buildSpec = useCallback(
    (raw: RawSpec): CustomFormatSpecification => {
      const schemaSpec = schema.find(
        (s) => s.implementation === raw.implementation
      );

      if (!schemaSpec) {
        throw new Error(
          translate('CustomFormatUnknownCondition', {
            implementation: raw.implementation,
          })
        );
      }

      const fields: Field[] = schemaSpec.fields.map((f) => ({ ...f }));

      Object.entries(raw.fields ?? {}).forEach(([key, value]) => {
        const target = fields.find((f) => f.name === key);

        if (!target) {
          throw new Error(
            translate('CustomFormatUnknownConditionOption', {
              key,
              implementation: schemaSpec.implementationName,
            })
          );
        }

        target.value = value as Field['value'];
      });

      return {
        id: 0,
        name: raw.name,
        implementation: schemaSpec.implementation,
        implementationName: schemaSpec.implementationName,
        infoLink: schemaSpec.infoLink,
        negate: raw.negate ?? false,
        required: raw.required ?? false,
        fields,
      };
    },
    [schema]
  );

  const handleImportPress = useCallback(() => {
    setIsSpinning(true);

    // Lets the button show its spinner before the synchronous parse.
    importTimeout.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(json) as RawCustomFormat;

        onImport({
          id: 0,
          name: parsed.name ?? '',
          includeCustomFormatWhenRenaming:
            parsed.includeCustomFormatWhenRenaming ?? false,
          specifications: (parsed.specifications ?? []).map(buildSpec),
        });

        setParseError(undefined);
        setIsSpinning(false);
        onModalClose();
      } catch (err) {
        setParseError({
          message: err instanceof Error ? err.message : String(err),
          detailedMessage: err instanceof Error ? err.stack : undefined,
        });
        setIsSpinning(false);
      }
    }, 250);
  }, [json, buildSpec, onImport, onModalClose]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('ImportCustomFormat')}</ModalHeader>

      <ModalBody>
        {isSchemaLoading ? <LoadingIndicator /> : null}

        {!isSchemaLoading && schemaError ? (
          <p className={styles.error}>
            {translate('UnableToLoadCustomFormats')}
          </p>
        ) : null}

        {!isSchemaLoading && !schemaError ? (
          <Form>
            <FormGroup size={sizes.MEDIUM}>
              <FormLabel>{translate('CustomFormatJson')}</FormLabel>

              <FormInputGroup
                inputClassName={styles.input}
                type={inputTypes.TEXT_AREA}
                name="customFormatJson"
                value={json}
                {...{ placeholder: '{\n  "name": "Custom Format"\n}' }}
                errors={parseError ? [parseError] : []}
                onChange={handleChange}
              />
            </FormGroup>
          </Form>
        ) : null}
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          isSpinning={isSpinning}
          error={parseError ? PARSE_FAILED : null}
          onPress={handleImportPress}
        >
          {translate('Import')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default ImportCustomFormatModalContent;
