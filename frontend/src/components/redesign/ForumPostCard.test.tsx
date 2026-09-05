import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ForumPostCard } from './ForumPostCard';

const post = {
  id: 1,
  title: '¿Cuánto cuesta un Ryzen en Tarija?',
  body: 'Estoy buscando precios...',
  city: 'tarija',
  category: { icon: '💰', name: 'Precio de producto', color: '#FF6B35' },
  author: { forumUsername: 'Usuario_6992' },
  status: 'OPEN' as const,
  replyCount: 2,
  positives: 3,
  createdAt: new Date().toISOString(),
};

describe('ForumPostCard', () => {
  it('muestra alias y NUNCA email/nombre real', () => {
    render(<ForumPostCard post={{ ...post, author: { forumUsername: 'Usuario_6992' } }} onOpen={() => {}} onPositive={() => {}} />);
    expect(screen.getByText(/Usuario_6992/)).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  it('muestra badge de estado Abierta/Resuelta', () => {
    render(<ForumPostCard post={post} onOpen={() => {}} onPositive={() => {}} />);
    expect(screen.getByText('Abierta')).toBeInTheDocument();
  });

  it('el botón positivo llama onPositive una vez', () => {
    const onPositive = vi.fn();
    render(<ForumPostCard post={post} onOpen={() => {}} onPositive={onPositive} />);
    const btn = screen.getByRole('button', { name: /positivo/i });
    fireEvent.click(btn);
    expect(onPositive).toHaveBeenCalledTimes(1);
  });

  it('al abrir llama onOpen con el id del post', () => {
    const onOpen = vi.fn();
    render(<ForumPostCard post={post} onOpen={onOpen} onPositive={() => {}} />);
    fireEvent.click(screen.getByText(/¿Cuánto cuesta un Ryzen/));
    expect(onOpen).toHaveBeenCalledWith(1);
  });
});
