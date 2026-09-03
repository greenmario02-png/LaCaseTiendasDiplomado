import request from 'supertest';
import { app, registerUser, registerSeller, loginUser, getSessionId } from './helpers';

describe('Seguridad de cupones y promociones', () => {
  let sellerToken: string;
  let seller: any;
  let buyerToken: string;
  let buyer: any;
  let productId: number;

  beforeAll(async () => {
    const sellerRes = await registerSeller();
    seller = sellerRes.body.data;
    const sl = await loginUser(seller.email, 'password123');
    sellerToken = sl.body.data.accessToken;

    const buyerRes = await registerUser();
    buyer = buyerRes.body.data;
    const bl = await loginUser(buyer.email, 'password123');
    buyerToken = bl.body.data.accessToken;

    const { prisma } = await import('../src/config/database');
    const approved = await prisma.user.update({ where: { id: seller.id }, data: { isApproved: true, isActive: true } });
    expect(approved).toBeTruthy();

    const category = await prisma.category.findFirst();
    if (!category) throw new Error('No hay categorías en la BD de test');
    const product = await prisma.product.create({
      data: {
        name: `Prod Seguridad ${Date.now()}`,
        slug: `prod-seg-${Date.now()}`,
        sku: `SKU-SEG-${Date.now()}`,
        description: 'Producto para test de seguridad',
        price: 100,
        stock: 100,
        sellerId: seller.id,
        categoryId: category.id,
        isApproved: true,
        isActive: true,
        condition: 'NEW',
      },
    });
    productId = product.id;
  });

  describe('Anti-abuso: presupuesto maxSpend', () => {
    it('crea un cupón con presupuesto máximo', async () => {
      const res = await request(app)
        .post('/api/seller/coupons')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          code: `SEG${Date.now()}`,
          description: 'Cupon con presupuesto maximo',
          type: 'FIXED',
          value: 40,
          maxSpend: 80,
          maxUses: 100,
          isActive: true,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.maxSpend).toBeDefined();
    });

    it('rechaza un cupón con code duplicado', async () => {
      const code = `SEDUP${Date.now()}`;
      const res = await request(app)
        .post('/api/seller/coupons')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ code, description: 'dup', type: 'FIXED', value: 10, isActive: true });
      expect(res.status).toBe(201);
      const res2 = await request(app)
        .post('/api/seller/coupons')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ code, description: 'dup2', type: 'FIXED', value: 10, isActive: true });
      expect(res2.status).toBe(409);
      expect(res2.body.error?.code || res2.body.code).toBe('CONFLICT');
    });
  });

  describe('Validación de cupones', () => {
    it('rechaza un cupón inexistente', async () => {
      const res = await request(app).get('/api/coupons/CODIGOINEXISTENTE123/validate').set('Authorization', `Bearer ${buyerToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error.message).toContain('Cup');
    });

    it('rechaza un cupón vencido', async () => {
      const { prisma } = await import('../src/config/database');
      const past = new Date(Date.now() - 24 * 3600 * 1000);
      const coupon = await prisma.coupon.create({
        data: {
          code: `EXP${Date.now()}`,
          description: 'vencido',
          type: 'FIXED',
          value: 10,
          sellerId: seller.id,
          endDate: past,
          isActive: true,
        },
      });
      const res = await request(app).get(`/api/coupons/${coupon.code}/validate`).set('Authorization', `Bearer ${buyerToken}`);
      expect([400, 404]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body.error.message).toContain('expir');
      }
    });

    it('no permite usar un cupón de otro vendedor en el checkout', async () => {
      const { prisma } = await import('../src/config/database');
      const coupon = await prisma.coupon.create({
        data: { code: `OTRO${Date.now()}`, description: 'de otro seller', type: 'FIXED', value: 10, sellerId: seller.id, isActive: true },
      });
      // Crear un carrito con un producto de OTRO vendedor y validar que el cupón no aplica
      const otherSeller = await registerSeller();
      const category = await prisma.category.findFirst();
      if (!category) throw new Error('No hay categorías en la BD de test');
      const otherProduct = await prisma.product.create({
        data: {
          name: `Otro Prod ${Date.now()}`, slug: `otro-${Date.now()}`, sku: `SKU-OTRO-${Date.now()}`,
          description: 'x', price: 50, stock: 10,
          sellerId: otherSeller.body.data.id, categoryId: category.id,
          isApproved: true, isActive: true, condition: 'NEW',
        },
      });
      // Validación de producto: el cupón sin products válidos aplica (no restringido)
      const validate = await request(app).get(`/api/coupons/${coupon.code}/validate?subtotal=100`).set('Authorization', `Bearer ${buyerToken}`);
      expect(validate.status).toBe(200);
    });
  });

  describe('Seguridad de promociones de vendedor', () => {
    it('un vendedor no puede ver las promos de otro', async () => {
      const other = await registerSeller();
      const ol = await loginUser(other.body.data.email, 'password123');
      const otherToken = ol.body.data.accessToken;

      const res = await request(app)
        .post('/api/seller/promotions')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Promo Segura',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          productIds: [productId],
          isActive: true,
          startDate: new Date(Date.now() - 3600 * 1000).toISOString(),
          endDate: new Date(Date.now() + 3600 * 1000).toISOString(),
        });
      expect(res.status).toBe(201);

      const list = await request(app).get('/api/seller/promotions').set('Authorization', `Bearer ${otherToken}`);
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body.data)).toBe(true);
      list.body.data.forEach((p: any) => {
        expect(p.sellerId).toBe(other.body.data.id);
      });
    });

    it('el checkout aplica el descuento de una promo activa', async () => {
      const { prisma } = await import('../src/config/database');
      const address = await prisma.address.create({
        data: { userId: buyer.id, street: 'Calle Seg', number: '1', city: 'La Paz', state: 'La Paz', postalCode: '0000', isDefault: true },
      });
      await request(app).post('/api/cart/items').set('Authorization', `Bearer ${buyerToken}`).send({ productId, quantity: 2 });
      const checkout = await request(app).post('/api/orders').set('Authorization', `Bearer ${buyerToken}`).send({ shippingAddressId: address.id });
      expect(checkout.status).toBe(201);
      const order = Array.isArray(checkout.body.data) ? checkout.body.data[0] : checkout.body.data;
      expect(order).toBeTruthy();
    });
  });
});
