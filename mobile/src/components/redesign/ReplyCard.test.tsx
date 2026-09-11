import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import { ReplyCard } from './ReplyCard';

const reply = {
  id: 7,
  body: 'Yo vi ese procesador en la tienda de La Paz.',
  author: { forumUsername: 'Usuario_7741', tag: 'Colaborador' },
  positives: 5,
};

describe('ReplyCard', () => {
  it('muestra alias y nunca email', async () => {
    const { getByText, queryByText } = await render(
      <ReplyCard reply={reply} />,
    );
    expect(getByText(/Usuario_7741/)).toBeTruthy();
    expect(queryByText(/@/)).toBeNull();
  });

  it('muestra etiqueta del bot sin icono IA', async () => {
    const { getByText } = await render(
      <ReplyCard reply={{ ...reply, isBotReply: true, author: null }} />,
    );
    expect(getByText('Bot LaCASE Multitienda')).toBeTruthy();
  });

  it('muestra badge Resuelve la duda', async () => {
    const { getByText } = await render(
      <ReplyCard reply={{ ...reply, isAccepted: true }} />,
    );
    expect(getByText(/Resuelve la duda/)).toBeTruthy();
  });

  it('el botón positivo llama onPositive', async () => {
    const onPositive = jest.fn();
    const { getByTestId } = await render(<ReplyCard reply={reply} onPositive={onPositive} />);
    fireEvent.press(getByTestId('reply-positive-7'));
    expect(onPositive).toHaveBeenCalledTimes(1);
  });

  it('canAccept muestra Marcar como respuesta y llama onAccept', async () => {
    const onAccept = jest.fn();
    const { getByTestId } = await render(<ReplyCard reply={reply} canAccept onAccept={onAccept} />);
    fireEvent.press(getByTestId('reply-accept-7'));
    expect(onAccept).toHaveBeenCalledWith(7);
  });

  it('no muestra Marcar como respuesta en la reply del bot', async () => {
    const { queryByTestId } = await render(
      <ReplyCard reply={{ ...reply, isBotReply: true, author: null }} canAccept onAccept={() => {}} />,
    );
    expect(queryByTestId('reply-accept-7')).toBeNull();
  });
});
