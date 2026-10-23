import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrderContextCard from './OrderContextCard';
import { unifiedLight } from '../../theme/unifiedTokens';
import type { OrderSummary } from '../../services/chat.api';

const addBuyerReview = vi.fn();
vi.mock('../../services/orders.api', () => ({
  ordersApi: { addBuyerReview: (...args: unknown[]) => addBuyerReview(...args) },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const order = (extra: Partial<OrderSummary> = {}): OrderSummary => ({
  id: 9,
  status: 'DELIVERED',
  paymentStatus: 'VERIFIED',
  paymentMethod: null,
  total: 100,
  subtotal: 100,
  shippingCost: null,
  createdAt: new Date().toISOString(),
  items: [],
  ...extra,
});

const renderCard = (props: Partial<React.ComponentProps<typeof OrderContextCard>> = {}) =>
  render(
    <MemoryRouter>
      <OrderContextCard order={order()} role="SELLER" tokens={unifiedLight} canSend busy={false} onSendQr={vi.fn()} onSendProof={vi.fn()} {...props} />
    </MemoryRouter>,
  );

describe('OrderContextCard: accion "Calificar comprador" para el vendedor en el chat', () => {
  it('muestra el boton de calificar cuando el pedido esta entregado y el pago verificado, y aun no fue calificado', () => {
    renderCard({ buyerName: 'Mario' });
    expect(screen.getByRole('button', { name: 'Calificar comprador' })).toBeInTheDocument();
  });

  it('no muestra el boton si el pedido todavia no esta entregado', () => {
    renderCard({ order: order({ status: 'SHIPPED' }) });
    expect(screen.queryByRole('button', { name: 'Calificar comprador' })).toBeNull();
  });

  it('no muestra el boton para el comprador (solo el vendedor califica)', () => {
    renderCard({ role: 'BUYER' });
    expect(screen.queryByRole('button', { name: 'Calificar comprador' })).toBeNull();
  });

  it('muestra la insignia en vez del boton cuando buyerRated es true', () => {
    renderCard({ buyerRated: true });
    expect(screen.getByText('Comprador calificado ✓')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Calificar comprador' })).toBeNull();
  });
});
