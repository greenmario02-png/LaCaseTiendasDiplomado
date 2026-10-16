import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useCurrencyStore } from '../../stores/currencyStore';
import { useCartSelection } from '../../stores/cartSelectionStore';
import { ACCOUNT_SHORTCUTS } from '../../components/layout/Navbar';

/** Moneda en todas partes, selección del carrito, datos de pago, aviso aleatorio, chat al pagar y accesos al pago. */

const apiGet = api.get as unknown as ReturnType<typeof vi.fn>;
const apiPost = api.post as unknown as ReturnType<typeof vi.fn>;

vi.mock('../../services/api', () => ({
  resolveImageUrl: (u?: string | null) => u ?? '',
  getErrorMessage: (e: unknown) => (e as Error).message,
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const cartState = {
  cart: {
    cartId: 1,
    itemCount: 3,
    subtotal: 150,
    items: [] as unknown[],
    groupedBySeller: [
      { seller: { id: 7, storeName: 'Tienda Siete', rating: 5, locationCity: 'Tarija' }, subtotal: 80, items: [{ id: 11, quantity: 2, unitPrice: '40', lineTotal: 80, product: { id: 1, name: 'Arroz', price: '40', stock: 9, seller: { id: 7 }, images: [] } }] },
      { seller: { id: 9, storeName: 'Tienda Nueve', rating: 5, locationCity: 'Tarija' }, subtotal: 70, items: [{ id: 12, quantity: 1, unitPrice: '70', lineTotal: 70, product: { id: 2, name: 'Azúcar', price: '70', stock: 9, seller: { id: 9 }, images: [] } }] },
    ],
  },
  loading: false,
  fetchCart: vi.fn(() => Promise.resolve()),
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
};
cartState.cart.items = cartState.cart.groupedBySeller.flatMap((g) => g.items);

vi.mock('../../stores/cartStore', () => ({
  useCartStore: (sel?: (s: unknown) => unknown) => (sel ? sel(cartState) : cartState),
}));

const authState: { user: unknown } = { user: { id: 5, email: 'c@t.com', role: 'CUSTOMER', firstName: 'Cli' } };
vi.mock('../../stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) => (sel ? sel(authState) : authState),
}));

const PAYINFO = { storeId: 7, storeName: 'Tienda Siete', available: true, approved: true, full: true, qrUrl: '/uploads/payment-qr/q7-aa.png', method: 'BANK', bankName: 'BNB', accountHolder: 'Luis Mamani Cruz', accountNumber: '4455667788', phoneQr: null };

function routeApi() {
  apiGet.mockImplementation((url: string) => {
    if (url === '/account/addresses') return Promise.resolve({ data: { data: [] } });
    if (url.startsWith('/stores/')) return Promise.resolve({ data: { data: { ...PAYINFO, storeId: Number(url.split('/')[2]) } } });
    if (url === '/orders/buyer/pending-payment-count') return Promise.resolve({ data: { data: { count: 3 } } });
    if (url === '/orders/buyer') return Promise.resolve({ data: { data: [], meta: { totalPages: 1 } } });
    return Promise.reject(new Error(`sin mock: ${url}`));
  });
}

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useCartSelection.setState({ excluded: [] });
  useCurrencyStore.setState({ selected: 'BOB', currencies: [{ code: 'BOB', name: 'Boliviano', symbol: 'Bs', rate: 1, isDefault: true }, { code: 'USD', name: 'Dólar', symbol: 'US$', rate: 10, isDefault: false }, { code: 'EUR', name: 'Euro', symbol: '€', rate: 12.5, isDefault: false }] });
  routeApi();
});

describe('Moneda: la denominación sigue a la moneda elegida', () => {
  it('el carrito muestra US$ / € (no «Bs») cuando se elige otra moneda', async () => {
    const { default: CartPage } = await import('../CartPage');
    useCurrencyStore.setState({ selected: 'USD' });
    const { unmount } = render(<MemoryRouter><CartPage /></MemoryRouter>);
    expect(screen.getAllByText(/US\$ 15[.,]00/).length).toBeGreaterThan(0); // total 150 Bs -> 15 US$
    expect(screen.queryByText(/^Bs /)).toBeNull();
    unmount();
    useCurrencyStore.setState({ selected: 'EUR' });
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    expect(screen.getAllByText(/€ 12[.,]00/).length).toBeGreaterThan(0);
  });
});

describe('Carrito: pagar solo lo seleccionado', () => {
  it('casillas por producto, por tienda y «Seleccionar todo»; el resumen suma solo lo marcado', async () => {
    const { default: CartPage } = await import('../CartPage');
    const user = userEvent.setup();
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    expect(screen.getByRole('checkbox', { name: 'Seleccionar todo' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Azúcar para pagar' }));
    expect(screen.getByText('1 de 2 productos seleccionados')).toBeInTheDocument();
    expect(screen.getAllByText('Bs 80').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Ir a pagar (1)' })).toBeEnabled();
    expect(JSON.parse(localStorage.getItem('cartExcluded')!)).toEqual([12]);
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar todos los productos de Tienda Siete' }));
    expect(screen.getByRole('button', { name: 'Ir a pagar (0)' })).toBeDisabled();
    expect(screen.getByText('Selecciona al menos un producto para pagar.')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Seleccionar todo' }));
    expect(screen.getByRole('button', { name: 'Ir a pagar (2)' })).toBeEnabled();
  });

  it('las casillas tienen un área táctil de 44 px', async () => {
    const { default: CartPage } = await import('../CartPage');
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    const box = screen.getByRole('checkbox', { name: 'Seleccionar Arroz para pagar' }).closest('.MuiCheckbox-root') as HTMLElement;
    expect(getComputedStyle(box).width).toBe('44px');
    expect(getComputedStyle(box).height).toBe('44px');
  });
});

describe('Checkout: solo lo seleccionado, datos de pago, aviso y chat al pagar', () => {
  it('envía cartItemIds, muestra datos de pago con copiar y el aviso; al confirmar abre el chat del pedido', async () => {
    useCartSelection.setState({ excluded: [12] });
    apiPost.mockImplementation((url: string) => {
      if (url === '/orders') return Promise.resolve({ data: { data: [{ id: 501, sellerId: 7 }] } });
      if (url === '/chat/order/501/open') return Promise.resolve({ data: { data: { id: 77, orderId: 501 } } });
      return Promise.resolve({ data: { data: {} } });
    });
    const { default: CheckoutPage } = await import('../CheckoutPage');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    // datos de pago solo de la tienda seleccionada
    expect(await screen.findByText('Datos de pago · Tienda Siete')).toBeInTheDocument();
    expect(screen.queryByText('Datos de pago · Tienda Nueve')).toBeNull();
    expect(await screen.findByText('4455667788')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar Número de cuenta' })).toBeInTheDocument();
    expect(screen.getAllByTestId('payment-safety-tip').length).toBeGreaterThan(0);
    // retiro en tienda -> confirmar
    await user.click(screen.getByLabelText(/Retiro en tienda \(gratis\)/));
    fireEvent.change(screen.getByPlaceholderText(/Av\. 16 de Julio/), { target: { value: 'En la tienda' } });
    await user.click(screen.getByRole('button', { name: 'Continuar sin envío' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmar y abrir el chat de pago' }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/mensajes/77'));
    const body = apiPost.mock.calls.find((c) => c[0] === '/orders')![1];
    expect(body.cartItemIds).toEqual([11]);
    expect(apiPost).toHaveBeenCalledWith('/chat/order/501/open');
  });

  it('si el servidor responde 409 CART_SELECTION_STALE, lo avisa y recarga el carrito', async () => {
    apiPost.mockImplementation((url: string) => {
      if (url === '/orders') return Promise.reject({ response: { status: 409, data: { error: { code: 'CART_SELECTION_STALE', message: 'x' } } } });
      return Promise.resolve({ data: { data: {} } });
    });
    const { default: CheckoutPage } = await import('../CheckoutPage');
    const user = userEvent.setup();
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await user.click(screen.getByLabelText(/Retiro en tienda \(gratis\)/));
    fireEvent.change(screen.getByPlaceholderText(/Av\. 16 de Julio/), { target: { value: 'En la tienda' } });
    await user.click(screen.getByRole('button', { name: 'Continuar sin envío' }));
    cartState.fetchCart.mockClear();
    await user.click(await screen.findByRole('button', { name: 'Confirmar y abrir el chat de pago' }));
    expect(await screen.findByText('Tu carrito cambió. Revisa la selección e inténtalo de nuevo.')).toBeInTheDocument();
    expect(cartState.fetchCart).toHaveBeenCalled();
  });

  it('si no se puede abrir el chat del pedido, cae a la confirmación de siempre', async () => {
    apiPost.mockImplementation((url: string) => {
      if (url === '/orders') return Promise.resolve({ data: { data: [{ id: 502, sellerId: 7 }] } });
      return Promise.reject(new Error('sin chat'));
    });
    const { default: CheckoutPage } = await import('../CheckoutPage');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText(/Retiro en tienda \(gratis\)/));
    fireEvent.change(screen.getByPlaceholderText(/Av\. 16 de Julio/), { target: { value: 'En la tienda' } });
    await user.click(screen.getByRole('button', { name: 'Continuar sin envío' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmar y abrir el chat de pago' }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/checkout/confirmacion/502'));
  });
});

describe('Aviso de seguridad aleatorio', () => {
  it('para montos > Bs 50 prioriza verificar la tienda física; «Ver otra» cambia la recomendación', async () => {
    const { default: PaymentSafetyTip } = await import('../../components/payments/PaymentSafetyTip');
    render(<PaymentSafetyTip amountBs={120} rng={() => 0} />);
    expect(screen.getByText(/verifica la existencia física de la tienda antes de pagar/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver otra recomendación' }));
    expect(screen.getByTestId('payment-safety-tip').getAttribute('data-tip')).not.toBe('physicalStore');
  });

  it('montos chicos con RNG 0: la del QR y el nombre del vendedor', async () => {
    const { default: PaymentSafetyTip } = await import('../../components/payments/PaymentSafetyTip');
    render(<PaymentSafetyTip amountBs={20} rng={() => 0} />);
    expect(screen.getByText(/nombre que aparece al escanear el QR coincida/)).toBeInTheDocument();
  });
});

describe('Tarjeta «Datos de pago»', () => {
  it('enmascarado: sin botón copiar y con explicación', async () => {
    const { default: StorePaymentCard } = await import('../../components/payments/StorePaymentCard');
    render(<MemoryRouter><StorePaymentCard storeId={7} info={{ ...PAYINFO, full: false, accountNumber: '••••••7788', accountHolder: 'Luis M. C.' } as never} /></MemoryRouter>);
    expect(screen.getByText('••••••7788')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Copiar Número/ })).toBeNull();
    expect(screen.getByText(/Verás el número completo/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR de pago de Tienda Siete' })).toBeInTheDocument();
  });

  it('copiar pone el número en el portapapeles', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { default: StorePaymentCard } = await import('../../components/payments/StorePaymentCard');
    render(<MemoryRouter><StorePaymentCard storeId={7} info={PAYINFO as never} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Copiar Número de cuenta' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('4455667788'));
  });

  it('sin datos aprobados: lo dice claramente', async () => {
    const { default: StorePaymentCard } = await import('../../components/payments/StorePaymentCard');
    render(<MemoryRouter><StorePaymentCard storeId={7} info={{ ...PAYINFO, available: false, approved: false, qrUrl: null, accountNumber: null } as never} /></MemoryRouter>);
    expect(screen.getByText(/todavía no tiene datos de pago/)).toBeInTheDocument();
  });
});

describe('Subida de imagen (sin URL) con vista previa', () => {
  it('no ofrece campo de texto para URL, valida tipo y tamaño, previsualiza y permite quitar', async () => {
    const { default: ImageUploadField } = await import('../../components/payments/ImageUploadField');
    const upload = vi.fn(() => Promise.resolve('/uploads/payment-qr/q5-bb.png'));
    const onChange = vi.fn();
    (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:preview';
    (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;
    const { container, rerender } = render(<ImageUploadField label="QR de cobro" value={null} upload={upload} onChange={onChange} previewAlt="Vista previa del QR de cobro" />);
    expect(screen.queryByRole('textbox')).toBeNull();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    fireEvent.change(input, { target: { files: [new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Usa una imagen JPG, PNG o WebP.');
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('La imagen pesa más de 2 MB.');
    fireEvent.change(input, { target: { files: [new File(['png'], 'qr.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/uploads/payment-qr/q5-bb.png'));
    expect(screen.getByRole('img', { name: 'Vista previa del QR de cobro' })).toBeInTheDocument();
    rerender(<ImageUploadField label="QR de cobro" value="/uploads/payment-qr/q5-bb.png" upload={upload} onChange={onChange} previewAlt="Vista previa del QR de cobro" />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('Accesos directos al pago en el menú de cuenta', () => {
  it('«Mis pedidos», «Pagar pedidos pendientes» (con contador) y «Mensajes» van primero', () => {
    expect(ACCOUNT_SHORTCUTS.map((i) => [i.id, i.to, i.badge])).toEqual([
      ['orders', '/cuenta/pedidos', undefined],
      ['payPending', '/cuenta/pedidos?pago=pendiente', 'pay'],
      ['messages', '/mensajes', 'chat'],
    ]);
  });

  it('la lista de pedidos filtra los pendientes de pago con ?pago=pendiente', async () => {
    const { default: OrdersPage } = await import('../account/OrdersPage');
    render(<MemoryRouter initialEntries={['/cuenta/pedidos?pago=pendiente']}><OrdersPage /></MemoryRouter>);
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/orders/buyer', { params: { page: 1, limit: 10, payment: 'pending' } }));
    const group = await screen.findByRole('group');
    expect(within(group).getByRole('button', { name: 'Pagar pedidos pendientes' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('el menú de cuenta muestra los accesos y el contador de pedidos por pagar', async () => {
    const { default: Navbar } = await import('../../components/layout/Navbar');
    const user = userEvent.setup();
    render(<MemoryRouter><Navbar /></MemoryRouter>);
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/orders/buyer/pending-payment-count'));
    await user.click(screen.getByRole('button', { name: 'Mi cuenta' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /Mis pedidos/ })).toBeInTheDocument();
    const pay = within(menu).getByRole('menuitem', { name: /Pagar pedidos pendientes/ });
    await waitFor(() => expect(pay.textContent).toContain('(3)'));
    expect(within(menu).getByRole('menuitem', { name: /Mensajes/ })).toBeInTheDocument();
  });
});
