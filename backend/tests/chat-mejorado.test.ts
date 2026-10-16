/**
 * Chat · integracion: adjuntos privados con URL firmada, tipos de mensaje (QR de la tienda,
 * comprobante del pedido, SYSTEM), conversacion del pedido, idempotencia por clientId, paginacion, estados entregado/leido,
 * eliminar para mi / para todos, silenciar, bloquear, reportar, moderacion (ADMIN o asignacion RBAC de moderacion) y
 * privacidad. Autorizacion por participante en todo.
 */
import request from 'supertest';

import { app, registerUser, getApprovedSellerToken, getAdminToken } from './helpers';
import { prisma } from '../src/config/database';
import { jpeg } from './chat-helpers';

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
let seq = 0;
const cid = () => `test-${Date.now()}-${++seq}-abcdef`;

/** Pedido minimo creado directo en la BD (el flujo de compra no es objeto de estas pruebas). */
async function createOrderForTest(buyer: { id: number }, seller: { id: number }) {
  let product = await prisma.product.findFirst({ where: { sellerId: seller.id } });
  if (!product) {
    const cat = await prisma.category.findFirst();
    product = await prisma.product.create({ data: { name: `Chat ${Date.now()}`, slug: `chat-${Date.now()}`, sku: `CH-${Date.now()}`, description: 'x', price: 50, stock: 5, sellerId: seller.id, categoryId: cat!.id, isApproved: true, isActive: true, condition: 'NEW' } });
  }
  const order = await prisma.order.create({
    data: { buyerId: buyer.id, sellerId: seller.id, subtotal: 100, total: 100, items: { create: [{ productId: product.id, quantity: 2, unitPrice: 50 }] } },
  });
  return { orderId: order.id };
}

async function newBuyer() {
  const reg = await registerUser();
  const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
  return { token: login.body.data.accessToken as string, id: login.body.data.user?.id ?? reg.body.data.id };
}

describe('Chat: adjuntos, tipos de mensaje y conversación del pedido', () => {
  let sellerToken: string;
  let sellerId: number;
  let buyer: { token: string; id: number };
  let stranger: { token: string; id: number };
  let convId: number;

  beforeAll(async () => {
    sellerToken = await getApprovedSellerToken();
    const me = await request(app).get('/api/auth/me').set(auth(sellerToken));
    sellerId = me.body.data.id;
    buyer = await newBuyer();
    stranger = await newBuyer();
    const conv = await request(app).post('/api/chat').set(auth(buyer.token)).send({ sellerId });
    convId = conv.body.data.id;
  });

  describe('texto: idempotencia, cita y paginación', () => {
    it('un reintento con el mismo clientId devuelve el mismo mensaje (200) sin duplicar', async () => {
      const clientId = cid();
      const a = await request(app).post(`/api/chat/${convId}/messages`).set(auth(buyer.token)).send({ content: 'Hola', clientId });
      const b = await request(app).post(`/api/chat/${convId}/messages`).set(auth(buyer.token)).send({ content: 'Hola', clientId });
      expect(a.status).toBe(201);
      expect(b.status).toBe(200);
      expect(b.body.data.id).toBe(a.body.data.id);
      expect(a.body.data.kind).toBe('TEXT');
      expect(a.body.data.clientId).toBe(clientId);
      expect(await prisma.message.count({ where: { clientId } })).toBe(1);
    });

    it('clientId con caracteres raros → 400', async () => {
      const r = await request(app).post(`/api/chat/${convId}/messages`).set(auth(buyer.token)).send({ content: 'x', clientId: '<script>alert(1)</script>' });
      expect(r.status).toBe(400);
    });

    it('cita un mensaje de la conversación; citar uno de otra conversación → 400', async () => {
      const base = await request(app).post(`/api/chat/${convId}/messages`).set(auth(sellerToken)).send({ content: 'Sí, hay stock' });
      const reply = await request(app).post(`/api/chat/${convId}/messages`).set(auth(buyer.token)).send({ content: '¿Color negro?', replyToId: base.body.data.id });
      expect(reply.status).toBe(201);
      expect(reply.body.data.replyTo).toMatchObject({ id: base.body.data.id, preview: 'Sí, hay stock' });

      const other = await newBuyer();
      const conv2 = await request(app).post('/api/chat').set(auth(other.token)).send({ sellerId });
      const foreign = await request(app).post(`/api/chat/${conv2.body.data.id}/messages`).set(auth(other.token)).send({ content: 'ajeno' });
      const bad = await request(app).post(`/api/chat/${convId}/messages`).set(auth(buyer.token)).send({ content: 'x', replyToId: foreign.body.data.id });
      expect(bad.status).toBe(400);
    });

    it('pagina hacia atrás con before y hasMore', async () => {
      const b = await newBuyer();
      const c = await request(app).post('/api/chat').set(auth(b.token)).send({ sellerId });
      const id = c.body.data.id;
      await prisma.message.createMany({ data: Array.from({ length: 35 }, (_, i) => ({ conversationId: id, senderId: b.id, content: `m${i}` })) });
      const p1 = await request(app).get(`/api/chat/${id}?limit=30`).set(auth(b.token));
      expect(p1.status).toBe(200);
      expect(p1.body.data.messages).toHaveLength(30);
      expect(p1.body.data.hasMore).toBe(true);
      expect(p1.body.data.messages[29].content).toBe('m34');
      const p2 = await request(app).get(`/api/chat/${id}?limit=30&before=${p1.body.data.messages[0].id}`).set(auth(b.token));
      expect(p2.body.data.messages).toHaveLength(5);
      expect(p2.body.data.hasMore).toBe(false);
      expect(p2.body.data.messages[0].content).toBe('m0');
    });
  });

  describe('estados: entregado y leído, no leídos por conversación', () => {
    it('la lista del destinatario marca entregado; abrir la conversación marca leído', async () => {
      const b = await newBuyer();
      const c = await request(app).post('/api/chat').set(auth(b.token)).send({ sellerId });
      const sent = await request(app).post(`/api/chat/${c.body.data.id}/messages`).set(auth(b.token)).send({ content: 'uno' });
      expect(sent.body.data.deliveredAt).toBeNull();

      const list = await request(app).get('/api/chat').set(auth(sellerToken));
      const row = list.body.data.find((x: { id: number }) => x.id === c.body.data.id);
      expect(row.unreadCount).toBe(1);
      expect(row.lastMessage).toMatchObject({ kind: 'TEXT', content: 'uno' });
      const afterList = await prisma.message.findUnique({ where: { id: sent.body.data.id } });
      expect(afterList?.deliveredAt).not.toBeNull();
      expect(afterList?.readAt).toBeNull();

      await request(app).get(`/api/chat/${c.body.data.id}`).set(auth(sellerToken));
      const afterOpen = await prisma.message.findUnique({ where: { id: sent.body.data.id } });
      expect(afterOpen?.readAt).not.toBeNull();
    });
  });

  describe('adjuntos privados', () => {
    let imageMsg: { id: number; attachment: { id: number; url: string } };

    it('sube una foto: kind IMAGE, sin EXIF, URL firmada que solo sirve a su usuario', async () => {
      const r = await request(app)
        .post(`/api/chat/${convId}/attachments`)
        .set(auth(buyer.token))
        .field('caption', '<img src=x onerror=alert(1)> foto')
        .field('clientId', cid())
        .attach('file', jpeg(800, 600), { filename: 'foto.jpg', contentType: 'image/jpeg' });
      expect(r.status).toBe(201);
      imageMsg = r.body.data;
      expect(r.body.data.kind).toBe('IMAGE');
      expect(r.body.data.content).toBe('<img src=x onerror=alert(1)> foto'); // se guarda como texto; los clientes lo pintan escapado
      expect(r.body.data.attachment).toMatchObject({ mime: 'image/jpeg', width: 800, height: 600, hidden: false });
      expect(r.body.data.attachment.url).toMatch(/^\/api\/chat\/files\/\d+\?u=\d+&e=\d+&s=/);

      const file = await request(app).get(r.body.data.attachment.url);
      expect(file.status).toBe(200);
      expect(file.headers['content-type']).toBe('image/jpeg');
      expect(file.headers['x-content-type-options']).toBe('nosniff');
      expect(file.headers['content-security-policy']).toContain('sandbox');
      expect(file.headers['cache-control']).toContain('private');
      const body = Buffer.from(file.body);
      expect(body.includes(Buffer.from('Exif'))).toBe(false);
      expect(body.includes(Buffer.from('GPSLatitude'))).toBe(false);
    });

    it('la URL no se puede reutilizar para otro usuario, otro adjunto ni con la firma alterada', async () => {
      const url = new URL(`http://x${imageMsg.attachment.url}`);
      const otherUser = new URL(url); otherUser.searchParams.set('u', String(stranger.id));
      const tampered = new URL(url); tampered.searchParams.set('s', `${url.searchParams.get('s')!.slice(0, -2)}AA`);
      const otherAtt = `/api/chat/files/${imageMsg.attachment.id + 1}${url.search}`;
      for (const u of [otherUser.pathname + otherUser.search, tampered.pathname + tampered.search, otherAtt]) {
        expect((await request(app).get(u)).status).toBe(404);
      }
    });

    it('el archivo no está en /uploads público', async () => {
      const row = await prisma.chatAttachment.findUnique({ where: { id: imageMsg.attachment.id } });
      expect(row?.storageKey).toMatch(/^[0-9a-f]{32}\.jpg$/);
      expect((await request(app).get(`/uploads/${row!.storageKey}`)).status).toBe(404);
      expect((await request(app).get(`/uploads/chat/${row!.storageKey}`)).status).toBe(404);
    });

    it('el vendedor recibe su propia URL firmada al leer la conversación', async () => {
      const r = await request(app).get(`/api/chat/${convId}`).set(auth(sellerToken));
      const m = r.body.data.messages.find((x: { id: number }) => x.id === imageMsg.id);
      expect(m.attachment.url).toContain(`u=${sellerId}`);
      expect((await request(app).get(m.attachment.url)).status).toBe(200);
    });

    it('rechaza SVG/HTML con extensión de imagen, sin sesión (401) y a quien no participa (403)', async () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const r1 = await request(app).post(`/api/chat/${convId}/attachments`).set(auth(buyer.token)).attach('file', svg, { filename: 'a.png', contentType: 'image/png' });
      expect(r1.status).toBe(400);
      const html = Buffer.from('<!doctype html><html><script>alert(1)</script></html>');
      const r2 = await request(app).post(`/api/chat/${convId}/attachments`).set(auth(buyer.token)).attach('file', html, { filename: 'a.jpg', contentType: 'image/jpeg' });
      expect(r2.status).toBe(400);
      const r3 = await request(app).post(`/api/chat/${convId}/attachments`).attach('file', jpeg(), { filename: 'a.jpg', contentType: 'image/jpeg' });
      expect(r3.status).toBe(401);
      const r4 = await request(app).post(`/api/chat/${convId}/attachments`).set(auth(stranger.token)).attach('file', jpeg(), { filename: 'a.jpg', contentType: 'image/jpeg' });
      expect(r4.status).toBe(403);
    });

    it('PDF: kind FILE, se descarga como adjunto; un PDF con JavaScript se rechaza', async () => {
      const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF');
      const ok = await request(app).post(`/api/chat/${convId}/attachments`).set(auth(buyer.token)).attach('file', pdf, { filename: '../../Factura<b>.pdf', contentType: 'application/pdf' });
      expect(ok.status).toBe(201);
      expect(ok.body.data.kind).toBe('FILE');
      expect(ok.body.data.attachment.name).toBe('Facturab.pdf');
      const f = await request(app).get(ok.body.data.attachment.url);
      expect(f.headers['content-type']).toBe('application/pdf');
      expect(f.headers['content-disposition']).toMatch(/^attachment;/);
      const evil = Buffer.from('%PDF-1.4\n<< /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>');
      expect((await request(app).post(`/api/chat/${convId}/attachments`).set(auth(buyer.token)).attach('file', evil, { filename: 'x.pdf', contentType: 'application/pdf' })).status).toBe(400);
    });

    it('el cliente no puede elegir PAYMENT_QR ni SYSTEM como tipo de adjunto', async () => {
      for (const kind of ['PAYMENT_QR', 'SYSTEM']) {
        const r = await request(app).post(`/api/chat/${convId}/attachments`).set(auth(sellerToken)).field('kind', kind).attach('file', jpeg(), { filename: 'qr.jpg', contentType: 'image/jpeg' });
        expect(r.status).toBe(400);
      }
    });
  });

  describe('QR de cobro de la tienda', () => {
    it('solo la tienda; sin QR configurado 409; con QR se envía el de sus datos de pago', async () => {
      expect((await request(app).post(`/api/chat/${convId}/payment-qr`).set(auth(buyer.token)).send({})).status).toBe(403);
      await prisma.user.update({ where: { id: sellerId }, data: { paymentQrUrl: null } });
      const none = await request(app).post(`/api/chat/${convId}/payment-qr`).set(auth(sellerToken)).send({});
      expect(none.status).toBe(409);
      expect(none.body.error.code).toBe('QR_REQUIRED');
      await prisma.user.update({ where: { id: sellerId }, data: { paymentQrUrl: '/uploads/qr-tienda-test.png' } });
      const r = await request(app).post(`/api/chat/${convId}/payment-qr`).set(auth(sellerToken)).send({ clientId: cid(), qrUrl: 'https://evil.example/qr.png' });
      expect(r.status).toBe(201);
      expect(r.body.data.kind).toBe('PAYMENT_QR');
      expect(r.body.data.meta.qrUrl).toBe('/uploads/qr-tienda-test.png');
      expect(r.body.data.attachment).toBeNull();
    });

    it('un QR configurado con javascript: no se envía', async () => {
      await prisma.user.update({ where: { id: sellerId }, data: { paymentQrUrl: 'javascript:alert(1)' } });
      expect((await request(app).post(`/api/chat/${convId}/payment-qr`).set(auth(sellerToken)).send({})).status).toBe(409);
      await prisma.user.update({ where: { id: sellerId }, data: { paymentQrUrl: '/uploads/qr-tienda-test.png' } });
    });
  });

  describe('conversación del pedido y comprobante', () => {
    let orderId: number;
    let orderConvId: number;

    beforeAll(async () => {
      const o = await createOrderForTest({ id: buyer.id }, { id: sellerId });
      orderId = o.orderId;
    });

    it('el comprador abre la conversación del pedido (con evento SYSTEM y resumen del pedido)', async () => {
      const r = await request(app).post(`/api/chat/order/${orderId}/open`).set(auth(buyer.token));
      expect(r.status).toBe(200);
      orderConvId = r.body.data.id;
      expect(r.body.data.orderId).toBe(orderId);
      expect(r.body.data.order).toMatchObject({ id: orderId });
      expect(r.body.data.order.items.length).toBeGreaterThan(0);
      const page = await request(app).get(`/api/chat/${orderConvId}`).set(auth(buyer.token));
      expect(page.body.data.messages[0]).toMatchObject({ kind: 'SYSTEM', meta: { event: 'ORDER_LINKED', orderId } });
      expect(page.body.data.order.id).toBe(orderId);
    });

    it('la tienda obtiene la misma conversación; abrirla de nuevo no duplica', async () => {
      const r = await request(app).post(`/api/chat/order/${orderId}/open`).set(auth(sellerToken));
      expect(r.body.data.id).toBe(orderConvId);
      expect(await prisma.conversation.count({ where: { orderId } })).toBe(1);
    });

    it('un tercero o un pedido inexistente → 404 (no confirma existencia)', async () => {
      expect((await request(app).post(`/api/chat/order/${orderId}/open`).set(auth(stranger.token))).status).toBe(404);
      expect((await request(app).post('/api/chat/order/99999999/open').set(auth(buyer.token))).status).toBe(404);
      expect((await request(app).post('/api/chat/order/abc/open').set(auth(buyer.token))).status).toBe(400);
    });

    it('comprobante: solo el comprador y vinculado al pedido', async () => {
      const seller = await request(app).post(`/api/chat/${orderConvId}/attachments`).set(auth(sellerToken)).field('kind', 'PAYMENT_PROOF').attach('file', jpeg(), { filename: 'c.jpg', contentType: 'image/jpeg' });
      expect(seller.status).toBe(403);
      const noOrder = await request(app).post(`/api/chat/${convId}/attachments`).set(auth(buyer.token)).field('kind', 'PAYMENT_PROOF').attach('file', jpeg(), { filename: 'c.jpg', contentType: 'image/jpeg' });
      expect(noOrder.status).toBe(400);
      const ok = await request(app).post(`/api/chat/${orderConvId}/attachments`).set(auth(buyer.token)).field('kind', 'PAYMENT_PROOF').field('clientId', cid()).attach('file', jpeg(), { filename: 'c.jpg', contentType: 'image/jpeg' });
      expect(ok.status).toBe(201);
      expect(ok.body.data).toMatchObject({ kind: 'PAYMENT_PROOF', orderId });
      // El comprobante no se puede borrar para todos (es evidencia del pago)
      const del = await request(app).delete(`/api/chat/${orderConvId}/messages/${ok.body.data.id}?scope=all`).set(auth(buyer.token));
      expect(del.status).toBe(400);
    });

    it('desde otra conversación se puede indicar un pedido propio con esa tienda, nunca uno ajeno', async () => {
      const other = await newBuyer();
      const o2 = await createOrderForTest({ id: other.id }, { id: sellerId });
      const r = await request(app).post(`/api/chat/${convId}/attachments`).set(auth(buyer.token)).field('kind', 'PAYMENT_PROOF').field('orderId', String(o2.orderId)).attach('file', jpeg(), { filename: 'c.jpg', contentType: 'image/jpeg' });
      expect(r.status).toBe(404);
    });
  });

  describe('eliminar', () => {
    it('para mí: desaparece solo para quien lo elimina', async () => {
      const m = await request(app).post(`/api/chat/${convId}/messages`).set(auth(sellerToken)).send({ content: 'borrame para ti' });
      const d = await request(app).delete(`/api/chat/${convId}/messages/${m.body.data.id}?scope=me`).set(auth(buyer.token));
      expect(d.status).toBe(200);
      const mine = await request(app).get(`/api/chat/${convId}?limit=100`).set(auth(buyer.token));
      expect(mine.body.data.messages.some((x: { id: number }) => x.id === m.body.data.id)).toBe(false);
      const theirs = await request(app).get(`/api/chat/${convId}?limit=100`).set(auth(sellerToken));
      expect(theirs.body.data.messages.some((x: { id: number }) => x.id === m.body.data.id)).toBe(true);
    });

    it('para todos: solo el remitente, deja la marca y borra el archivo', async () => {
      const up = await request(app).post(`/api/chat/${convId}/attachments`).set(auth(buyer.token)).attach('file', jpeg(), { filename: 'a.jpg', contentType: 'image/jpeg' });
      const url = up.body.data.attachment.url;
      expect((await request(app).delete(`/api/chat/${convId}/messages/${up.body.data.id}?scope=all`).set(auth(sellerToken))).status).toBe(403);
      const d = await request(app).delete(`/api/chat/${convId}/messages/${up.body.data.id}?scope=all`).set(auth(buyer.token));
      expect(d.status).toBe(200);
      const page = await request(app).get(`/api/chat/${convId}?limit=100`).set(auth(sellerToken));
      const m = page.body.data.messages.find((x: { id: number }) => x.id === up.body.data.id);
      expect(m).toMatchObject({ deleted: true, content: '', attachment: null });
      expect((await request(app).get(url)).status).toBe(404);
      expect(await prisma.chatAttachment.count({ where: { messageId: up.body.data.id } })).toBe(0);
    });

    it('fuera de la ventana de tiempo → 409; un mensaje de otra conversación → 404', async () => {
      const m = await request(app).post(`/api/chat/${convId}/messages`).set(auth(buyer.token)).send({ content: 'viejo' });
      await prisma.message.update({ where: { id: m.body.data.id }, data: { createdAt: new Date(Date.now() - 3 * 3600_000) } });
      const d = await request(app).delete(`/api/chat/${convId}/messages/${m.body.data.id}?scope=all`).set(auth(buyer.token));
      expect(d.status).toBe(409);
      const other = await newBuyer();
      const c2 = await request(app).post('/api/chat').set(auth(other.token)).send({ sellerId });
      expect((await request(app).delete(`/api/chat/${c2.body.data.id}/messages/${m.body.data.id}?scope=me`).set(auth(other.token))).status).toBe(404);
    });
  });

  describe('silenciar, bloquear, reportar y moderación', () => {
    it('silenciar: sin aviso nuevo para quien silenció', async () => {
      const r = await request(app).put(`/api/chat/${convId}/mute`).set(auth(sellerToken)).send({ muted: true });
      expect(r.body.data.muted).toBe(true);
      const before = await prisma.notification.count({ where: { userId: sellerId, refType: 'chat', refId: convId } });
      await request(app).post(`/api/chat/${convId}/messages`).set(auth(buyer.token)).send({ content: 'silencioso' });
      expect(await prisma.notification.count({ where: { userId: sellerId, refType: 'chat', refId: convId } })).toBe(before);
      const list = await request(app).get('/api/chat').set(auth(sellerToken));
      expect(list.body.data.find((c: { id: number }) => c.id === convId).muted).toBe(true);
      await request(app).put(`/api/chat/${convId}/mute`).set(auth(sellerToken)).send({ muted: false });
      expect((await request(app).put(`/api/chat/${convId}/mute`).set(auth(stranger.token)).send({ muted: true })).status).toBe(403);
    });

    it('bloquear impide enviar en ambos sentidos; solo a alguien con quien se chatea', async () => {
      expect((await request(app).post(`/api/chat/blocks/${sellerId}`).set(auth(stranger.token))).status).toBe(404);
      expect((await request(app).post(`/api/chat/blocks/${sellerId}`).set(auth(buyer.token))).status).toBe(200);
      const s = await request(app).post(`/api/chat/${convId}/messages`).set(auth(sellerToken)).send({ content: 'hola?' });
      expect(s.status).toBe(403);
      expect(s.body.error.code).toBe('CHAT_BLOCKED');
      expect((await request(app).post(`/api/chat/${convId}/messages`).set(auth(buyer.token)).send({ content: 'x' })).status).toBe(403);
      const page = await request(app).get(`/api/chat/${convId}`).set(auth(buyer.token));
      expect(page.body.data).toMatchObject({ blockedByMe: true, canSend: false });
      const blocks = await request(app).get('/api/chat/blocks').set(auth(buyer.token));
      expect(blocks.body.data[0].userId).toBe(sellerId);
      await request(app).delete(`/api/chat/blocks/${sellerId}`).set(auth(buyer.token));
      expect((await request(app).post(`/api/chat/${convId}/messages`).set(auth(sellerToken)).send({ content: 'ok' })).status).toBe(201);
    });

    it('reportar y revisar: solo ADMIN o asignación de moderación, solo conversaciones reportadas', async () => {
      expect((await request(app).post(`/api/chat/${convId}/report`).set(auth(stranger.token)).send({ reason: 'SPAM' })).status).toBe(403);
      expect((await request(app).post(`/api/chat/${convId}/report`).set(auth(buyer.token)).send({ reason: 'NOPE' })).status).toBe(400);
      const rep = await request(app).post(`/api/chat/${convId}/report`).set(auth(buyer.token)).send({ reason: 'FRAUD', details: 'Pide pago por fuera' });
      expect(rep.status).toBe(201);

      expect((await request(app).get('/api/chat/moderation/reports').set(auth(buyer.token))).status).toBe(403);
      const admin = await getAdminToken();
      const list = await request(app).get('/api/chat/moderation/reports?status=OPEN').set(auth(admin));
      expect(list.status).toBe(200);
      expect(list.body.data.some((r: { id: number }) => r.id === rep.body.data.id)).toBe(true);
      const view = await request(app).get(`/api/chat/moderation/reports/${rep.body.data.id}`).set(auth(admin));
      expect(view.status).toBe(200);
      const img = view.body.data.messages.find((m: { kind: string; attachment: unknown }) => m.kind === 'IMAGE' && m.attachment);
      expect((await request(app).get(img.attachment.url)).status).toBe(200);
      const done = await request(app).put(`/api/chat/moderation/reports/${rep.body.data.id}`).set(auth(admin)).send({ status: 'REVIEWED' });
      expect(done.body.data.status).toBe('REVIEWED');
    });

    it('la moderación es una asignación RBAC (no un rol): con MODERADOR_FORO revisa; sin ella, 403', async () => {
      const rep = await request(app).post(`/api/chat/${convId}/report`).set(auth(buyer.token)).send({ reason: 'SPAM' });
      const mod = await newBuyer();
      expect((await request(app).get('/api/chat/moderation/reports').set(auth(mod.token))).status).toBe(403);
      const role = await prisma.rbacRole.findUniqueOrThrow({ where: { code: 'MODERADOR_FORO' } });
      await prisma.userRole.create({ data: { userId: mod.id, roleId: role.id } });
      try {
        const u = await prisma.user.findUniqueOrThrow({ where: { id: mod.id } });
        expect(u.role).toBe('CUSTOMER');
        const view = await request(app).get(`/api/chat/moderation/reports/${rep.body.data.id}`).set(auth(mod.token));
        expect(view.status).toBe(200);
        const img = view.body.data.messages.find((m: { kind: string; attachment: unknown }) => m.kind === 'IMAGE' && m.attachment);
        expect((await request(app).get(img.attachment.url)).status).toBe(200);
      } finally {
        await prisma.userRole.deleteMany({ where: { userId: mod.id } });
      }
      // Sin la asignación, una URL firmada para él ya no sirve
      const { signFileUrl } = await import('../src/services/chat/fileSign');
      const att = await prisma.chatAttachment.findFirst({ where: { conversationId: convId }, orderBy: { id: 'asc' } });
      expect((await request(app).get(signFileUrl(att!.id, mod.id))).status).toBe(404);
    });

    it('el personal no puede ver adjuntos de una conversación sin reporte', async () => {
      const b = await newBuyer();
      const c = await request(app).post('/api/chat').set(auth(b.token)).send({ sellerId });
      const up = await request(app).post(`/api/chat/${c.body.data.id}/attachments`).set(auth(b.token)).attach('file', jpeg(), { filename: 'a.jpg', contentType: 'image/jpeg' });
      const adminUser = await prisma.user.findUnique({ where: { email: 'admin@pctienda.com' } });
      const { signFileUrl } = await import('../src/services/chat/fileSign');
      expect((await request(app).get(signFileUrl(up.body.data.attachment.id, adminUser!.id))).status).toBe(404);
    });
  });

  describe('privacidad', () => {
    it('ocultar última vez: la presencia deja de informarse (en ambos sentidos)', async () => {
      const put = await request(app).put('/api/chat/settings').set(auth(buyer.token)).send({ hideLastSeen: true });
      expect(put.body.data.hideLastSeen).toBe(true);
      const p1 = await request(app).get(`/api/chat/${convId}/presence`).set(auth(sellerToken));
      expect(p1.body.data).toEqual({ visible: false, online: false, lastSeenAt: null });
      const p2 = await request(app).get(`/api/chat/${convId}/presence`).set(auth(buyer.token));
      expect(p2.body.data.visible).toBe(false);
      await request(app).put('/api/chat/settings').set(auth(buyer.token)).send({ hideLastSeen: false });
      expect((await request(app).get(`/api/chat/${convId}/presence`).set(auth(stranger.token))).status).toBe(403);
    });
  });

  describe('autorización general (IDOR)', () => {
    it('un tercero no puede leer, enviar, marcar leído ni pedir el QR en una conversación ajena', async () => {
      const t = auth(stranger.token);
      expect((await request(app).get(`/api/chat/${convId}`).set(t)).status).toBe(403);
      expect((await request(app).post(`/api/chat/${convId}/messages`).set(t).send({ content: 'x' })).status).toBe(403);
      expect((await request(app).post(`/api/chat/${convId}/read`).set(t)).status).toBe(403);
      expect((await request(app).post(`/api/chat/${convId}/payment-qr`).set(t).send({})).status).toBe(403);
      expect((await request(app).delete(`/api/chat/${convId}/messages/1?scope=me`).set(t)).status).toBe(403);
    });

    it('ids inválidos → 400', async () => {
      expect((await request(app).get('/api/chat/0').set(auth(buyer.token))).status).toBe(400);
      expect((await request(app).get(`/api/chat/${convId}?before=-1`).set(auth(buyer.token))).status).toBe(400);
    });
  });
});
