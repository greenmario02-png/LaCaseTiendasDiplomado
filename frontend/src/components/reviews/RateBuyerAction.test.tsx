import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RateBuyerAction from './RateBuyerAction';

const addBuyerReview = vi.fn();
vi.mock('../../services/orders.api', () => ({
  ordersApi: { addBuyerReview: (...args: unknown[]) => addBuyerReview(...args) },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

describe('RateBuyerAction (mitad vendedor->comprador de las calificaciones)', () => {
  beforeEach(() => {
    addBuyerReview.mockReset();
  });

  it('no muestra nada si la orden no esta entregada y pagada verificada', () => {
    const { container } = render(
      <RateBuyerAction orderId={1} status="SHIPPED" paymentStatus="VERIFIED" rated={false} onRated={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('no muestra nada si el pago todavia no esta verificado, aunque este entregada', () => {
    const { container } = render(
      <RateBuyerAction orderId={1} status="DELIVERED" paymentStatus="PROOF_SUBMITTED" rated={false} onRated={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el boton cuando la orden esta DELIVERED + VERIFIED y aun no fue calificada', () => {
    render(<RateBuyerAction orderId={1} status="DELIVERED" paymentStatus="VERIFIED" rated={false} onRated={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Calificar comprador' })).toBeInTheDocument();
  });

  it('muestra la insignia en vez del boton cuando ya se califico', () => {
    render(<RateBuyerAction orderId={1} status="DELIVERED" paymentStatus="VERIFIED" rated onRated={vi.fn()} />);
    expect(screen.getByText('Comprador calificado ✓')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Calificar comprador' })).toBeNull();
  });

  it('al enviar la calificacion llama a ordersApi.addBuyerReview y marca la orden como calificada', async () => {
    addBuyerReview.mockResolvedValue({});
    const onRated = vi.fn();
    const user = userEvent.setup();
    render(<RateBuyerAction orderId={42} buyerName="Mario" status="DELIVERED" paymentStatus="VERIFIED" rated={false} onRated={onRated} />);

    await user.click(screen.getByRole('button', { name: 'Calificar comprador' }));
    expect(await screen.findByText('Calificar a Mario')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Comentario (opcional)'), 'Buen comprador');
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }));

    await waitFor(() => expect(addBuyerReview).toHaveBeenCalledWith(42, { rating: 5, comment: 'Buen comprador' }));
    expect(onRated).toHaveBeenCalledWith(42);
  });

  it('si el backend responde 409 (ya calificado), avisa y de todas formas marca la orden como calificada', async () => {
    addBuyerReview.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: {} } });
    const onRated = vi.fn();
    const user = userEvent.setup();
    render(<RateBuyerAction orderId={7} status="DELIVERED" paymentStatus="VERIFIED" rated={false} onRated={onRated} />);

    await user.click(screen.getByRole('button', { name: 'Calificar comprador' }));
    await user.click(await screen.findByRole('button', { name: 'Enviar calificación' }));

    await waitFor(() => expect(onRated).toHaveBeenCalledWith(7));
  });
});
