import React, { useCallback, useMemo, useState } from 'react';
import Author from 'Author/Author';
import useAuthors from 'Author/useAuthors';
import TextInput from 'Components/Form/TextInput';
import Button from 'Components/Link/Button';
import Link from 'Components/Link/Link';
import Modal from 'Components/Modal/Modal';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import Scroller from 'Components/Scroller/Scroller';
import { scrollDirections } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import styles from './SelectAuthorModal.css';

interface SelectAuthorRowProps {
  author: Author;
  onAuthorSelect(author: Author): void;
}

function SelectAuthorRow({ author, onAuthorSelect }: SelectAuthorRowProps) {
  const handlePress = useCallback(() => {
    onAuthorSelect(author);
  }, [author, onAuthorSelect]);

  return (
    <Link className={styles.author} component="div" onPress={handlePress}>
      {author.authorName}
    </Link>
  );
}

interface SelectAuthorModalContentProps {
  modalTitle: string;
  onAuthorSelect(author: Author): void;
  onModalClose(): void;
}

function SelectAuthorModalContent({
  modalTitle,
  onAuthorSelect,
  onModalClose,
}: SelectAuthorModalContentProps) {
  const { data: authors } = useAuthors();
  const [filter, setFilter] = useState('');

  const items = useMemo(() => {
    const filterLower = filter.toLowerCase();

    return [...authors]
      .sort((a, b) => {
        if (a.sortName < b.sortName) {
          return -1;
        }

        return a.sortName > b.sortName ? 1 : 0;
      })
      .filter((author) =>
        author.authorName.toLowerCase().includes(filterLower)
      );
  }, [authors, filter]);

  const handleFilterChange = useCallback(({ value }: InputChanged<string>) => {
    setFilter(value);
  }, []);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {modalTitle} - {translate('SelectAuthor')}
      </ModalHeader>

      <ModalBody
        className={styles.modalBody}
        scrollDirection={scrollDirections.NONE}
      >
        <TextInput
          className={styles.filterInput}
          placeholder={translate('FilterAuthor')}
          name="filter"
          value={filter}
          autoFocus={true}
          onChange={handleFilterChange}
        />

        <Scroller className={styles.scroller}>
          {items.map((author) => {
            return (
              <SelectAuthorRow
                key={author.id}
                author={author}
                onAuthorSelect={onAuthorSelect}
              />
            );
          })}
        </Scroller>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>
      </ModalFooter>
    </ModalContent>
  );
}

interface SelectAuthorModalProps extends SelectAuthorModalContentProps {
  isOpen: boolean;
}

function SelectAuthorModal({
  isOpen,
  onModalClose,
  ...otherProps
}: SelectAuthorModalProps) {
  return (
    <Modal isOpen={isOpen} onModalClose={onModalClose}>
      <SelectAuthorModalContent {...otherProps} onModalClose={onModalClose} />
    </Modal>
  );
}

export default SelectAuthorModal;
