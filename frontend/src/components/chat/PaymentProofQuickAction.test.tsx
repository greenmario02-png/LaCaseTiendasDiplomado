import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentProofQuickAction from './PaymentProofQuickAction';

const updateSellerPaymentStatus = vi.fn();
vi.mock('../../services/orders.api', () => ({
  ordersApi: { updateSellerPaymentStatus: (...args: unknown[]) => updateSellerPaymentStatus(...args) },
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

describe('PaymentProofQuickAction (accion rapida de pago en el chat)', () => {
  beforeEach(() => {
    updateSellerPaymentStatus.mockReset();
  });

  it('no muestra nada si el pago todavia no tiene comprobante (PENDING)', () => {
    const { container } = render(<PaymentProofQuickAction orderId={55} paymentStatus="PENDING" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra los botones de confirmar/rechazar cuando el comprobante esta pendiente de revision', () => {
    render(<PaymentProofQuickAction orderId={55} paymentStatus="PROOF_SUBMITTED" />);
    expect(screen.getByRole('button', { name: 'Marcar como pagado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar comprobante' })).toBeInTheDocument();
  });

  it('confirmar llama al mismo PUT /orders/seller/:id/payment-status que usa SellerOrders.tsx', async () => {
    updateSellerPaymentStatus.mockResolvedValue({});
    const onChanged = vi.fn();
    render(<PaymentProofQuickAction orderId={55} paymentStatus="PROOF_SUBMITTED" onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como pagado' }));
    expect(updateSellerPaymentStatus).not.toHaveBeenCalled();
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Marcar como pagado' }));
    expect(updateSellerPaymentStatus).toHaveBeenCalledWith(55, 'VERIFIED');
    expect(onChanged).toHaveBeenCalledWith(55, 'VERIFIED');
  });

  it('rechazar llama al endpoint con REJECTED', async () => {
    updateSellerPaymentStatus.mockResolvedValue({});
    const onChanged = vi.fn();
    render(<PaymentProofQuickAction orderId={55} paymentStatus="PROOF_SUBMITTED" onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: 'Rechazar comprobante' }));
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Rechazar comprobante' }));
    expect(updateSellerPaymentStatus).toHaveBeenCalledWith(55, 'REJECTED');
    expect(onChanged).toHaveBeenCalledWith(55, 'REJECTED');
  });

  it('una vez verificado muestra la insignia en vez de los botones', () => {
    render(<PaymentProofQuickAction orderId={55} paymentStatus="VERIFIED" />);
    expect(screen.getByText('Pago confirmado ✓')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como pagado' })).toBeNull();
  });

  it('una vez rechazado muestra la insignia de rechazo', () => {
    render(<PaymentProofQuickAction orderId={55} paymentStatus="REJECTED" />);
    expect(screen.getByText('Comprobante rechazado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar comprobante' })).toBeNull();
  });
});
