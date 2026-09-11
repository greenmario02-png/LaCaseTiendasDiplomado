import { describe, it, expect, jest } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import { ForumPostCard } from './ForumPostCard';

const post = {
  id: 1,
  title: '¿Cuánto cuesta un Ryzen en Tarija?',
  body: 'Busco precios de procesadores AMD en la zona.',
  city: 'tarija',
  category: { icon: '💰', name: 'Precio de producto', color: '#FF6B35' },
  author: { forumUsername: 'Usuario_6992' },
  status: 'OPEN' as const,
  replyCount: 2,
  positives: 3,
  createdAt: new Date().toISOString(),
};

describe('ForumPostCard', () => {
  it('muestra alias y nunca email', async () => {
    const { getByText, queryByText } = await render(
      <ForumPostCard post={post} onOpen={() => {}} onPositive={() => {}} />,
    );
    expect(getByText(/Usuario_6992/)).toBeTruthy();
    expect(queryByText(/@/)).toBeNull();
  });

  it('muestra badge de estado Abierta', async () => {
    const { getByText } = await render(<ForumPostCard post={post} onOpen={() => {}} onPositive={() => {}} />);
    expect(getByText('Abierta')).toBeTruthy();
  });

  it('el botón positivo llama onPositive una vez', async () => {
    const onPositive = jest.fn();
    const { getByTestId } = await render(<ForumPostCard post={post} onOpen={() => {}} onPositive={onPositive} />);
    fireEvent.press(getByTestId('forum-positive-1'));
    expect(onPositive).toHaveBeenCalledTimes(1);
  });

  it('onOpen se llama con el id del post', async () => {
    const onOpen = jest.fn();
    const { getByTestId } = await render(<ForumPostCard post={post} onOpen={onOpen} onPositive={() => {}} />);
    fireEvent.press(getByTestId('forum-post-1'));
    expect(onOpen).toHaveBeenCalledWith(1);
  });
});
