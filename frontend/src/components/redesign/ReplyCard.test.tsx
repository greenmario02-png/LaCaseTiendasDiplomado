import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReplyCard } from './ReplyCard';

const reply = {
  id: 10,
  body: 'Yo vi ese producto en la tienda de la Costanera.',
  images: [] as string[],
  isBotReply: false,
  isAccepted: false,
  author: { forumUsername: 'Usuario_2882', tag: 'Colaborador' },
  positives: 5,
  createdAt: new Date().toISOString(),
};

describe('ReplyCard', () => {
  it('muestra alias y nunca email', () => {
    render(<ReplyCard reply={reply} />);
    expect(screen.getByText(/Usuario_2882/)).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it('muestra badge de mejor respuesta cuando isAccepted', () => {
    render(<ReplyCard reply={{ ...reply, isAccepted: true }} />);
    expect(screen.getByText(/Resuelve la duda/)).toBeInTheDocument();
  });

  it('etiqueta al bot LaCASE sin icono de IA', () => {
    render(<ReplyCard reply={{ ...reply, isBotReply: true, author: null }} />);
    expect(screen.getByText(/Bot LaCASE Multitienda/)).toBeInTheDocument();
  });

  it('el botón positivo llama onPositive', () => {
    const onPositive = vi.fn();
    render(<ReplyCard reply={reply} onPositive={onPositive} />);
    fireEvent.click(screen.getByRole('button', { name: /positivo/i }));
    expect(onPositive).toHaveBeenCalledTimes(1);
  });

  it('muestra botón Marcar como respuesta cuando canAccept', () => {
    const onAccept = vi.fn();
    render(<ReplyCard reply={reply} canAccept onAccept={onAccept} />);
    fireEvent.click(screen.getByRole('button', { name: /marcar como respuesta/i }));
    expect(onAccept).toHaveBeenCalledWith(10);
  });
});
