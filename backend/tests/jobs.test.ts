import request from 'supertest';

import { app, getAdminToken, loginUser, registerSeller } from './helpers';
import { prisma } from '../src/config/database';

/**
 * Empleos: solo tiendas verificadas publican, el admin aprueba/rechaza, el público solo ve
 * los aprobados, y el período de pago (diario/semanal/mensual) es obligatorio.
 */

async function sellerToken(opts: { verified: boolean }) {
  const reg = await registerSeller();
  const email = reg.body.data.email as string;
  await prisma.user.update({ where: { email }, data: { isApproved: true, isVerified: opts.verified } });
  const login = await loginUser(email, 'password123');
  return login.body.data.accessToken as string;
}

async function anyCategoryId() {
  const cat =
    (await prisma.jobCategory.findFirst({ where: { isActive: true } })) ??
    (await prisma.jobCategory.create({ data: { name: 'Categoría de prueba', slug: `cat-prueba-${Date.now()}` } }));
  return cat.id;
}

const body = (categoryId: number, extra: Record<string, unknown> = {}) => ({
  categoryId,
  title: 'Vendedor de mostrador',
  description: 'Atención de clientes en tienda, manejo de caja y reposición de mercadería.',
  city: 'La Paz',
  payPeriod: 'WEEKLY',
  salaryMin: 700,
  salaryMax: 900,
  vacancies: 2,
  ...extra,
});

describe('Empleos', () => {
  let categoryId: number;
  let adminToken: string;

  beforeAll(async () => {
    categoryId = await anyCategoryId();
    adminToken = await getAdminToken();
  });

  it('una tienda NO verificada no puede publicar', async () => {
    const token = await sellerToken({ verified: false });
    const res = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${token}`).send(body(categoryId));
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/verificadas/i);
  });

  it('un comprador no puede publicar', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      email: `cliente-${Date.now()}@test.com`,
      password: 'password123',
      firstName: 'Cli',
      lastName: 'Ente',
    });
    const login = await loginUser(reg.body.data.email, 'password123');
    const res = await request(app)
      .post('/api/seller/jobs')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send(body(categoryId));
    expect(res.status).toBe(403);
  });

  it('el período de pago es obligatorio y solo admite DAILY, WEEKLY o MONTHLY', async () => {
    const token = await sellerToken({ verified: true });
    const invalid = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${token}`).send(body(categoryId, { payPeriod: 'YEARLY' }));
    expect(invalid.status).toBe(400);
    const missing = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${token}`).send({ ...body(categoryId), payPeriod: undefined });
    expect(missing.status).toBe(400);
    for (const payPeriod of ['DAILY', 'WEEKLY', 'MONTHLY']) {
      const ok = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${token}`).send(body(categoryId, { payPeriod }));
      expect(ok.status).toBe(201);
      expect(ok.body.data.payPeriod).toBe(payPeriod);
    }
  });

  it('rechaza sueldo mínimo mayor al máximo', async () => {
    const token = await sellerToken({ verified: true });
    const res = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${token}`).send(body(categoryId, { salaryMin: 1000, salaryMax: 500 }));
    expect(res.status).toBe(400);
  });

  it('flujo completo: pendiente → invisible → admin aprueba → visible → editar vuelve a moderación', async () => {
    const token = await sellerToken({ verified: true });
    const created = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${token}`).send(body(categoryId, { title: `Puesto único ${Date.now()}` }));
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('PENDING');
    const id = created.body.data.id as number;

    const hidden = await request(app).get(`/api/jobs/${id}`);
    expect(hidden.status).toBe(404);

    const forbidden = await request(app).put(`/api/admin/jobs/${id}/moderate`).set('Authorization', `Bearer ${token}`).send({ action: 'approve' });
    expect(forbidden.status).toBe(403);

    const approved = await request(app).put(`/api/admin/jobs/${id}/moderate`).set('Authorization', `Bearer ${adminToken}`).send({ action: 'approve' });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('APPROVED');
    expect(approved.body.data.expiresAt).toBeTruthy();

    const visible = await request(app).get(`/api/jobs/${id}`);
    expect(visible.status).toBe(200);
    const list = await request(app).get('/api/jobs').query({ payPeriod: 'WEEKLY', categoryId });
    expect(list.body.data.some((j: { id: number }) => j.id === id)).toBe(true);

    const edited = await request(app).put(`/api/seller/jobs/${id}`).set('Authorization', `Bearer ${token}`).send({ vacancies: 5 });
    expect(edited.body.data.status).toBe('PENDING');
    expect((await request(app).get(`/api/jobs/${id}`)).status).toBe(404);
  });

  it('el rechazo exige motivo y lo guarda', async () => {
    const token = await sellerToken({ verified: true });
    const created = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${token}`).send(body(categoryId));
    const id = created.body.data.id as number;

    const noReason = await request(app).put(`/api/admin/jobs/${id}/moderate`).set('Authorization', `Bearer ${adminToken}`).send({ action: 'reject' });
    expect(noReason.status).toBe(400);

    const rejected = await request(app)
      .put(`/api/admin/jobs/${id}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'reject', reason: 'La descripción no cumple las normas' });
    expect(rejected.body.data.status).toBe('REJECTED');
    expect(rejected.body.data.rejectionReason).toMatch(/normas/);
  });

  it('un vendedor no puede editar ni cerrar empleos de otra tienda', async () => {
    const owner = await sellerToken({ verified: true });
    const other = await sellerToken({ verified: true });
    const created = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${owner}`).send(body(categoryId));
    const id = created.body.data.id as number;
    expect((await request(app).put(`/api/seller/jobs/${id}`).set('Authorization', `Bearer ${other}`).send({ vacancies: 9 })).status).toBe(404);
    expect((await request(app).post(`/api/seller/jobs/${id}/close`).set('Authorization', `Bearer ${other}`)).status).toBe(404);
  });
});

describe('Postulaciones a empleos', () => {
  let categoryId: number;
  let adminToken: string;
  let storeToken: string;
  let jobId: number;

  const application = (extra: Record<string, unknown> = {}) => ({
    message: 'Tengo experiencia en atención al cliente y disponibilidad inmediata.',
    contactPhone: '+59170000000',
    expectedSalary: 800,
    ...extra,
  });

  async function candidateToken() {
    const reg = await request(app).post('/api/auth/register').send({
      email: `candidato-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`,
      password: 'password123',
      firstName: 'Cande',
      lastName: 'Dato',
    });
    const login = await loginUser(reg.body.data.email, 'password123');
    return { token: login.body.data.accessToken as string, id: reg.body.data.id as number };
  }

  beforeAll(async () => {
    categoryId = await anyCategoryId();
    adminToken = await getAdminToken();
    storeToken = await sellerToken({ verified: true });
    const created = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${storeToken}`).send(body(categoryId, { title: `Puesto con postulantes ${Date.now()}` }));
    jobId = created.body.data.id as number;
    await request(app).put(`/api/admin/jobs/${jobId}/moderate`).set('Authorization', `Bearer ${adminToken}`).send({ action: 'approve' });
  });

  it('requiere sesión y datos válidos', async () => {
    expect((await request(app).post(`/api/jobs/${jobId}/apply`).send(application())).status).toBe(401);
    const { token } = await candidateToken();
    expect((await request(app).post(`/api/jobs/${jobId}/apply`).set('Authorization', `Bearer ${token}`).send(application({ message: 'corto' }))).status).toBe(400);
    expect((await request(app).post(`/api/jobs/${jobId}/apply`).set('Authorization', `Bearer ${token}`).send(application({ resumeUrl: 'no-es-url' }))).status).toBe(400);
  });

  it('un empleo no aprobado no admite postulaciones', async () => {
    const { token } = await candidateToken();
    const pending = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${storeToken}`).send(body(categoryId));
    const res = await request(app).post(`/api/jobs/${pending.body.data.id}/apply`).set('Authorization', `Bearer ${token}`).send(application());
    expect(res.status).toBe(404);
  });

  it('la tienda no puede postularse a su propio empleo', async () => {
    const res = await request(app).post(`/api/jobs/${jobId}/apply`).set('Authorization', `Bearer ${storeToken}`).send(application());
    expect(res.status).toBe(403);
  });

  it('flujo: postular → no duplicar → la tienda ve y cambia estado → el candidato lo ve → retirar y repostular', async () => {
    const { token } = await candidateToken();
    const auth = { Authorization: `Bearer ${token}` };

    const first = await request(app).post(`/api/jobs/${jobId}/apply`).set(auth).send(application());
    expect(first.status).toBe(201);
    expect(first.body.data.status).toBe('RECEIVED');
    expect((await request(app).post(`/api/jobs/${jobId}/apply`).set(auth).send(application())).status).toBe(400);

    const detail = await request(app).get(`/api/jobs/${jobId}`).set(auth);
    expect(detail.body.data.myApplication.status).toBe('RECEIVED');
    expect((await request(app).get(`/api/jobs/${jobId}`)).body.data.myApplication).toBeNull();

    const forStore = await request(app).get(`/api/seller/jobs/${jobId}/applications`).set('Authorization', `Bearer ${storeToken}`);
    expect(forStore.status).toBe(200);
    const mine = forStore.body.data.find((a: { id: number }) => a.id === first.body.data.id);
    expect(mine.applicant.email).toBeTruthy();

    const other = await sellerToken({ verified: true });
    expect((await request(app).get(`/api/seller/jobs/${jobId}/applications`).set('Authorization', `Bearer ${other}`)).status).toBe(404);
    expect((await request(app).get(`/api/seller/jobs/${jobId}/applications`).set(auth)).status).toBe(403);

    const invalid = await request(app).put(`/api/seller/jobs/applications/${first.body.data.id}/status`).set('Authorization', `Bearer ${storeToken}`).send({ status: 'WITHDRAWN' });
    expect(invalid.status).toBe(400);
    const shortlisted = await request(app).put(`/api/seller/jobs/applications/${first.body.data.id}/status`).set('Authorization', `Bearer ${storeToken}`).send({ status: 'SHORTLISTED', note: 'Te llamamos mañana' });
    expect(shortlisted.body.data.status).toBe('SHORTLISTED');
    expect((await request(app).put(`/api/seller/jobs/applications/${first.body.data.id}/status`).set('Authorization', `Bearer ${other}`).send({ status: 'REJECTED' })).status).toBe(404);

    const list = await request(app).get('/api/jobs/applications/mine').set(auth);
    expect(list.body.data[0].status).toBe('SHORTLISTED');
    expect(list.body.data[0].job.title).toMatch(/Puesto con postulantes/);

    const withdrawn = await request(app).delete(`/api/jobs/${jobId}/apply`).set(auth);
    expect(withdrawn.body.data.status).toBe('WITHDRAWN');
    const hiddenForStore = await request(app).get(`/api/seller/jobs/${jobId}/applications`).set('Authorization', `Bearer ${storeToken}`);
    expect(hiddenForStore.body.data.some((a: { id: number }) => a.id === first.body.data.id)).toBe(false);

    const again = await request(app).post(`/api/jobs/${jobId}/apply`).set(auth).send(application());
    expect(again.status).toBe(201);
    expect(again.body.data.id).toBe(first.body.data.id);
    expect(again.body.data.status).toBe('RECEIVED');
  });

  it('el listado del vendedor incluye el conteo de postulantes', async () => {
    const { token } = await candidateToken();
    await request(app).post(`/api/jobs/${jobId}/apply`).set('Authorization', `Bearer ${token}`).send(application());
    const res = await request(app).get('/api/seller/jobs').set('Authorization', `Bearer ${storeToken}`);
    const job = res.body.data.jobs.find((j: { id: number }) => j.id === jobId);
    expect(job._count.applications).toBeGreaterThanOrEqual(1);
  });
});

describe('CV adjunto en postulaciones', () => {
  let storeToken: string;
  let jobId: number;
  const PDF = Buffer.from(['%PDF-1.4', '1 0 obj', '<<>>', 'endobj', '%%EOF', ''].join(String.fromCharCode(10)));

  async function candidate() {
    const reg = await request(app).post('/api/auth/register').send({
      email: `cv-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`,
      password: 'password123',
      firstName: 'Cv',
      lastName: 'Candidato',
    });
    const login = await loginUser(reg.body.data.email, 'password123');
    return login.body.data.accessToken as string;
  }
  const applyWith = (token: string, file?: { buf: Buffer; name: string }) => {
    let r = request(app)
      .post(`/api/jobs/${jobId}/apply`)
      .set('Authorization', `Bearer ${token}`)
      .field('message', 'Adjunto mi CV para que puedan revisarlo con calma.')
      .field('contactPhone', '+59170000000');
    if (file) r = r.attach('cv', file.buf, file.name);
    return r;
  };

  beforeAll(async () => {
    const categoryId = await anyCategoryId();
    const adminToken = await getAdminToken();
    storeToken = await sellerToken({ verified: true });
    const created = await request(app).post('/api/seller/jobs').set('Authorization', `Bearer ${storeToken}`).send(body(categoryId, { title: `Puesto con CV ${Date.now()}` }));
    jobId = created.body.data.id as number;
    await request(app).put(`/api/admin/jobs/${jobId}/moderate`).set('Authorization', `Bearer ${adminToken}`).send({ action: 'approve' });
  });

  it('rechaza tipos no permitidos y archivos cuyo contenido no coincide con la extensión', async () => {
    const exe = await applyWith(await candidate(), { buf: Buffer.from('MZ....'), name: 'virus.exe' });
    expect(exe.status).toBe(400);
    expect(exe.body.error.message).toMatch(/PDF, DOC o DOCX/);
    const fake = await applyWith(await candidate(), { buf: Buffer.from('esto no es un pdf'), name: 'cv.pdf' });
    expect(fake.status).toBe(400);
    expect(fake.body.error.message).toMatch(/no parece/i);
  });

  it('rechaza archivos de más de 5 MB', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-1.4 '), Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const res = await applyWith(await candidate(), { buf: big, name: 'grande.pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/5 MB/);
  });

  it('acepta un PDF real, no expone la ruta interna y solo lo descargan el candidato y la tienda', async () => {
    const token = await candidate();
    const res = await applyWith(token, { buf: PDF, name: 'Mi CV.pdf' });
    expect(res.status).toBe(201);
    expect(res.body.data.hasCv).toBe(true);
    expect(res.body.data.cvName).toBe('Mi CV.pdf');
    expect(res.body.data.cvFile).toBeUndefined();
    const appId = res.body.data.id as number;

    const mine = await request(app).get('/api/jobs/applications/mine').set('Authorization', `Bearer ${token}`);
    expect(mine.body.data[0].hasCv).toBe(true);
    expect(mine.body.data[0].cvFile).toBeUndefined();

    // el candidato y la tienda obtienen enlace; otro usuario y otra tienda, no
    const own = await request(app).post(`/api/jobs/applications/${appId}/cv-link`).set('Authorization', `Bearer ${token}`);
    expect(own.status).toBe(200);
    const forStore = await request(app).post(`/api/jobs/applications/${appId}/cv-link`).set('Authorization', `Bearer ${storeToken}`);
    expect(forStore.status).toBe(200);
    expect((await request(app).post(`/api/jobs/applications/${appId}/cv-link`).set('Authorization', `Bearer ${await candidate()}`)).status).toBe(404);
    expect((await request(app).post(`/api/jobs/applications/${appId}/cv-link`).set('Authorization', `Bearer ${await sellerToken({ verified: true })}`)).status).toBe(404);
    expect((await request(app).post(`/api/jobs/applications/${appId}/cv-link`)).status).toBe(401);

    // la descarga entrega el archivo original y un token inválido no sirve
    const file = await request(app).get(forStore.body.data.path).buffer(true);
    expect(file.status).toBe(200);
    expect(file.headers['content-disposition']).toMatch(/Mi CV\.pdf/);
    expect(Buffer.from(file.body).toString('latin1')).toContain('%PDF-1.4');
    expect((await request(app).get('/api/jobs/cv/download?token=falso')).status).toBe(401);
    expect((await request(app).get('/api/uploads/cv')).status).toBe(404);
  });

  it('una postulación sin CV no ofrece enlace de descarga', async () => {
    const token = await candidate();
    const res = await applyWith(token);
    expect(res.status).toBe(201);
    expect(res.body.data.hasCv).toBe(false);
    expect((await request(app).post(`/api/jobs/applications/${res.body.data.id}/cv-link`).set('Authorization', `Bearer ${token}`)).status).toBe(404);
  });
});

describe('Vista admin de postulaciones', () => {
  it('solo el admin la ve, con filtros y conteo por estado', async () => {
    const adminToken = await getAdminToken();
    const seller = await sellerToken({ verified: true });
    expect((await request(app).get('/api/admin/job-applications').set('Authorization', `Bearer ${seller}`)).status).toBe(403);
    const all = await request(app).get('/api/admin/job-applications').set('Authorization', `Bearer ${adminToken}`);
    expect(all.status).toBe(200);
    expect(all.body.data.total).toBeGreaterThan(0);
    expect(all.body.data.stats).toHaveProperty('RECEIVED');
    expect(all.body.data.items[0].cvFile).toBeUndefined();
    expect(all.body.data.items[0].applicant.email).toBeTruthy();
    expect(all.body.data.items[0].job.title).toBeTruthy();
    const none = await request(app).get('/api/admin/job-applications?status=HIRED&q=zzzz-no-existe').set('Authorization', `Bearer ${adminToken}`);
    expect(none.body.data.total).toBe(0);
  });
});
