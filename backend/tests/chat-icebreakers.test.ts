import request from 'supertest';
import { app, registerUser, registerSeller, loginUser } from './helpers';
import { getIcebreakers, getFollowUps, getNoSaleReplies } from '../src/data/bolivianismos';

/**
 * Bug corregido: las "respuestas sugeridas"/"rompehielos" del chat (doc 62) siempre mostraban
 * frases de comprador, sin importar si quien ve el chat es comprador o vendedor EN esa conversación.
 * Estas pruebas cubren: getChatSuggestions elige el set correcto según isBuyer (ya se calculaba bien,
 * solo no se usaba para elegir el set) y getChatIcebreakers con/sin conversationId.
 */
describe('Chat: icebreakers y sugerencias por rol (comprador vs vendedor)', () => {
  let buyerToken: string;
  let sellerToken: string;
  let sellerId: number;
  let conversationId: number;

  beforeAll(async () => {
    const { prisma } = await import('../src/config/database');

    // Comprador en La Paz
    const reg = await registerUser({ locationCity: 'La Paz' } as any);
    const buyerEmail = reg.body.data.email;
    await prisma.user.update({ where: { email: buyerEmail }, data: { locationCity: 'La Paz', locationState: 'La Paz' } });
    const buyerLogin = await loginUser(buyerEmail, 'password123');
    buyerToken = buyerLogin.body.data.accessToken;
    const buyerMe = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${buyerToken}`);
    const buyerId = buyerMe.body.data.id;

    // Vendedor en Santa Cruz, aprobado
    const sreg = await registerSeller({ locationCity: 'Santa Cruz', locationState: 'Santa Cruz' });
    sellerId = sreg.body.data.id;
    await prisma.user.update({ where: { id: sellerId }, data: { isApproved: true, isActive: true, locationCity: 'Santa Cruz', locationState: 'Santa Cruz' } });
    const sellerLogin = await loginUser(sreg.body.data.email, 'password123');
    sellerToken = sellerLogin.body.data.accessToken;

    // Conversación comprador -> vendedor
    const conv = await request(app).post('/api/chat').set('Authorization', `Bearer ${buyerToken}`).send({ sellerId });
    conversationId = conv.body.data.id;
    void buyerId;
  });

  it('GET /api/chat/:id/suggestions — el comprador recibe el set de COMPRADOR (región del vendedor)', async () => {
    const res = await request(app).get(`/api/chat/${conversationId}/suggestions`).set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.region).toBe('Santa Cruz');
    expect(res.body.data.followUps).toEqual(getFollowUps('Santa Cruz', true));
    expect(res.body.data.noSaleReplies).toEqual(getNoSaleReplies('Santa Cruz', true));
  });

  it('GET /api/chat/:id/suggestions — el vendedor recibe el set de VENDEDOR (región del comprador), distinto del de comprador', async () => {
    const res = await request(app).get(`/api/chat/${conversationId}/suggestions`).set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.region).toBe('La Paz');
    expect(res.body.data.followUps).toEqual(getFollowUps('La Paz', false));
    expect(res.body.data.noSaleReplies).toEqual(getNoSaleReplies('La Paz', false));
    // No debe ser el mismo set que vería un comprador en esa región.
    expect(res.body.data.followUps).not.toEqual(getFollowUps('La Paz', true));
  });

  it('GET /api/chat/icebreakers — sin conversationId mantiene el comportamiento anterior (perspectiva de comprador, ciudad propia)', async () => {
    const res = await request(app).get('/api/chat/icebreakers').set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.region).toBe('La Paz');
    expect(res.body.data.icebreakers).toEqual(getIcebreakers('La Paz', true));
  });

  it('GET /api/chat/icebreakers?conversationId= — el vendedor recibe el set de VENDEDOR para esa conversación', async () => {
    const res = await request(app)
      .get('/api/chat/icebreakers')
      .query({ conversationId })
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.region).toBe('La Paz'); // región del OTRO participante (el comprador)
    expect(res.body.data.icebreakers).toEqual(getIcebreakers('La Paz', false));
    expect(res.body.data.icebreakers).not.toEqual(getIcebreakers('La Paz', true));
  });

  it('GET /api/chat/icebreakers?conversationId= — el comprador recibe el set de COMPRADOR para esa conversación', async () => {
    const res = await request(app)
      .get('/api/chat/icebreakers')
      .query({ conversationId })
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.region).toBe('Santa Cruz'); // región del OTRO participante (el vendedor)
    expect(res.body.data.icebreakers).toEqual(getIcebreakers('Santa Cruz', true));
  });

  it('GET /api/chat/icebreakers?conversationId= — 403 si no participa en esa conversación', async () => {
    const other = await registerUser();
    const otherLogin = await loginUser(other.body.data.email, 'password123');
    const res = await request(app)
      .get('/api/chat/icebreakers')
      .query({ conversationId })
      .set('Authorization', `Bearer ${otherLogin.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/chat/icebreakers?conversationId= — 404 si la conversación no existe', async () => {
    const res = await request(app)
      .get('/api/chat/icebreakers')
      .query({ conversationId: 999999999 })
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/chat/icebreakers — requiere auth', async () => {
    const res = await request(app).get('/api/chat/icebreakers');
    expect(res.status).toBe(401);
  });
});
