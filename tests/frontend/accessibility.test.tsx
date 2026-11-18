import React from 'react';
import { expect, it } from 'vitest';
import FormGroup from 'Components/Form/FormGroup';
import FormLabel from 'Components/Form/FormLabel';
import TextInput from 'Components/Form/TextInput';
import PasswordInput from 'Components/Form/PasswordInput';
import TextArea from 'Components/Form/TextArea';
import SelectInput from 'Components/Form/SelectInput';
import Modal from 'Components/Modal/Modal';
import ModalContent from 'Components/Modal/ModalContent';
import ModalHeader from 'Components/Modal/ModalHeader';
import { mount } from './setup';

it.each([TextInput, PasswordInput, TextArea, SelectInput])('associates a field with its visible label across wrappers', async (Input) => {
  const container = await mount(<FormGroup><FormLabel>Username</FormLabel><Input name="username" value="sam" values={[{ key: 'sam', value: 'sam' }]} onChange={() => {}} /></FormGroup>);
  const label = container.querySelector('label')!;
  const input = container.querySelector('input, textarea, select')!;
  expect(label.htmlFor).toBe(input.id);
  expect(input.getAttribute('aria-labelledby')).toBe(label.id);
  expect(input.id).not.toBe('');
});
it('names the modal and its close button', async () => {
  document.body.innerHTML = '<div id="portal-root"></div>';
  await mount(<Modal isOpen={true} onModalClose={() => {}}><ModalContent onModalClose={() => {}}><ModalHeader>Edit book</ModalHeader><button>Save</button></ModalContent></Modal>);
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Edit book');
  expect(dialog.querySelector('button[aria-label="Close"]')).not.toBeNull();
});

it('keeps identifiers distinct when one group contains several controls', async () => {
  const container = await mount(<FormGroup><FormLabel>Server</FormLabel><TextInput name="host" value="localhost" onChange={() => {}} /><TextInput name="port" value="8787" onChange={() => {}} /></FormGroup>);
  const inputs = Array.from(container.querySelectorAll('input'));
  expect(new Set(inputs.map((input) => input.id)).size).toBe(2);
  expect(container.querySelector('label')!.htmlFor).toBe(inputs[0].id);
});
