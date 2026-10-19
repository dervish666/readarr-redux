import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthor } from 'Author/useAuthors';
import Book, { BookMetadataOverride } from 'Book/Book';
import Edition from 'Book/Edition';
import {
  BookMetadataOverrideRequest,
  useBookMetadataOverride,
  useSaveBookMetadataOverride,
} from 'Book/useBookMetadataOverride';
import { useBook, useSaveBook } from 'Book/useBooks';
import useEditions from 'Book/useEditions';
import Alert from 'Components/Alert';
import FieldSet from 'Components/FieldSet';
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
import { usePendingChangesStore } from 'Helpers/Hooks/usePendingChangesStore';
import usePrevious from 'Helpers/Hooks/usePrevious';
import { inputTypes, kinds } from 'Helpers/Props';
import { InputChanged } from 'typings/inputs';
import getErrorMessage from 'Utilities/Object/getErrorMessage';
import selectSettings from 'Utilities/selectSettings';
import translate from 'Utilities/String/translate';
import BookSeriesEditor, {
  BookSeriesRow,
  NEW_SERIES,
} from './BookSeriesEditor';

type EditableBook = Pick<Book, 'monitored' | 'anyEditionOk'> & {
  editions: Edition[];
};

interface MetadataForm {
  title: string;
  releaseDate: string;
  overview: string;
  pageCount: number | null;
  series: BookSeriesRow[];
}

function toDateInput(date?: string | null) {
  return date ? date.substring(0, 10) : '';
}

function toMetadataForm(data: BookMetadataOverride): MetadataForm {
  return {
    title: data.title || '',
    releaseDate: toDateInput(data.releaseDate),
    overview: data.overview || '',
    pageCount: data.pageCount ?? null,
    series: (data.series ?? []).map((row) => ({ ...row, newSeriesTitle: '' })),
  };
}

// The user's values for the book. Empty fields go back to the metadata source's values.
function toMetadataRequest(
  metadata: MetadataForm
): BookMetadataOverrideRequest {
  const releaseDate = metadata.releaseDate.trim();

  return {
    title: metadata.title.trim() || null,
    releaseDate: releaseDate ? `${releaseDate}T00:00:00Z` : null,
    overview: metadata.overview.trim() || null,
    pageCount: metadata.pageCount ? metadata.pageCount : null,
    series: metadata.series
      .filter((row) => row.seriesId !== NEW_SERIES || row.newSeriesTitle.trim())
      .map((row) => ({
        seriesId: row.seriesId === NEW_SERIES ? 0 : row.seriesId,
        newSeriesTitle:
          row.seriesId === NEW_SERIES ? row.newSeriesTitle.trim() : null,
        position: row.position,
      })),
  };
}

export interface EditBookModalContentProps {
  bookId: number;
  onModalClose: () => void;
}

// The book PUT is the book as GET /book?bookIds= sent it (minus statistics) with
// monitored, anyEditionOk and, when the edition changed, every edition from
// GET /edition laid over it. The metadata set by hand (PR #20: title, release date,
// pages, overview, series) is not part of BookResource: it is saved first through
// /book/{id}/metadata, and only when it changed.
function EditBookModalContent({
  bookId,
  onModalClose,
}: EditBookModalContentProps) {
  const { book } = useBook(bookId);
  const author = useAuthor(book?.authorId);

  const {
    data: editions,
    isFetching: isEditionsFetching,
    isFetched: isEditionsFetched,
    error: editionsError,
  } = useEditions(bookId);

  const { pendingChanges, setPendingChange } =
    usePendingChangesStore<EditableBook>({});

  const { saveBook, isSaving, saveError } = useSaveBook();
  const wasSaving = usePrevious(isSaving);

  const {
    data: savedMetadata,
    isFetching: isMetadataFetching,
    error: metadataError,
  } = useBookMetadataOverride(bookId);

  const {
    saveBookMetadataOverride,
    isSavingBookMetadataOverride,
    saveBookMetadataOverrideError,
  } = useSaveBookMetadataOverride(bookId);

  const [metadata, setMetadata] = useState<MetadataForm | null>(null);

  const initialMetadata = useMemo(
    () => (savedMetadata ? toMetadataForm(savedMetadata) : null),
    [savedMetadata]
  );

  // The fields appear once the metadata has loaded, never with a guess.
  useEffect(() => {
    if (initialMetadata && metadata === null) {
      setMetadata(initialMetadata);
    }
  }, [initialMetadata, metadata]);

  const { settings, ...otherSettings } = useMemo(() => {
    return selectSettings<EditableBook>(
      {
        monitored: book?.monitored ?? false,
        anyEditionOk: book?.anyEditionOk ?? false,
        editions,
      },
      pendingChanges,
      saveError
    );
  }, [book, editions, pendingChanges, saveError]);

  const handleInputChange = useCallback(
    ({ name, value }: InputChanged) => {
      setPendingChange(
        name as keyof EditableBook,
        value as EditableBook[keyof EditableBook]
      );
    },
    [setPendingChange]
  );

  const handleMetadataChange = useCallback(({ name, value }: InputChanged) => {
    setMetadata((current) =>
      current ? { ...current, [name]: value } : current
    );
  }, []);

  const handleSeriesChange = useCallback((series: BookSeriesRow[]) => {
    setMetadata((current) => (current ? { ...current, series } : current));
  }, []);

  const handleSavePress = useCallback(() => {
    if (!book) {
      return;
    }

    const saveBookChanges = () => {
      saveBook({ ...book, ...pendingChanges });
    };

    const request = metadata ? toMetadataRequest(metadata) : null;

    if (
      !request ||
      !initialMetadata ||
      JSON.stringify(request) ===
        JSON.stringify(toMetadataRequest(initialMetadata))
    ) {
      saveBookChanges();
      return;
    }

    saveBookMetadataOverride(request, { onSuccess: saveBookChanges });
  }, [
    book,
    pendingChanges,
    metadata,
    initialMetadata,
    saveBook,
    saveBookMetadataOverride,
  ]);

  useEffect(() => {
    if (wasSaving && !isSaving && !saveError) {
      onModalClose();
    }
  }, [isSaving, wasSaving, saveError, onModalClose]);

  const hasFile = (book?.statistics?.bookFileCount ?? 0) > 0;

  return (
    <ModalContent onModalClose={onModalClose}>
      <ModalHeader>
        {translate('Edit')} - {author?.authorName ?? ''} - {book?.title ?? ''}
      </ModalHeader>

      <ModalBody>
        {book ? (
          <Form {...otherSettings}>
            <FormGroup>
              <FormLabel>{translate('Monitored')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="monitored"
                helpText={translate('MonitoredHelpText')}
                {...settings.monitored}
                onChange={handleInputChange}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel>{translate('AutomaticallySwitchEdition')}</FormLabel>

              <FormInputGroup
                type={inputTypes.CHECK}
                name="anyEditionOk"
                helpText={translate('AnyEditionOkHelpText')}
                {...settings.anyEditionOk}
                onChange={handleInputChange}
              />
            </FormGroup>

            {isEditionsFetching && !isEditionsFetched ? (
              <LoadingIndicator />
            ) : null}

            {editionsError ? (
              <div>{translate('UnableToLoadEditions')}</div>
            ) : null}

            {isEditionsFetched && editions.length ? (
              <FormGroup>
                <FormLabel>{translate('Edition')}</FormLabel>

                <FormInputGroup
                  type={inputTypes.BOOK_EDITION_SELECT}
                  name="editions"
                  helpText={translate('EditionsHelpText')}
                  isDisabled={settings.anyEditionOk.value && hasFile}
                  {...settings.editions}
                  onChange={handleInputChange}
                />
              </FormGroup>
            ) : null}

            <FieldSet legend={translate('Metadata')}>
              <Alert kind={kinds.INFO}>
                {translate('BookMetadataOverridesHelpText')}
              </Alert>

              {isMetadataFetching && !metadata ? <LoadingIndicator /> : null}

              {metadataError ? (
                <Alert kind={kinds.DANGER}>
                  {getErrorMessage(
                    metadataError,
                    translate('BookMetadataLoadError')
                  )}
                </Alert>
              ) : null}

              {metadata ? (
                <div>
                  <FormGroup>
                    <FormLabel>{translate('Title')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.TEXT}
                      name="title"
                      value={metadata.title}
                      placeholder={book.title}
                      helpText={translate('BookMetadataTitleHelpText')}
                      onChange={handleMetadataChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>{translate('ReleaseDate')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.TEXT}
                      name="releaseDate"
                      value={metadata.releaseDate}
                      placeholder="YYYY-MM-DD"
                      onChange={handleMetadataChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>{translate('Pages')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.NUMBER}
                      name="pageCount"
                      value={metadata.pageCount}
                      min={0}
                      onChange={handleMetadataChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>{translate('Overview')}</FormLabel>

                    <FormInputGroup
                      type={inputTypes.TEXT_AREA}
                      name="overview"
                      value={metadata.overview}
                      onChange={handleMetadataChange}
                    />
                  </FormGroup>

                  <FormGroup>
                    <FormLabel>{translate('Series')}</FormLabel>

                    <div>
                      <BookSeriesEditor
                        series={metadata.series}
                        availableSeries={savedMetadata?.availableSeries ?? []}
                        onChange={handleSeriesChange}
                      />
                    </div>
                  </FormGroup>
                </div>
              ) : null}

              {saveBookMetadataOverrideError ? (
                <Alert kind={kinds.DANGER}>
                  {getErrorMessage(
                    saveBookMetadataOverrideError,
                    translate('BookMetadataSaveError')
                  )}
                </Alert>
              ) : null}
            </FieldSet>
          </Form>
        ) : (
          <LoadingIndicator />
        )}
      </ModalBody>

      <ModalFooter>
        <Button onPress={onModalClose}>{translate('Cancel')}</Button>

        <SpinnerErrorButton
          error={saveError}
          isSpinning={isSaving || isSavingBookMetadataOverride}
          isDisabled={!book}
          onPress={handleSavePress}
        >
          {translate('Save')}
        </SpinnerErrorButton>
      </ModalFooter>
    </ModalContent>
  );
}

export default EditBookModalContent;
