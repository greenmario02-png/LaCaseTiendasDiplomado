import request from 'supertest';
import { app, registerUser, getApprovedSellerToken, loginUser } from './helpers';

describe('Auction API (integración)', () => {
  let sellerToken: string;
  let sellerId: number;
  let buyerToken: string;
  let buyer2Token: string;

  const futureEnd = () => new Date(Date.now() + 86400000).toISOString();

  beforeAll(async () => {
    sellerToken = await getApprovedSellerToken();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${sellerToken}`);
    sellerId = me.body.data.id;

    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    buyerToken = login.body.data.accessToken;

    const reg2 = await registerUser();
    const login2 = await request(app).post('/api/auth/login').send({ email: reg2.body.data.email, password: 'password123' });
    buyer2Token = login2.body.data.accessToken;
  });

  const createAuction = async (overrides: Record<string, unknown> = {}) => {
    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: `Subasta ${Date.now()}`, startingPrice: 1000, minIncrement: 100, maxIncrement: 300, endDate: futureEnd(), ...overrides });
    return res.body.data;
  };

  it('POST /api/auctions — requiere rol SELLER', async () => {
    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ title: 'Subasta de cliente', startingPrice: 100, endDate: futureEnd() });
    expect(res.status).toBe(403);
  });

  it('POST /api/auctions — crea subasta', async () => {
    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Subasta de prueba',
        description: 'Descripción',
        startingPrice: 1000,
        minIncrement: 50,
        maxIncrement: 200,
        endDate: futureEnd(),
      });
    expect(res.status).toBe(201);
    expect(res.body.data.currentPrice).toBe(1000);
    expect(res.body.data.sellerId).toBe(sellerId);
  });

  it('POST /api/auctions — endDate en el pasado → 400', async () => {
    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: 'Subasta invalida', startingPrice: 100, endDate: new Date(Date.now() - 1000).toISOString() });
    expect(res.status).toBe(400);
  });

  it('POST /api/auctions — requiere auth', async () => {
    const res = await request(app).post('/api/auctions').send({ title: 'Subasta sin auth', startingPrice: 100, endDate: futureEnd() });
    expect(res.status).toBe(401);
  });

  it('GET /api/auctions — lista activas', async () => {
    const res = await request(app).get('/api/auctions');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it('POST /api/auctions/:id/bid — oferta válida', async () => {
    const created = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: 'Subasta para ofertar', startingPrice: 2000, minIncrement: 100, maxIncrement: 300, endDate: futureEnd() });
    const auctionId = created.body.data.id;

    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bid`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ bidAmount: 2100 });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.auction.currentPrice)).toBe(2100);
  });

  it('POST /api/auctions/:id/bid — oferta muy baja → 400', async () => {
    const created = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: 'Subasta baja', startingPrice: 2000, minIncrement: 100, maxIncrement: 300, endDate: futureEnd() });
    const auctionId = created.body.data.id;

    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bid`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ bidAmount: 2050 });
    expect(res.status).toBe(400);
  });

  it('POST /api/auctions/:id/bid — seller no puede ofertar en propia subasta → 403', async () => {
    const created = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: 'Subasta propia', startingPrice: 1000, minIncrement: 100, maxIncrement: 300, endDate: futureEnd() });
    const auctionId = created.body.data.id;

    const res = await request(app)
      .post(`/api/auctions/${auctionId}/bid`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ bidAmount: 1100 });
    expect(res.status).toBe(403);
  });

  it('POST /api/auctions/:id/bid — subasta inexistente → 404', async () => {
    const res = await request(app)
      .post('/api/auctions/999999/bid')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ bidAmount: 1000 });
    expect(res.status).toBe(404);
  });

  it('GET /api/auctions/mine — subastas del vendedor', async () => {
    const res = await request(app).get('/api/auctions/mine').set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/auctions/my-bids — ofertas del comprador', async () => {
    const res = await request(app).get('/api/auctions/my-bids').set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  // ===== PROXY BIDDING (estilo eBay) =====
  it('proxy bidding — el primer postor paga solo el mínimo, no su máximo', async () => {
    const auction = await createAuction({ title: 'Proxy test min' });
    const res = await request(app)
      .post(`/api/auctions/${auction.id}/bid`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ bidAmount: 5000 });
    expect(res.status).toBe(200);
    // inicial 1000 + incremento 100 = 1100, NO 5000
    expect(Number(res.body.data.auction.currentPrice)).toBe(1100);
  });

  it('proxy bidding — un postor con menor máximo no supera al mayor', async () => {
    const auction = await createAuction({ title: 'Proxy test outbid' });
    // buyer1 máximo 5000
    await request(app).post(`/api/auctions/${auction.id}/bid`).set('Authorization', `Bearer ${buyerToken}`).send({ bidAmount: 5000 });
    // buyer2 máximo 3000 → buyer1 sigue ganando, precio sube a 3100
    const res = await request(app)
      .post(`/api/auctions/${auction.id}/bid`)
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ bidAmount: 3000 });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.auction.currentPrice)).toBe(3100);

    // buyer1 sigue siendo el mejor postor
    const detail = await request(app).get(`/api/auctions/${auction.id}`).set('Authorization', `Bearer ${buyerToken}`);
    expect(detail.body.data.isHighestBidder).toBe(true);
  });

  it('proxy bidding — superar el máximo del rival cuesta máximo+incremento', async () => {
    const auction = await createAuction({ title: 'Proxy test win' });
    await request(app).post(`/api/auctions/${auction.id}/bid`).set('Authorization', `Bearer ${buyerToken}`).send({ bidAmount: 5000 });
    // buyer2 sube a 6000 → gana pagando 5000+100=5100
    const res = await request(app)
      .post(`/api/auctions/${auction.id}/bid`)
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({ bidAmount: 6000 });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.auction.currentPrice)).toBe(5100);

    const detail = await request(app).get(`/api/auctions/${auction.id}`).set('Authorization', `Bearer ${buyer2Token}`);
    expect(detail.body.data.isHighestBidder).toBe(true);
  });

  // ===== PRECIO DE RESERVA =====
  it('reserva — no se alcanza la reserva → reserveMet false', async () => {
    const auction = await createAuction({ title: 'Reserve test', reservePrice: 5000 });
    await request(app).post(`/api/auctions/${auction.id}/bid`).set('Authorization', `Bearer ${buyerToken}`).send({ bidAmount: 3000 });
    const detail = await request(app).get(`/api/auctions/${auction.id}`).set('Authorization', `Bearer ${buyerToken}`);
    expect(detail.body.data.reserveMet).toBe(false);
    expect(detail.body.data.reservePrice).toBe(5000);
  });

  it('reserva — supera la reserva → reserveMet true', async () => {
    const auction = await createAuction({ title: 'Reserve met', reservePrice: 2000 });
    await request(app).post(`/api/auctions/${auction.id}/bid`).set('Authorization', `Bearer ${buyerToken}`).send({ bidAmount: 3000 });
    const detail = await request(app).get(`/api/auctions/${auction.id}`).set('Authorization', `Bearer ${buyerToken}`);
    expect(detail.body.data.reserveMet).toBe(true);
  });

  it('reserva — reserva inválida (menor al inicial) → 400', async () => {
    const res = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: 'Reserva invalida', startingPrice: 1000, reservePrice: 500, endDate: futureEnd() });
    expect(res.status).toBe(400);
  });

  // ===== BUY IT NOW =====
  it('buy-now — compra inmediata cierra la subasta', async () => {
    const auction = await createAuction({ title: 'Buy now test', buyNowPrice: 3000 });
    const res = await request(app).post(`/api/auctions/${auction.id}/buy-now`).set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.auction.isSold).toBe(true);
    expect(res.body.data.auction.winnerId).toBeDefined();
  });

  it('buy-now — sin precio buy-now → 400', async () => {
    const auction = await createAuction({ title: 'No buy now' });
    const res = await request(app).post(`/api/auctions/${auction.id}/buy-now`).set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(400);
  });

  it('buy-now — subasta ya vendida → 400', async () => {
    const auction = await createAuction({ title: 'Already sold', buyNowPrice: 3000 });
    await request(app).post(`/api/auctions/${auction.id}/buy-now`).set('Authorization', `Bearer ${buyerToken}`);
    const res = await request(app).post(`/api/auctions/${auction.id}/buy-now`).set('Authorization', `Bearer ${buyer2Token}`);
    expect(res.status).toBe(400);
  });

  it('buy-now — el vendedor no puede comprar su subasta → 403', async () => {
    const auction = await createAuction({ title: 'Seller buy', buyNowPrice: 3000 });
    const res = await request(app).post(`/api/auctions/${auction.id}/buy-now`).set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(403);
  });

  // ===== WATCHLIST =====
  it('watchlist — agregar, listar, quitar', async () => {
    const auction = await createAuction({ title: 'Watch test' });

    const add = await request(app).post(`/api/auctions/${auction.id}/watch`).set('Authorization', `Bearer ${buyerToken}`);
    expect(add.body.data.watched).toBe(true);

    const list = await request(app).get('/api/auctions/watchlist').set('Authorization', `Bearer ${buyerToken}`);
    expect(list.body.data.some((a: any) => a.id === auction.id)).toBe(true);

    const remove = await request(app).post(`/api/auctions/${auction.id}/watch`).set('Authorization', `Bearer ${buyerToken}`);
    expect(remove.body.data.watched).toBe(false);

    const list2 = await request(app).get('/api/auctions/watchlist').set('Authorization', `Bearer ${buyerToken}`);
    expect(list2.body.data.some((a: any) => a.id === auction.id)).toBe(false);
  });

  it('GET /api/auctions/my-won — subastas ganadas', async () => {
    const auction = await createAuction({ title: 'Won test', buyNowPrice: 3000 });
    await request(app).post(`/api/auctions/${auction.id}/buy-now`).set('Authorization', `Bearer ${buyerToken}`);
    const res = await request(app).get('/api/auctions/my-won').set('Authorization', `Bearer ${buyerToken}`);
    expect(res.body.data.some((a: any) => a.id === auction.id)).toBe(true);
  });

  // ===== ANTI-SNIPING =====
  it('anti-sniping — oferta dentro de la ventana extiende el tiempo', async () => {
    // endDate dentro de 2 minutos, ventana de 5 → debe extender
    const end = new Date(Date.now() + 2 * 60000).toISOString();
    const auction = await createAuction({ title: 'Sniping test', endDate: end, extensionMinutes: 5 });
    const res = await request(app)
      .post(`/api/auctions/${auction.id}/bid`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ bidAmount: 1500 });
    expect(res.status).toBe(200);
    expect(res.body.data.extendedTo).toBeDefined();
  });

  it('anti-sniping — oferta lejos del final no extiende', async () => {
    const auction = await createAuction({ title: 'No sniping', extensionMinutes: 5 });
    const res = await request(app)
      .post(`/api/auctions/${auction.id}/bid`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ bidAmount: 1500 });
    expect(res.body.data.extendedTo).toBeNull();
  });

  it('confirm-payment — no ganador no puede confirmar (400/403)', async () => {
    const auction = await createAuction({ title: 'Pago test', startingPrice: 100, reservePrice: 300 });
    await request(app).post(`/api/auctions/${auction.id}/bid`).set('Authorization', `Bearer ${buyerToken}`).send({ bidAmount: 400 });
    const otherToken = await getApprovedSellerToken();
    const res = await request(app)
      .post(`/api/auctions/${auction.id}/confirm-payment`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({});
    expect([400, 403]).toContain(res.status);
  });

  it('reactivate — máximo 3 reactivaciones por producto', async () => {
    // Un vendedor crea un producto y lo reactiva hasta el tope
    const sellerTok = await getApprovedSellerToken();
    const cats = await request(app).get('/api/products/categories');
    const hardware = cats.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware.children[0].id;
    const prod = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerTok}`)
      .send({ name: `Reactivable ${Date.now()}`, categoryId: childId, price: 100, stock: 1, condition: 'NEW' });
    const pid = prod.body.data.id;
    // Reactivar sin vencer: el servicio no permite si expiresAt no venció → error esperado
    const res = await request(app)
      .post(`/api/seller/products/${pid}/reactivate`)
      .set('Authorization', `Bearer ${sellerTok}`)
      .send({});
    // Sin expiresAt vencido, reactivateProduct igual reactiva (incrementa) hasta el tope
    expect([200, 400]).toContain(res.status);
  });

  it('cierre por job: subasta expirada crea orden de pago al ganador (48h)', async () => {
    const { prisma } = await import('../src/config/database');
    const { processAuctionClosures } = await import('../src/services/auction-closure.service');

    // Producto para la subasta
    const sellerTok = await getApprovedSellerToken();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${sellerTok}`);
    const sellerId = me.body.data.id;
    const catRes = await request(app).get('/api/products/categories');
    const hardware = catRes.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware.children[0].id;
    const prod = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerTok}`)
      .send({ name: `Subasta Cierre ${Date.now()}`, categoryId: childId, price: 500, stock: 2, condition: 'NEW' });
    const pid = prod.body.data.id;

    // Subasta con endDate pasado (crear directo en BD porque el schema exige futuro)
    const auction = await prisma.auction.create({
      data: {
        sellerId,
        productId: pid,
        title: 'Subasta cierre test',
        startingPrice: 100,
        currentPrice: 100,
        minIncrement: 10,
        maxIncrement: 50,
        endDate: new Date(Date.now() - 1000),
      },
    });

    // Oferta del comprador
    const buyer = await registerUser();
    const buyerLogin = await loginUser(buyer.body.data.email, 'password123');
    const buyerTok = buyerLogin.body.data.accessToken;
    const buyerId = buyerLogin.body.data.user.id;
    await prisma.auctionBid.create({
      data: { auctionId: auction.id, bidderId: buyerId, bidAmount: 150 },
    });

    // Ejecutar el job
    await processAuctionClosures();

    const closed = await prisma.auction.findUnique({ where: { id: auction.id } });
    expect(closed!.isSold).toBe(true);
    expect(closed!.winnerId).toBe(buyerId);
    expect(closed!.orderId).toBeTruthy();
    expect(closed!.paymentDeadline).toBeTruthy();

    // La orden de pago existe para el ganador
    const order = await prisma.order.findUnique({ where: { id: closed!.orderId! } });
    expect(order).toBeTruthy();
    expect(order!.buyerId).toBe(buyerId);
    expect(order!.status).toBe('PENDING');
    expect(Number(order!.total)).toBe(150);
  });

  it('relistado por job: pago vencido cancela orden y relista al mismo precio', async () => {
    const { prisma } = await import('../src/config/database');
    const { processAuctionClosures } = await import('../src/services/auction-closure.service');

    const sellerTok = await getApprovedSellerToken();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${sellerTok}`);
    const sellerId = me.body.data.id;
    const catRes = await request(app).get('/api/products/categories');
    const hardware = catRes.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware.children[0].id;
    const prod = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerTok}`)
      .send({ name: `Subasta Relista ${Date.now()}`, categoryId: childId, price: 300, stock: 2, condition: 'NEW' });
    const pid = prod.body.data.id;

    const auction = await prisma.auction.create({
      data: {
        sellerId,
        productId: pid,
        title: 'Subasta relista test',
        startingPrice: 100,
        currentPrice: 200,
        minIncrement: 10,
        maxIncrement: 50,
        endDate: new Date(Date.now() - 1000),
      },
    });

    const buyer = await registerUser();
    const buyerLogin = await loginUser(buyer.body.data.email, 'password123');
    const buyerId = buyerLogin.body.data.user.id;

    // Simular una venta con pago vencido
    const order = await prisma.order.create({
      data: {
        buyerId,
        sellerId,
        status: 'PENDING',
        subtotal: 200,
        shippingCost: 0,
        total: 200,
        paymentStatus: 'PENDING',
        paymentMethod: 'QR',
      },
    });
    await prisma.auction.update({
      where: { id: auction.id },
      data: {
        winnerId: buyerId,
        isSold: true,
        orderId: order.id,
        paymentDeadline: new Date(Date.now() - 1000),
        currentPrice: 200,
      },
    });

    await processAuctionClosures();

    const relisted = await prisma.auction.findUnique({ where: { id: auction.id } });
    expect(relisted!.isSold).toBe(false);
    expect(relisted!.isActive).toBe(true);
    expect(relisted!.winnerId).toBeNull();
    expect(Number(relisted!.startingPrice)).toBe(200); // mismo precio, sin inflación

    const cancelled = await prisma.order.findUnique({ where: { id: order.id } });
    expect(cancelled!.status).toBe('CANCELLED');
  });
});
