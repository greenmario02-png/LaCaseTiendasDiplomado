import request from 'supertest';

import { app, registerUser, uniqueEmail, getAdminToken } from './helpers';
import { prisma } from '../src/config/database';
import { purgeExpiredRawMessages } from '../src/services/bot-account.service';

/**
 * Chat para Bots: cuentas de bot declaradas
 * (Lectura B), operadas solo por el equipo de LaCase en esta fase , conversan con
 * usuarios reales. `generateBotReply` es un placeholder sin LLM conectado todavía — estos
 * tests verifican el flujo y las reglas de negocio, no el contenido de la respuesta.
 */

async function createAgedUser(prefix: string): Promise<{ token: string; userId: number }> {
  const reg = await registerUser({ email: uniqueEmail(prefix) });
  const email = reg.body.data.email;
  const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  expect(login.status).toBe(200);
  const token = login.body.data.accessToken as string;
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { token, userId: user.id };
}

describe('Cuentas de bot (creación, solo admin)', () => {
  it('un usuario normal NO puede crear una cuenta de bot', async () => {
    const user = await createAgedUser('bot-create-denied');
    const res = await request(app)
      .post('/api/admin/bots')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ displayName: 'Bot Intruso', declaredStance: 'No debería poder crear esto.' });
    expect(res.status).toBe(403);
  });

  it('un admin puede crear una cuenta de bot declarada', async () => {
    const adminToken = await getAdminToken();
    const res = await request(app)
      .post('/api/admin/bots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ displayName: 'Bot Economía Liberal', declaredStance: 'Defiende el libre mercado y la baja regulación estatal.' });
    expect(res.status).toBe(201);
    expect(res.body.data.displayName).toBe('Bot Economía Liberal');
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('el listado público de bots no expone al operador ni datos internos', async () => {
    const adminToken = await getAdminToken();
    await request(app)
      .post('/api/admin/bots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ displayName: 'Bot Listado Público', declaredStance: 'Postura de prueba para el listado.' });

    const user = await createAgedUser('bot-list');
    const res = await request(app).get('/api/bots').set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    const bot = res.body.data.find((b: { displayName: string }) => b.displayName === 'Bot Listado Público');
    expect(bot).toBeDefined();
    expect(bot.operatedByUserId).toBeUndefined();
  });
});

describe('Conversación bot↔usuario', () => {
  async function createBot(stance = 'Postura declarada de prueba, con al menos diez caracteres.') {
    const adminToken = await getAdminToken();
    const res = await request(app)
      .post('/api/admin/bots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ displayName: `Bot Conversación ${Date.now()}`, declaredStance: stance });
    expect(res.status).toBe(201);
    return res.body.data.id as number;
  }

  it('iniciar conversación dos veces devuelve la misma conversación abierta (no duplica)', async () => {
    const botId = await createBot();
    const user = await createAgedUser('bot-conv-idempotent');

    const first = await request(app)
      .post(`/api/bots/${botId}/conversations`)
      .set('Authorization', `Bearer ${user.token}`);
    const second = await request(app)
      .post(`/api/bots/${botId}/conversations`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.id).toBe(second.body.data.id);
  });

  it('enviar un mensaje crea el mensaje del usuario y una respuesta del bot', async () => {
    const botId = await createBot();
    const user = await createAgedUser('bot-conv-message');

    const conv = await request(app)
      .post(`/api/bots/${botId}/conversations`)
      .set('Authorization', `Bearer ${user.token}`);
    const conversationId = conv.body.data.id;

    const msgRes = await request(app)
      .post(`/api/bots/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ body: 'Hola, ¿qué opinás de la economía boliviana?' });

    expect(msgRes.status).toBe(201);
    expect(msgRes.body.data.userMessage.sender).toBe('USER');
    expect(msgRes.body.data.botMessage.sender).toBe('BOT');
    expect(msgRes.body.data.botMessage.body.length).toBeGreaterThan(0);
  });

  it('otro usuario no puede mandar mensajes a una conversación ajena', async () => {
    const botId = await createBot();
    const owner = await createAgedUser('bot-conv-owner');
    const intruder = await createAgedUser('bot-conv-intruder');

    const conv = await request(app)
      .post(`/api/bots/${botId}/conversations`)
      .set('Authorization', `Bearer ${owner.token}`);

    const res = await request(app)
      .post(`/api/bots/conversations/${conv.body.data.id}/messages`)
      .set('Authorization', `Bearer ${intruder.token}`)
      .send({ body: 'Intento de mensaje ajeno' });

    expect(res.status).toBe(403);
  });

  it('cerrar la conversación genera un resumen y bloquea mensajes nuevos', async () => {
    const botId = await createBot();
    const user = await createAgedUser('bot-conv-end');

    const conv = await request(app)
      .post(`/api/bots/${botId}/conversations`)
      .set('Authorization', `Bearer ${user.token}`);
    const conversationId = conv.body.data.id;

    await request(app)
      .post(`/api/bots/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ body: 'Un mensaje antes de cerrar.' });

    const endRes = await request(app)
      .post(`/api/bots/conversations/${conversationId}/end`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(endRes.status).toBe(200);
    expect(endRes.body.data.summary).toEqual(expect.stringContaining('USER:'));

    const blockedRes = await request(app)
      .post(`/api/bots/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ body: 'Esto no debería aceptarse.' });
    expect(blockedRes.status).toBe(400);
  });
});

describe('Sanción de cuentas de bot (admin)', () => {
  it('banear un bot lo deja inactivo y agrega su userId a la lista negra', async () => {
    const adminToken = await getAdminToken();
    const createRes = await request(app)
      .post('/api/admin/bots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ displayName: `Bot Sancionado ${Date.now()}`, declaredStance: 'Postura de prueba para sanción.' });
    const botId = createRes.body.data.id;

    const sanctionRes = await request(app)
      .post(`/api/admin/bots/${botId}/sanction`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ severity: 'BANNED', reason: 'Comportamiento abusivo detectado en pruebas.' });
    expect(sanctionRes.status).toBe(200);
    expect(sanctionRes.body.data.status).toBe('BANNED');

    const bot = await prisma.botAccount.findUniqueOrThrow({ where: { id: botId } });
    const blacklistEntry = await prisma.blacklistEntry.findUnique({
      where: { type_value: { type: 'USER', value: String(bot.userId) } },
    });
    expect(blacklistEntry).not.toBeNull();

    const strike = await prisma.userStrike.findFirst({ where: { userId: bot.userId, relatedType: 'BOT_ACCOUNT' } });
    expect(strike?.severity).toBe('BAN');
  });

  it('un bot suspendido/baneado no puede iniciar conversaciones nuevas', async () => {
    const adminToken = await getAdminToken();
    const createRes = await request(app)
      .post('/api/admin/bots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ displayName: `Bot Suspendido ${Date.now()}`, declaredStance: 'Postura de prueba para suspensión.' });
    const botId = createRes.body.data.id;

    await request(app)
      .post(`/api/admin/bots/${botId}/sanction`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ severity: 'SUSPENDED', reason: 'Suspensión de prueba.' });

    const user = await createAgedUser('bot-conv-suspended');
    const res = await request(app)
      .post(`/api/bots/${botId}/conversations`)
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(403);
  });
});

describe('Purga de mensajes crudos vencidos', () => {
  it('borra los BotConversationMessage de conversaciones con rawExpiresAt vencido, deja el resumen', async () => {
    const adminToken = await getAdminToken();
    const createRes = await request(app)
      .post('/api/admin/bots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ displayName: `Bot Purga ${Date.now()}`, declaredStance: 'Postura de prueba para purga.' });
    const botId = createRes.body.data.id;

    const user = await createAgedUser('bot-purge');
    const conv = await request(app)
      .post(`/api/bots/${botId}/conversations`)
      .set('Authorization', `Bearer ${user.token}`);
    const conversationId = conv.body.data.id;

    await request(app)
      .post(`/api/bots/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ body: 'Mensaje que debería purgarse.' });

    // Forzar el vencimiento retrocediendo rawExpiresAt (evita esperar 30 días reales).
    await prisma.botConversation.update({
      where: { id: conversationId },
      data: { rawExpiresAt: new Date(Date.now() - 1000) },
    });

    const deletedCount = await purgeExpiredRawMessages();
    expect(deletedCount).toBeGreaterThanOrEqual(2); // USER + BOT del mensaje de arriba

    const remaining = await prisma.botConversationMessage.findMany({ where: { conversationId } });
    expect(remaining).toHaveLength(0);
  });
});
