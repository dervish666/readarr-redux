import React, { ReactNode, useEffect, useRef, useState } from 'react';
import Icon from 'Components/Icon';
import SpinnerButton from 'Components/Link/SpinnerButton';
import { getValidationFailures } from 'Helpers/Hooks/useApiMutation';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { icons, kinds } from 'Helpers/Props';
import { ValidationFailure } from 'typings/pending';
import { ApiError } from 'Utilities/Fetch/fetchJson';
import styles from './SpinnerErrorButton.module.css';

// Redux saves still hand over the jQuery xhr; react-query mutations hand over an ApiError.
interface XhrError {
  status: number;
  responseJSON?: unknown;
}

export type SpinnerError = ApiError | XhrError | null | undefined;

interface TestResult {
  wasSuccessful: boolean;
  hasWarning: boolean;
  hasError: boolean;
}

const NO_RESULT: TestResult = {
  wasSuccessful: false,
  hasWarning: false,
  hasError: false,
};

function getTestResult(error: SpinnerError): TestResult {
  if (!error) {
    return { ...NO_RESULT, wasSuccessful: true };
  }

  if (error instanceof ApiError) {
    if (error.statusCode !== 400) {
      return { ...NO_RESULT, hasError: true };
    }

    const { errors, warnings } = getValidationFailures(error);

    return {
      wasSuccessful: false,
      hasWarning: warnings.length > 0,
      hasError: errors.length > 0,
    };
  }

  if (error.status !== 400) {
    return { ...NO_RESULT, hasError: true };
  }

  const failures = (error.responseJSON ?? []) as ValidationFailure[];

  return {
    wasSuccessful: false,
    hasWarning: failures.some((failure) => failure.isWarning),
    hasError: failures.some((failure) => !failure.isWarning),
  };
}

interface SpinnerErrorButtonProps {
  kind?: string;
  isSpinning: boolean;
  error?: SpinnerError;
  children: ReactNode;
  [key: string]: unknown;
}

function SpinnerErrorButton({
  kind,
  isSpinning,
  error,
  children,
  ...otherProps
}: SpinnerErrorButtonProps) {
  const wasSpinning = usePrevious(isSpinning);
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [result, setResult] = useState<TestResult>(NO_RESULT);
  const { wasSuccessful, hasWarning, hasError } = result;

  useEffect(() => {
    if (wasSpinning && !isSpinning) {
      const testResult = getTestResult(error);

      setResult(testResult);

      if (
        testResult.wasSuccessful ||
        testResult.hasWarning ||
        testResult.hasError
      ) {
        resetTimeout.current = setTimeout(() => setResult(NO_RESULT), 3000);
      }
    }
  }, [isSpinning, wasSpinning, error]);

  useEffect(() => {
    return () => {
      if (resetTimeout.current) {
        clearTimeout(resetTimeout.current);
      }
    };
  }, []);

  const showIcon = wasSuccessful || hasWarning || hasError;

  let iconName = icons.CHECK;
  let iconKind = kind === kinds.PRIMARY ? kinds.DEFAULT : kinds.SUCCESS;

  if (hasWarning) {
    iconName = icons.WARNING;
    iconKind = kinds.WARNING;
  }

  if (hasError) {
    iconName = icons.DANGER;
    iconKind = kinds.DANGER;
  }

  return (
    <SpinnerButton kind={kind} isSpinning={isSpinning} {...otherProps}>
      <span className={showIcon ? styles.showIcon : undefined}>
        {showIcon ? (
          <span className={styles.iconContainer}>
            <Icon name={iconName} kind={iconKind} />
          </span>
        ) : null}

        <span className={styles.label}>{children}</span>
      </span>
    </SpinnerButton>
  );
}

export default SpinnerErrorButton;
