import request from 'supertest';
import { app, getAdminToken, getApprovedSellerToken } from './helpers';

describe('Admin CRUD completo (integración)', () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await getAdminToken();
  });

  it('categories — soft delete (desactiva)', async () => {
    const created = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `CRUD Cat ${Date.now()}` });
    const id = created.body.data.id;

    const del = await request(app).delete(`/api/admin/categories/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);

    const list = await request(app).get('/api/admin/categories').set('Authorization', `Bearer ${adminToken}`);
    const found = list.body.data.find((c: any) => c.id === id);
    expect(found.isActive).toBe(false);
  });

  it('categories — delete inexistente → 404', async () => {
    const res = await request(app).delete('/api/admin/categories/999999').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('attributes — create + update + delete', async () => {
    const created = await request(app)
      .post('/api/admin/attributes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `CRUD Attr ${Date.now()}`, type: 'TEXT' });
    const id = created.body.data.id;

    const upd = await request(app).put(`/api/admin/attributes/${id}`).set('Authorization', `Bearer ${adminToken}`).send({ unit: 'cm' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.unit).toBe('cm');

    const del = await request(app).delete(`/api/admin/attributes/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it('promotions — soft delete', async () => {
    const created = await request(app)
      .post('/api/admin/promotions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: `CRUD Promo ${Date.now()}`, discountType: 'PERCENTAGE', discountValue: 10, startDate: '2026-08-01T00:00:00Z', endDate: '2026-09-01T00:00:00Z' });
    const id = created.body.data.id;

    const del = await request(app).delete(`/api/admin/promotions/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);

    const list = await request(app).get('/api/admin/promotions').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data.find((p: any) => p.id === id).isActive).toBe(false);
  });

  it('tags — create + update + delete', async () => {
    const created = await request(app)
      .post('/api/admin/tags')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `CRUD Tag ${Date.now()}` });
    const id = created.body.data.id;

    const upd = await request(app).put(`/api/admin/tags/${id}`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Renombrado' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.name).toBe('Renombrado');

    const del = await request(app).delete(`/api/admin/tags/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it('faqs — CRUD completo', async () => {
    const created = await request(app)
      .post('/api/admin/content/faqs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question: '¿Pregunta de test?', answer: 'Respuesta de test' });
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const upd = await request(app)
      .put(`/api/admin/content/faqs/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ answer: 'Respuesta actualizada' });
    expect(upd.body.data.answer).toBe('Respuesta actualizada');

    const list = await request(app).get('/api/admin/content/faqs').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data.find((f: any) => f.id === id)).toBeDefined();

    const del = await request(app).delete(`/api/admin/content/faqs/${id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(200);
  });

  it('warranties — CRUD', async () => {
    const created = await request(app)
      .post('/api/admin/content/warranties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Garantía test', content: 'Contenido de garantía' });
    const id = created.body.data.id;
    expect(id).toBeDefined();

    const upd = await request(app)
      .put(`/api/admin/content/warranties/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ content: 'Nuevo contenido' });
    expect(upd.body.data.content).toBe('Nuevo contenido');

    await request(app).delete(`/api/admin/content/warranties/${id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('reaches — CRUD', async () => {
    const created = await request(app)
      .post('/api/admin/content/reaches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Alcance test', content: 'Contenido alcance' });
    const id = created.body.data.id;

    const list = await request(app).get('/api/admin/content/reaches').set('Authorization', `Bearer ${adminToken}`);
    expect(list.body.data.find((r: any) => r.id === id)).toBeDefined();

    await request(app).delete(`/api/admin/content/reaches/${id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('products admin — listAll + edit + soft delete', async () => {
    const list = await request(app).get('/api/admin/products').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.data)).toBe(true);
    if (list.body.data.length > 0) {
      const p = list.body.data[0];
      const upd = await request(app).put(`/api/admin/products/${p.id}`).set('Authorization', `Bearer ${adminToken}`).send({ price: Number(p.price) + 100 });
      expect(upd.status).toBe(200);

      const del = await request(app).delete(`/api/admin/products/${p.id}`).set('Authorization', `Bearer ${adminToken}`);
      expect(del.status).toBe(200);
    }
  });

  it('products admin — listAll busca por término', async () => {
    const res = await request(app)
      .get('/api/admin/products')
      .query({ search: 'Ryzen', includeInactive: 'true' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('promociones admin — incluye imágenes de los productos', async () => {
    const res = await request(app).get('/api/admin/promotions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const promo = res.body.data[0];
      if (promo.products && promo.products.length > 0) {
        const first = promo.products[0].product;
        expect(first.images).toBeDefined();
        expect(first.images.length).toBeGreaterThanOrEqual(0);
        expect(first.seller.storeName).toBeDefined();
      }
    }
  });

  it('seller — crea producto con imágenes (array de urls)', async () => {
    const sellerToken = await getApprovedSellerToken();
    const cats = await request(app).get('/api/products/categories');
    const hardware = cats.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware.children[0].id;

    const res = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: `Producto Con Fotos ${Date.now()}`,
        categoryId: childId,
        description: 'Producto con imágenes de prueba',
        price: 1500,
        stock: 5,
        sku: `IMG-${Date.now()}`,
        images: [
          { url: 'https://picsum.photos/seed/t1/400/400', isPrimary: true },
          { url: 'https://picsum.photos/seed/t2/400/400' },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.images).toHaveLength(2);
    expect(res.body.data.images[0].isPrimary).toBe(true);
  });

  it('seller — edita producto y reemplaza imágenes', async () => {
    const sellerToken = await getApprovedSellerToken();
    const cats = await request(app).get('/api/products/categories');
    const hardware = cats.body.data.find((c: any) => c.name === 'Hardware');
    const childId = hardware.children[0].id;

    const created = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: `Producto Editar Imgs ${Date.now()}`,
        categoryId: childId,
        description: 'Producto para editar imágenes',
        price: 800,
        stock: 3,
        sku: `IMG-EDIT-${Date.now()}`,
        images: [{ url: 'https://picsum.photos/seed/e1/400/400', isPrimary: true }],
      });
    const productId = created.body.data.id;

    const updated = await request(app)
      .put(`/api/seller/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        price: 900,
        images: [{ url: 'https://picsum.photos/seed/e2/400/400', isPrimary: true }],
      });
    expect(updated.status).toBe(200);

    const detail = await request(app).get(`/api/products/${productId}`);
    expect(Number(detail.body.data.price)).toBe(900);
    expect(detail.body.data.images).toHaveLength(1);
    expect(detail.body.data.images[0].url).toContain('e2');
  });
});
