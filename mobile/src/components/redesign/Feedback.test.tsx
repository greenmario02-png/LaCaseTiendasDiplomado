import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { SuccessToast, ConfirmDialog } from './Feedback';

describe('SuccessToast', () => {
  it('muestra el mensaje cuando está abierto', async () => {
    const { getByText } = await render(<SuccessToast open message="¡Guardado!" onClose={() => {}} />);
    expect(getByText(/¡Guardado!/)).toBeTruthy();
  });

  it('no renderiza nada cuando está cerrado', async () => {
    const { queryByText } = await render(<SuccessToast open={false} message="oculto" onClose={() => {}} />);
    expect(queryByText(/oculto/)).toBeNull();
  });
});

describe('ConfirmDialog', () => {
  it('llama onConfirm y onClose', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const { getByText } = await render(
      <ConfirmDialog
        open
        title="¿Eliminar?"
        confirmLabel="Eliminar"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.press(getByText('Eliminar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.press(getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
