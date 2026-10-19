import classNames from 'classnames';
import React, { useCallback } from 'react';
import Icon from 'Components/Icon';
import Link from 'Components/Link/Link';
import { icons } from 'Helpers/Props';
import TokenCase from './TokenCase';
import TokenSeparator from './TokenSeparator';
import styles from './NamingOption.css';

export interface NamingOptionPress {
  isFullFilename: boolean;
  tokenValue: string;
}

interface NamingOptionProps {
  token: string;
  tokenSeparator: TokenSeparator;
  example: string;
  tokenCase: TokenCase;
  isFullFilename?: boolean;
  size?: 'small' | 'large';
  onPress: (press: NamingOptionPress) => void;
}

function NamingOption({
  token,
  tokenSeparator,
  example,
  tokenCase,
  isFullFilename = false,
  size = 'small',
  onPress,
}: NamingOptionProps) {
  const handlePress = useCallback(() => {
    let tokenValue = token.replace(/ /g, tokenSeparator);

    if (tokenCase === 'lower') {
      tokenValue = token.toLowerCase();
    } else if (tokenCase === 'upper') {
      tokenValue = token.toUpperCase();
    }

    onPress({ isFullFilename, tokenValue });
  }, [token, tokenCase, tokenSeparator, isFullFilename, onPress]);

  return (
    <div
      className={classNames(
        styles.option,
        styles[size],
        styles[tokenCase],
        isFullFilename && styles.isFullFilename
      )}
    >
      <Link className={styles.insert} onPress={handlePress}>
        <div className={styles.token}>
          {token.replace(/ /g, tokenSeparator)}
        </div>

        <div className={styles.example}>
          {example.replace(/ /g, tokenSeparator)}
        </div>

        {isFullFilename ? null : (
          <div className={styles.action}>
            <Icon name={icons.ADD} size={13} />
          </div>
        )}
      </Link>
    </div>
  );
}

export default NamingOption;
