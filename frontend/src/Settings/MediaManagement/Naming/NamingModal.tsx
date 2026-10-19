import React, { useCallback, useState } from 'react';
import FieldSet from 'Components/FieldSet';
import SelectInput from 'Components/Form/SelectInput';
import TextInput from 'Components/Form/TextInput';
import Icon from 'Components/Icon';
import Button from 'Components/Link/Button';
import Modal from 'Components/Modal/Modal';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { icons } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import NamingOption, { NamingOptionPress } from './NamingOption';
import TokenCase from './TokenCase';
import TokenSeparator from './TokenSeparator';
import { NamingSettingsModel } from './useNamingSettings';
import styles from './NamingModal.css';

interface Token {
  token: string;
  example: string;
}

interface TokenGroup {
  legend: string;
  tokens: Token[];
  size?: 'large';
  isFullFilename?: boolean;
}

const separatorOptions: { key: TokenSeparator; value: string }[] = [
  { key: ' ', value: 'Space ( )' },
  { key: '.', value: 'Period (.)' },
  { key: '_', value: 'Underscore (_)' },
  { key: '-', value: 'Dash (-)' },
];

const caseOptions: { key: TokenCase; value: string }[] = [
  { key: 'title', value: 'Default Case' },
  { key: 'lower', value: 'Lowercase' },
  { key: 'upper', value: 'Uppercase' },
];

const fileNameTokens: Token[] = [
  {
    token: '{Author Name} - {Book Title} - {Quality Full}',
    example: 'Author Name - Book Title - MP3 Proper',
  },
  {
    token: '{Author.Name}.{Book.Title}.{Quality.Full}',
    example: 'Author.Name.Book.Title.MP3',
  },
  {
    token: '{Author Name} - {Book Title}{ (PartNumber)}',
    example: 'Author Name - Book Title (2)',
  },
  {
    token: '{Author Name} - {Book Title}{ (PartNumber/PartCount)}',
    example: 'Author Name - Book Title (2/10)',
  },
];

const authorTokens: Token[] = [
  { token: '{Author Name}', example: "Author's Name" },
  { token: '{Author NameThe}', example: "Author's Name, The" },
  { token: '{Author NameFirstCharacter}', example: 'A' },
  { token: '{Author CleanName}', example: 'Authors Name' },
  { token: '{Author SortName}', example: 'Name, Author' },
  { token: '{Author Disambiguation}', example: 'Disambiguation' },
];

const bookTokens: Token[] = [
  { token: '{Book Title}', example: "The Book's Title!: Subtitle!" },
  { token: '{Book TitleThe}', example: "Book's Title!, The: Subtitle!" },
  { token: '{Book CleanTitle}', example: 'The Books Title!: Subtitle' },
  { token: '{Book TitleNoSub}', example: "The Book's Title!" },
  { token: '{Book TitleTheNoSub}', example: "Book's Title!, The" },
  { token: '{Book CleanTitleNoSub}', example: 'The Books Title!' },
  { token: '{Book Subtitle}', example: 'Subtitle!' },
  { token: '{Book SubtitleThe}', example: 'Subtitle!, The' },
  { token: '{Book CleanSubtitle}', example: 'Subtitle' },
  { token: '{Book Disambiguation}', example: 'Disambiguation' },
  { token: '{Book Series}', example: 'Series Title' },
  { token: '{Book SeriesPosition}', example: '1' },
  { token: '{Book SeriesTitle}', example: 'Series Title #1' },
  { token: '{PartNumber:0}', example: '2' },
  { token: '{PartNumber:00}', example: '02' },
  { token: '{PartCount:0}', example: '9' },
  { token: '{PartCount:00}', example: '09' },
];

const releaseDateTokens: Token[] = [
  { token: '{Release Year}', example: '2016' },
  { token: '{Release YearFirst}', example: '2015' },
  { token: '{Edition Year}', example: '2016' },
];

const qualityTokens: Token[] = [
  { token: '{Quality Full}', example: 'AZW3 Proper' },
  { token: '{Quality Title}', example: 'AZW3' },
];

const mediaInfoTokens: Token[] = [
  { token: '{MediaInfo AudioCodec}', example: 'MP3' },
  { token: '{MediaInfo AudioChannels}', example: '2.0' },
  { token: '{MediaInfo AudioBitRate}', example: '320kbps' },
  { token: '{MediaInfo AudioBitsPerSample}', example: '24bit' },
  { token: '{MediaInfo AudioSampleRate}', example: '44.1kHz' },
];

const otherTokens: Token[] = [
  { token: '{Release Group}', example: 'Rls Grp' },
  { token: '{Custom Formats}', example: 'iNTERNAL' },
];

const originalTokens: Token[] = [
  {
    token: '{Original Title}',
    example: 'Author.Name.Book.Name.2018.AZW3-EVOLVE',
  },
  { token: '{Original Filename}', example: '01 - book name' },
];

function getTokenGroups({
  book,
  additional,
  showFileNames,
}: {
  book: boolean;
  additional: boolean;
  showFileNames: boolean;
}) {
  const groups: TokenGroup[] = [];

  if (showFileNames) {
    groups.push({
      legend: translate('FileNames'),
      tokens: fileNameTokens,
      size: 'large',
      isFullFilename: true,
    });
  }

  groups.push({ legend: translate('Author'), tokens: authorTokens });

  if (book) {
    groups.push({ legend: translate('Book'), tokens: bookTokens });
    groups.push({
      legend: translate('ReleaseDate'),
      tokens: releaseDateTokens,
    });
  }

  if (additional) {
    groups.push({ legend: translate('Quality'), tokens: qualityTokens });
    groups.push({ legend: translate('MediaInfo'), tokens: mediaInfoTokens });
    groups.push({ legend: translate('Other'), tokens: otherTokens });
    groups.push({
      legend: translate('Original'),
      tokens: originalTokens,
      size: 'large',
    });
  }

  return groups;
}

export interface NamingModalOptions {
  name: keyof Pick<
    NamingSettingsModel,
    'standardBookFormat' | 'authorFolderFormat'
  >;
  book?: boolean;
  additional?: boolean;
}

interface NamingModalProps extends NamingModalOptions {
  isOpen: boolean;
  value: string;
  advancedSettings: boolean;
  onInputChange: (change: InputChanged<string>) => void;
  onModalClose: () => void;
}

function NamingModal({
  isOpen,
  name,
  value,
  advancedSettings,
  book = false,
  additional = false,
  onInputChange,
  onModalClose,
}: NamingModalProps) {
  const [tokenSeparator, setTokenSeparator] = useState<TokenSeparator>(' ');
  const [tokenCase, setTokenCase] = useState<TokenCase>('title');
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  const handleTokenSeparatorChange = useCallback(
    ({ value }: InputChanged<TokenSeparator>) => {
      setTokenSeparator(value);
    },
    []
  );

  const handleTokenCaseChange = useCallback(
    ({ value }: InputChanged<TokenCase>) => {
      setTokenCase(value);
    },
    []
  );

  const handleInputSelectionChange = useCallback(
    (start: number | null, end: number | null) => {
      setSelectionStart(start);
      setSelectionEnd(end);
    },
    []
  );

  const handleOptionPress = useCallback(
    ({ isFullFilename, tokenValue }: NamingOptionPress) => {
      if (isFullFilename) {
        onInputChange({ name, value: tokenValue });
      } else if (selectionStart == null || selectionEnd == null) {
        onInputChange({ name, value: `${value}${tokenValue}` });
      } else {
        const start = value.substring(0, selectionStart);
        const end = value.substring(selectionEnd);
        const newValue = `${start}${tokenValue}${end}`;
        const caret = selectionStart + tokenValue.length;

        onInputChange({ name, value: newValue });

        setSelectionStart(caret);
        setSelectionEnd(caret);
      }
    },
    [name, value, selectionStart, selectionEnd, onInputChange]
  );

  // Readarr has always offered whole file name patterns only while advanced
  // settings are hidden.
  const tokenGroups = getTokenGroups({
    book,
    additional,
    showFileNames: !advancedSettings,
  });

  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <ModalContent onModalClose={onModalClose}>
        <ModalHeader>
          {book ? translate('FileNameTokens') : translate('FolderNameTokens')}
        </ModalHeader>

        <ModalBody>
          <div className={styles.builder}>
            <TextInput
              className={styles.formatInput}
              name={name}
              value={value}
              onChange={onInputChange}
              onSelectionChange={handleInputSelectionChange}
            />

            <div className={styles.controls}>
              <div className={styles.control}>
                <span className={styles.controlLabel}>
                  {translate('Separator')}
                </span>

                <SelectInput
                  className={styles.namingSelect}
                  name="separator"
                  value={tokenSeparator}
                  values={separatorOptions}
                  onChange={handleTokenSeparatorChange}
                />
              </div>

              <div className={styles.control}>
                <span className={styles.controlLabel}>
                  {translate('Capitalization')}
                </span>

                <SelectInput
                  className={styles.namingSelect}
                  name="case"
                  value={tokenCase}
                  values={caseOptions}
                  onChange={handleTokenCaseChange}
                />
              </div>
            </div>
          </div>

          <div className={styles.instruction}>
            <Icon name={icons.INFO} size={14} />
            <span>{translate('NamingTokenSelectHelpText')}</span>
          </div>

          {tokenGroups.map((group) => (
            <FieldSet key={group.legend} legend={group.legend}>
              <div className={styles.groups}>
                {group.tokens.map(({ token, example }) => (
                  <NamingOption
                    key={token}
                    token={token}
                    example={example}
                    isFullFilename={group.isFullFilename}
                    size={group.size}
                    tokenSeparator={tokenSeparator}
                    tokenCase={tokenCase}
                    onPress={handleOptionPress}
                  />
                ))}
              </div>
            </FieldSet>
          ))}
        </ModalBody>

        <ModalFooter>
          <Button onPress={onModalClose}>{translate('Close')}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default NamingModal;
