import request from 'supertest';
import { app, registerSeller, loginUser } from './helpers';
import { prisma } from '../src/config/database';

describe('Ubicación y redes sociales de la tienda — E2E', () => {
  let sellerToken: string;
  let sellerId: number;
  let sellerEmail: string;

  beforeAll(async () => {
    const seller = await registerSeller();
    sellerEmail = seller.body.data.email;
    const login = await loginUser(sellerEmail, 'password123');
    sellerToken = login.body.data.accessToken;
    sellerId = login.body.data.user.id;
    await prisma.user.update({ where: { id: sellerId }, data: { isApproved: true } });
  });

  it('guardar ubicación (lat/lng) y redes sociales', async () => {
    const res = await request(app)
      .put('/api/seller/profile')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        latitude: -16.4897,
        longitude: -68.1193,
        locationCity: 'La Paz',
        locationState: 'La Paz',
        instagramUrl: 'https://instagram.com/mitienda',
        facebookUrl: 'https://facebook.com/mitienda',
        whatsappPhone: '59170000000',
      });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.latitude)).toBeCloseTo(-16.4897, 3);
    expect(res.body.data.instagramUrl).toBe('https://instagram.com/mitienda');
    expect(res.body.data.whatsappPhone).toBe('59170000000');
  });

  it('el perfil público expone la ubicación y las redes', async () => {
    const res = await request(app).get(`/api/sellers/${sellerId}`);
    expect(res.status).toBe(200);
    expect(Number(res.body.data.latitude)).toBeCloseTo(-16.4897, 3);
    expect(res.body.data.instagramUrl).toBe('https://instagram.com/mitienda');
    expect(res.body.data.whatsappPhone).toBe('59170000000');
    expect(res.body.data.locationVerified).toBe(false);
  });

  it('un vendedor NO puede auto-verificar su ubicación (solo admin)', async () => {
    const res = await request(app)
      .put('/api/seller/profile')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ locationVerified: true });
    expect(res.status).toBe(200);
    // locationVerified NO está en el array allowed del vendedor → debe seguir false
    expect(res.body.data.locationVerified).not.toBe(true);
  });

  it('admin verifica la ubicación física de la tienda', async () => {
    const admin = await request(app).post('/api/auth/login').send({ email: 'admin@pctienda.com', password: 'admin123' });
    const res = await request(app)
      .put(`/api/admin/users/${sellerId}`)
      .set('Authorization', `Bearer ${admin.body.data.accessToken}`)
      .send({ locationVerified: true });
    expect(res.status).toBe(200);
    expect(res.body.data.locationVerified).toBe(true);
  });

  it('el perfil público refleja la ubicación verificada', async () => {
    const res = await request(app).get(`/api/sellers/${sellerId}`);
    expect(res.body.data.locationVerified).toBe(true);
  });

  it('las redes opcionales vacías no se exponen como null problemático', async () => {
    const res = await request(app)
      .put('/api/seller/profile')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ youtubeUrl: '', tiktokUrl: '' });
    expect(res.status).toBe(200);
    expect(res.body.data.youtubeUrl ?? '').toBe('');
  });
});
