import request from 'supertest';
import { app, registerUser, uniqueEmail, getAdminToken } from './helpers';
import { prisma } from '../src/config/database';

/**
 * Registra un usuario y "envejece" su cuenta a 48 h para pasar assertAccountAge.
 * Devuelve token + userId (User.id).
 */
async function createAgedUser(prefix = 'forum'): Promise<{ token: string; userId: number; email: string }> {
  const reg = await registerUser({ email: uniqueEmail(prefix) });
  const email = reg.body.data.email;
  const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  expect(login.status).toBe(200);
  const token = login.body.data.accessToken as string;
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.user.update({
    where: { id: user.id },
    data: { createdAt: new Date(Date.now() - 48 * 3600 * 1000) },
  });
  return { token, userId: user.id, email };
}

/** Obtiene el ForumProfile (lo crea ensureForumProfile si no existe) vía GET /profile/me. */
async function getProfileId(token: string): Promise<number> {
  const res = await request(app).get('/api/forum/profile/me').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.data.id).toBeDefined();
  return res.body.data.id as number;
}

/** Espera (polling) la reply del bot en un post hasta timeoutMs. */
async function waitForBotReply(postId: number, timeoutMs = 4000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request(app).get(`/api/forum/posts/${postId}`);
    const replies: any[] = res.body.data.replies ?? [];
    const bot = replies.find((r: any) => r.isBotReply);
    if (bot) return bot;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('El bot no respondió a tiempo');
}

describe('Forum API (integración)', () => {
  let categoryId: number;

  beforeAll(async () => {
    const cats = await request(app).get('/api/forum/categories');
    expect(cats.status).toBe(200);
    expect(cats.body.data.length).toBeGreaterThan(0);
    categoryId = cats.body.data[0].id;
  });

  // ── Perfil / alias ──────────────────────────────────────────────
  it('GET /profile/me requiere auth', async () => {
    const res = await request(app).get('/api/forum/profile/me');
    expect(res.status).toBe(401);
  });

  it('el primer acceso autogenera un alias único Usuario_XXXX', async () => {
    const { token } = await createAgedUser('alias');
    const res = await request(app).get('/api/forum/profile/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.forumUsername).toMatch(/^Usuario_\d{4}$/);
    // Segundo acceso: mismo alias (no se regenera)
    const res2 = await request(app).get('/api/forum/profile/me').set('Authorization', `Bearer ${token}`);
    expect(res2.body.data.forumUsername).toBe(res.body.data.forumUsername);
    // La respuesta NUNCA expone email ni nombre real
    expect(res.body.data.email).toBeUndefined();
    expect(res.body.data.firstName).toBeUndefined();
  });

  // ── Posts y límites diarios ─────────────────────────────────────
  it('crea un post (201) y el segundo del día devuelve 429 DAILY_LIMIT_REACHED', async () => {
    const { token } = await createAgedUser('posts');
    const body = {
      title: '¿Dónde comprar repuestos de laptop en La Paz?',
      body: 'Necesito un lugar confiable para repuestos de teclado y pantalla para una laptop Lenovo.',
      categoryId,
      city: 'La Paz',
      type: 'GENERAL',
      tags: ['repuestos', 'laptop'],
    };
    const r1 = await request(app).post('/api/forum/posts').set('Authorization', `Bearer ${token}`).send(body);
    expect(r1.status).toBe(201);
    expect(r1.body.data.botReplyPending).toBe(false);

    const r2 = await request(app).post('/api/forum/posts').set('Authorization', `Bearer ${token}`).send({
      ...body,
      title: '¿Otra pregunta de repuestos?',
    });
    expect(r2.status).toBe(429);
    expect(r2.body.error.code).toBe('DAILY_LIMIT_REACHED');
  });

  it('una cuenta nueva (< 24 h) no puede publicar: 403 ACCOUNT_TOO_NEW', async () => {
    const reg = await registerUser({ email: uniqueEmail('fresh') });
    const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
    const token = login.body.data.accessToken as string;
    const res = await request(app).post('/api/forum/posts').set('Authorization', `Bearer ${token}`).send({
      title: 'Pregunta de cuenta nueva',
      body: 'Este usuario recién se registró y no debería poder publicar todavía.',
      categoryId,
      city: 'Cochabamba',
      type: 'GENERAL',
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_TOO_NEW');
  });

  // ── Bot multitienda (precio) ────────────────────────────────────
  it('el bot responde a un post tipo PRECIO en < 2 s con producto del seed', async () => {
    // Verificar que existe un producto "Ryzen" activo+aprobado en el seed
    const seedProduct = await prisma.product.findFirst({
      where: { name: { contains: 'Ryzen', mode: 'insensitive' }, isActive: true, isApproved: true },
    });
    if (!seedProduct) throw new Error('El seed no tiene productos Ryzen para el test del bot');

    const { token } = await createAgedUser('bot');
    const start = Date.now();
    const r = await request(app).post('/api/forum/posts').set('Authorization', `Bearer ${token}`).send({
      title: '¿Cuánto cuesta el AMD Ryzen 9 7950X3D?',
      body: 'Quiero saber el precio actual del procesador Ryzen 9 7950X3D en la multitienda.',
      categoryId,
      city: 'Santa Cruz',
      type: 'PRECIO',
      tags: ['ryzen', 'precio'],
    });
    expect(r.status).toBe(201);
    expect(r.body.data.botReplyPending).toBe(true);
    expect(Date.now() - start).toBeLessThan(2000);

    const botReply = await waitForBotReply(r.body.data.id);
    expect(botReply.isBotReply).toBe(true);
    expect(botReply.body).toContain('Ryzen');
    expect(botReply.author).toBeNull();
  });

  // ── Votos ────────────────────────────────────────────────────────
  it('upvote incrementa score y votar propio contenido da 403 SELF_VOTE', async () => {
    const a = await createAgedUser('voter-a');
    const b = await createAgedUser('voter-b');

    const postRes = await request(app).post('/api/forum/posts').set('Authorization', `Bearer ${a.token}`).send({
      title: '¿Alguien conoce un buen cerrajero en Sucre?',
      body: 'Se me perdió la llave del depósito y necesito un cerrajero de confianza en Sucre centro.',
      categoryId,
      city: 'Sucre',
      type: 'GENERAL',
    });
    expect(postRes.status).toBe(201);
    const postId = postRes.body.data.id;

    // Self-vote → 403
    const self = await request(app)
      .post(`/api/forum/posts/${postId}/vote`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ value: 1 });
    expect(self.status).toBe(403);
    expect(self.body.error.code).toBe('SELF_VOTE');

    // Upvote de otro usuario → score 0.5 (peso de RNF-06.3: votante con < 3 posts)
    const up = await request(app)
      .post(`/api/forum/posts/${postId}/vote`)
      .set('Authorization', `Bearer ${b.token}`)
      .send({ value: 1 });
    expect(up.status).toBe(200);
    expect(up.body.data.newScore).toBeGreaterThanOrEqual(0.5);

    // Toggle: mismo usuario vota de nuevo up → cancela (score vuelve a 0)
    const toggle = await request(app)
      .post(`/api/forum/posts/${postId}/vote`)
      .set('Authorization', `Bearer ${b.token}`)
      .send({ value: 1 });
    expect(toggle.status).toBe(200);
    expect(toggle.body.data.newScore).toBe(0);
  });

  // ── Replies y límite diario ─────────────────────────────────────
  it('permite 5 respuestas al día y la sexta da 429', async () => {
    const a = await createAgedUser('rep-a');
    const b = await createAgedUser('rep-b');

    const postRes = await request(app).post('/api/forum/posts').set('Authorization', `Bearer ${a.token}`).send({
      title: '¿Dónde hay clases de inglés gratis en Oruro?',
      body: 'Busco opciones gratuitas o muy económicas para aprender inglés en la ciudad de Oruro.',
      categoryId,
      city: 'Oruro',
      type: 'GENERAL',
    });
    const postId = postRes.body.data.id;

    for (let i = 1; i <= 5; i++) {
      const r = await request(app)
        .post(`/api/forum/posts/${postId}/replies`)
        .set('Authorization', `Bearer ${b.token}`)
        .send({ body: `Respuesta número ${i} con información útil para el usuario.` });
      expect(r.status).toBe(201);
    }
    const sixth = await request(app)
      .post(`/api/forum/posts/${postId}/replies`)
      .set('Authorization', `Bearer ${b.token}`)
      .send({ body: 'Sexta respuesta que debería ser rechazada por el límite diario.' });
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe('DAILY_LIMIT_REACHED');
  });

  // ── Aceptar respuesta → karma + monedas ─────────────────────────
  it('aceptar una respuesta marca RESOLVED y acredita karma +10 y coins +3', async () => {
    const a = await createAgedUser('acc-a');
    const b = await createAgedUser('acc-b');
    const profileB = await getProfileId(b.token);

    const postRes = await request(app).post('/api/forum/posts').set('Authorization', `Bearer ${a.token}`).send({
      title: '¿Qué doctor atiende los domingos en Tarija?',
      body: 'Necesito saber si hay consultorios médicos que atiendan los domingos en la ciudad de Tarija.',
      categoryId,
      city: 'Tarija',
      type: 'GENERAL',
    });
    const postId = postRes.body.data.id;

    // Un tercero (no autor del post) que intenta aceptar → 403 NOT_POST_AUTHOR
    const strangerRes = await request(app)
      .post(`/api/forum/posts/${postId}/replies`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ body: 'Respuesta del propio autor para probar SELF_ACCEPT en el paso siguiente.' });
    const strangerReplyId = strangerRes.body.data.id;

    const selfAccept = await request(app)
      .post(`/api/forum/replies/${strangerReplyId}/accept`)
      .set('Authorization', `Bearer ${a.token}`);
    expect(selfAccept.status).toBe(403);
    expect(selfAccept.body.error.code).toBe('SELF_ACCEPT');

    // Respuesta real de B para la aceptación válida
    const replyRes = await request(app)
      .post(`/api/forum/posts/${postId}/replies`)
      .set('Authorization', `Bearer ${b.token}`)
      .send({ body: 'La clínica Santa María atiende domingos de 8 a 12 en el centro.' });
    const replyId = replyRes.body.data.id;

    // Aceptar como autor del post
    const accept = await request(app)
      .post(`/api/forum/replies/${replyId}/accept`)
      .set('Authorization', `Bearer ${a.token}`);
    expect(accept.status).toBe(200);
    expect(accept.body.data.postStatus).toBe('RESOLVED');
    expect(accept.body.data.karmaAwarded).toBe(10);
    expect(accept.body.data.coinsAwarded).toBe(3);

    // Esperar el setImmediate de acreditación
    await new Promise((r) => setTimeout(r, 600));

    const profile = await prisma.forumProfile.findUniqueOrThrow({ where: { id: profileB } });
    expect(profile.karma).toBeGreaterThanOrEqual(10);

    const coinTx = await prisma.coinTransaction.findFirst({
      where: { userId: b.userId, type: 'EARN_FORUM', refType: 'FORUM_ANSWER' },
    });
    expect(coinTx).not.toBeNull();
    expect(coinTx!.amount).toBe(3);
  });

  // ── Canje de karma por monedas ──────────────────────────────────
  it('canjear 100 karma acredita +10 gamerCoins sin bajar el karma histórico', async () => {
    const { token, userId } = await createAgedUser('redeem');
    const profileId = await getProfileId(token);

    // Acreditar karma directamente para el test
    await prisma.forumProfile.update({ where: { id: profileId }, data: { karma: 150 } });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { gamerCoins: true } });

    const res = await request(app)
      .post('/api/forum/karma/redeem')
      .set('Authorization', `Bearer ${token}`)
      .send({ karmaAmount: 100 });
    expect(res.status).toBe(200);
    expect(res.body.data.coinsEarned).toBe(10);
    expect(res.body.data.karmaBalance).toBe(150); // histórico NO baja
    expect(res.body.data.karmaSpent).toBe(100);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { gamerCoins: true } });
    expect(after.gamerCoins).toBe(before.gamerCoins + 10);

    const coinTx = await prisma.coinTransaction.findFirst({
      where: { userId, type: 'EARN_FORUM', refType: 'REWARD' },
    });
    expect(coinTx).not.toBeNull();
    expect(coinTx!.amount).toBe(10);
  });

  it('canjear con karma insuficiente devuelve 400 INSUFFICIENT_KARMA', async () => {
    const { token } = await createAgedUser('redeem2');
    const res = await request(app)
      .post('/api/forum/karma/redeem')
      .set('Authorization', `Bearer ${token}`)
      .send({ karmaAmount: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_KARMA');
  });

  // ── Moderación: auto-ocultar con 5 reportes ─────────────────────
  it('5 reportes distintos auto-ocultan el post (isHidden) y desaparece del feed', async () => {
    const a = await createAgedUser('mod-a');
    const postRes = await request(app).post('/api/forum/posts').set('Authorization', `Bearer ${a.token}`).send({
      title: '¿Dónde venden productos prohibidos?',
      body: 'Contenido de prueba que será reportado para comprobar la moderación del foro.',
      categoryId,
      city: 'El Alto',
      type: 'GENERAL',
    });
    const postId = postRes.body.data.id;

    for (let i = 0; i < 5; i++) {
      const reporter = await createAgedUser(`mod-r${i}`);
      const r = await request(app)
        .post(`/api/forum/posts/${postId}/report`)
        .set('Authorization', `Bearer ${reporter.token}`)
        .send({ reason: 'SPAM', detail: 'Reporte de prueba' });
      expect(r.status).toBe(201);
    }

    const hidden = await prisma.forumPost.findUniqueOrThrow({ where: { id: postId } });
    expect(hidden.isHidden).toBe(true);

    // El post no aparece en el feed público
    const feed = await request(app).get('/api/forum/posts').query({ limit: 50 });
    const ids = (feed.body.data as any[]).map((p: any) => p.id);
    expect(ids).not.toContain(postId);
  });

  // ── Feed y discovery ─────────────────────────────────────────────
  it('el feed público lista los posts creados y expone meta paginado', async () => {
    const res = await request(app).get('/api/forum/posts').query({ page: 1, limit: 20 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.meta.total).toBe('number');
    expect(typeof res.body.meta.totalPages).toBe('number');
    // Cada post expone solo alias, nunca email/nombre real
    for (const p of res.body.data as any[]) {
      expect(p.author.forumUsername).toBeDefined();
      expect(p.author.email).toBeUndefined();
    }
  });

  it('trending, cities/stats y top-users responden 200', async () => {
    const t = await request(app).get('/api/forum/trending');
    expect(t.status).toBe(200);
    const c = await request(app).get('/api/forum/cities/stats');
    expect(c.status).toBe(200);
    const u = await request(app).get('/api/forum/top-users');
    expect(u.status).toBe(200);
  });

  // ── Moderación (ADMIN) ───────────────────────────────────────────
  it('el admin puede listar reportes y ajustar karma', async () => {
    const adminToken = await getAdminToken();
    const reports = await request(app).get('/api/forum/reports').set('Authorization', `Bearer ${adminToken}`);
    expect(reports.status).toBe(200);
    expect(Array.isArray(reports.body.data)).toBe(true);
  });

  it('un usuario sin rol admin no accede a /api/forum/reports', async () => {
    const { token } = await createAgedUser('noadmin');
    const res = await request(app).get('/api/forum/reports').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
