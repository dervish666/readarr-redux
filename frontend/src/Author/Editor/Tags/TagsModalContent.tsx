import React, { useCallback, useMemo, useState } from 'react';
import useAuthors from 'Author/useAuthors';
import Form from 'Components/Form/Form';
import FormGroup from 'Components/Form/FormGroup';
import FormInputGroup from 'Components/Form/FormInputGroup';
import FormLabel from 'Components/Form/FormLabel';
import Label from 'Components/Label';
import Button from 'Components/Link/Button';
import ModalBody from 'Components/Modal/ModalBody';
import ModalContent from 'Components/Modal/ModalContent';
import ModalFooter from 'Components/Modal/ModalFooter';
import ModalHeader from 'Components/Modal/ModalHeader';
import { inputTypes, kinds, sizes } from 'Helpers/Props';
import { useTagList } from 'Tags/useTags';
import { InputChanged } from 'typings/inputs';
import translate from 'Utilities/String/translate';
import styles from './TagsModalContent.css';

export type ApplyTagsMode = 'add' | 'remove' | 'replace';

const APPLY_TAGS_OPTIONS = [
  { key: 'add', value: 'Add' },
  { key: 'remove', value: 'Remove' },
  { key: 'replace', value: 'Replace' },
];

interface TagsModalContentProps {
  authorIds: number[];
  onApplyTagsPress: (tags: number[], applyTags: ApplyTagsMode) => void;
  onModalClose: () => void;
}

// Shows the selected authors' current tags and what Add/Remove/Replace would do to
// them; the footer sends the PUT /author/editor.
function TagsModalContent({
  authorIds,
  onApplyTagsPress,
  onModalClose,
}: TagsModalContentProps) {
  const { authorsMap } = useAuthors();
  const tagList = useTagList();

  const [tags, setTags] = useState<number[]>([]);
  const [applyTags, setApplyTags] = useState<ApplyTagsMode>('add');

  const authorTags = useMemo(() => {
    const result = new Set<number>();

    authorIds.forEach((id) => {
      authorsMap.get(id)?.tags.forEach((tag) => result.add(tag));
    });

    return Array.from(result);
  }, [authorIds, authorsMap]);

  const handleTagsChange = useCallback(({ value }: InputChanged<number[]>) => {
    setTags(value);
  }, []);

  const handleApplyTagsChange = useCallback(
    ({ value }: InputChanged<ApplyTagsMode>) => {
      setApplyTags(value);
    },
    []
  );

  const handleApplyTagsPress = useCallback(() => {
    onApplyTagsPress(tags, applyTags);
  }, [tags, applyTags, onApplyTagsPress]);

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>{translate('Tags')}</ModalHeader>

      <ModalBody>
        <Form>
          <FormGroup>
            <FormLabel>{translate('Tags')}</FormLabel>

            <FormInputGroup
              type={inputTypes.TAG}
              name="tags"
              value={tags}
              onChange={handleTagsChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('ApplyTags')}</FormLabel>

            <FormInputGroup
              type={inputTypes.SELECT}
              name="applyTags"
              value={applyTags}
              values={APPLY_TAGS_OPTIONS}
              helpTexts={[
                translate('ApplyTagsHelpTextHowToApplyAuthors'),
                translate('ApplyTagsHelpTextAdd'),
                translate('ApplyTagsHelpTextRemove'),
                translate('ApplyTagsHelpTextReplace'),
              ]}
              onChange={handleApplyTagsChange}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>{translate('Result')}</FormLabel>

            <div className={styles.result}>
              {authorTags.map((id) => {
                const tag = tagList.find((t) => t.id === id);

                if (!tag) {
                  return null;
                }

                const removeTag =
                  (applyTags === 'remove' && tags.includes(id)) ||
                  (applyTags === 'replace' && !tags.includes(id));

                return (
                  <Label
                    key={tag.id}
                    title={
                      removeTag
                        ? translate('RemoveTagRemovingTag')
                        : translate('RemoveTagExistingTag')
                    }
                    kind={removeTag ? kinds.INVERSE : kinds.INFO}
                    size={sizes.LARGE}
                  >
                    {tag.label}
                  </Label>
                );
              })}

              {applyTags === 'add' || applyTags === 'replace'
                ? tags.map((id) => {
                    const tag = tagList.find((t) => t.id === id);

                    if (!tag || authorTags.includes(id)) {
                      return null;
                    }

                    return (
                      <Label
                        key={tag.id}
                        title={translate('AddingTag')}
                        kind={kinds.SUCCESS}
                        size={sizes.LARGE}
                      >
                        {tag.label}
                      </Label>
                    );
                  })
                : null}
            </div>
          </FormGroup>
        </Form>
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <Button kind={kinds.PRIMARY} onPress={handleApplyTagsPress}>
          {translate('Apply')}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}

export default TagsModalContent;
