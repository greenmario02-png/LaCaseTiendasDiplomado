/**
 * Chat · tiempo real: sala personal con la vista propia de cada participante, "escribiendo" solo
 * dentro de una sala autorizada, presencia por ack y estado "entregado" inmediato si el destinatario esta conectado.
 */
import http from 'http';
import type { AddressInfo } from 'net';

import request from 'supertest';
import { io as connect, Socket } from 'socket.io-client';

import { app, registerUser, getApprovedSellerToken } from './helpers';
import { initSocket, getIO } from '../src/config/socket';
import { __resetPresence } from '../src/services/chat/presence';

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

async function newUser() {
  const reg = await registerUser();
  const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
  return { token: login.body.data.accessToken as string, id: reg.body.data.id as number };
}

function once<T = any>(s: Socket, event: string, ms = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout ${event}`)), ms);
    s.once(event, (p: T) => {
      clearTimeout(t);
      resolve(p);
    });
  });
}
const nothing = (s: Socket, event: string, ms = 600) =>
  new Promise<boolean>((resolve) => {
    const h = () => resolve(false);
    s.once(event, h);
    setTimeout(() => {
      s.off(event, h);
      resolve(true);
    }, ms);
  });

describe('Chat mejorado · Socket.IO', () => {
  let server: http.Server;
  let url: string;
  const sockets: Socket[] = [];
  let sellerToken: string;
  let sellerId: number;
  let buyer: { token: string; id: number };
  let stranger: { token: string; id: number };
  let convId: number;

  const open = async (token: string) => {
    const s = connect(url, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(s);
    await once(s, 'connect');
    return s;
  };

  beforeAll(async () => {
    __resetPresence();
    server = http.createServer(app);
    initSocket(server);
    await new Promise<void>((r) => server.listen(0, r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    sellerToken = await getApprovedSellerToken();
    sellerId = (await request(app).get('/api/auth/me').set(auth(sellerToken))).body.data.id;
    buyer = await newUser();
    stranger = await newUser();
    convId = (await request(app).post('/api/chat').set(auth(buyer.token)).send({ sellerId })).body.data.id;
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await new Promise<void>((r) => getIO()?.close(() => r()) ?? r());
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('sin token no conecta', async () => {
    const s = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(s);
    const err = await once<Error>(s, 'connect_error');
    expect(err.message).toMatch(/Token/);
  });

  it('el mensaje llega por la sala personal; entregado al instante si el otro está conectado', async () => {
    const sSeller = await open(sellerToken);
    const sBuyer = await open(buyer.token);
    const got = once<{ conversationId: number; message: { content: string; deliveredAt: string | null; senderId: number } }>(sSeller, 'chat:message');
    const status = once<{ status: string; upToId: number }>(sBuyer, 'chat:status');
    const r = await request(app).post(`/api/chat/${convId}/messages`).set(auth(buyer.token)).send({ content: 'en vivo' });
    expect(r.status).toBe(201);
    const p = await got;
    expect(p.conversationId).toBe(convId);
    expect(p.message.content).toBe('en vivo');
    expect(r.body.data.deliveredAt).not.toBeNull();
    expect((await status).status).toBe('delivered');
  });

  it('un tercero no entra a la sala ni puede inyectar "escribiendo"', async () => {
    const sSeller = await open(sellerToken);
    const ack = await new Promise((resolve) => sSeller.emit('chat:join', { conversationId: convId }, resolve));
    expect(ack).toMatchObject({ visible: true });

    const sStranger = await open(stranger.token);
    const strangerAck = await Promise.race([
      new Promise((resolve) => sStranger.emit('chat:join', { conversationId: convId }, resolve)),
      new Promise((resolve) => setTimeout(() => resolve('sin respuesta'), 600)),
    ]);
    expect(strangerAck).toBe('sin respuesta');
    sStranger.emit('chat:typing', { conversationId: convId, isTyping: true });
    expect(await nothing(sSeller, 'chat:typing')).toBe(true);
  });

  it('el participante en la sala sí avisa "escribiendo" (con límite de frecuencia)', async () => {
    const sSeller = await open(sellerToken);
    const sBuyer = await open(buyer.token);
    await new Promise((r) => sSeller.emit('chat:join', { conversationId: convId }, r));
    await new Promise((r) => sBuyer.emit('chat:join', { conversationId: convId }, r));
    const typing = once<{ userId: number; isTyping: boolean }>(sSeller, 'chat:typing');
    sBuyer.emit('chat:typing', { conversationId: convId, isTyping: true });
    expect(await typing).toMatchObject({ userId: buyer.id, isTyping: true });
    // Un segundo "escribiendo" inmediato se descarta
    sBuyer.emit('chat:typing', { conversationId: convId, isTyping: true });
    expect(await nothing(sSeller, 'chat:typing', 400)).toBe(true);
  });
});
