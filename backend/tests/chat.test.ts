import request from 'supertest';
import { app, registerUser, getApprovedSellerToken } from './helpers';

describe('Chat API (integración)', () => {
  let buyerToken: string;
  let sellerToken: string;
  let sellerId: number;

  beforeAll(async () => {
    sellerToken = await getApprovedSellerToken();
    // obtener id del seller
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${sellerToken}`);
    sellerId = me.body.data.id;

    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    buyerToken = login.body.data.accessToken;
  });

  it('POST /api/chat — crea conversación comprador→vendedor', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ sellerId });
    expect(res.status).toBe(200);
    expect(res.body.data.buyerId).toBeDefined();
    expect(res.body.data.sellerId).toBe(sellerId);
  });

  it('POST /api/chat — no permite chatear con uno mismo', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ sellerId });
    expect(res.status).toBe(400);
  });

  it('POST /api/chat — requiere auth', async () => {
    const res = await request(app).post('/api/chat').send({ sellerId });
    expect(res.status).toBe(401);
  });

  it('POST /api/chat — vendedor inexistente → 404', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ sellerId: 999999 });
    expect(res.status).toBe(404);
  });

  it('POST /api/chat/:id/messages — envía y recibe mensaje', async () => {
    const conv = await request(app).post('/api/chat').set('Authorization', `Bearer ${buyerToken}`).send({ sellerId });
    const convId = conv.body.data.id;

    const msg = await request(app)
      .post(`/api/chat/${convId}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: 'Hola, ¿está disponible?' });
    expect(msg.status).toBe(201);
    expect(msg.body.data.content).toBe('Hola, ¿está disponible?');
  });

  it('POST /api/chat/:id/messages — mensaje vacío → 400', async () => {
    const conv = await request(app).post('/api/chat').set('Authorization', `Bearer ${buyerToken}`).send({ sellerId });
    const res = await request(app)
      .post(`/api/chat/${conv.body.data.id}/messages`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
  });

  it('GET /api/chat — lista conversaciones del usuario', async () => {
    const res = await request(app).get('/api/chat').set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/chat/:id — devuelve mensajes y marca leídos', async () => {
    const conv = await request(app).post('/api/chat').set('Authorization', `Bearer ${buyerToken}`).send({ sellerId });
    const convId = conv.body.data.id;

    // seller envía mensaje
    await request(app)
      .post(`/api/chat/${convId}/messages`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ content: 'Sí, disponible' });

    // unread del buyer antes de leer
    const unreadBefore = await request(app).get('/api/chat/unread').set('Authorization', `Bearer ${buyerToken}`);
    expect(Number(unreadBefore.body.data.count)).toBeGreaterThan(0);

    // buyer lee la conversación
    const res = await request(app).get(`/api/chat/${convId}`).set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/chat/:id — no permite a no participantes', async () => {
    const conv = await request(app).post('/api/chat').set('Authorization', `Bearer ${buyerToken}`).send({ sellerId });
    // un tercer usuario
    const reg = await registerUser();
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const res = await request(app).get(`/api/chat/${conv.body.data.id}`).set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/chat/unread — requiere auth', async () => {
    const res = await request(app).get('/api/chat/unread');
    expect(res.status).toBe(401);
  });
});
