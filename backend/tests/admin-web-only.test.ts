import request from 'supertest';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/database';
import { app, uniqueEmail } from './helpers';

/**
 * Requisito funcional: la administración solo es válida en la web. La app móvil identifica su
 * cliente con la cabecera X-Client-App: mobile y el servidor rechaza (403) a las cuentas ADMIN
 * que llegan con ella — en login, en refresh y en cualquier ruta autenticada.
 */
describe('Administración solo web (cliente móvil)', () => {
  const adminEmail = uniqueEmail('admin-web');
  const adminPassword = 'AdminWeb-12345';

  beforeAll(async () => {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        firstName: 'Admin',
        lastName: 'Web',
        role: 'ADMIN',
        isApproved: true,
        isVerified: true,
      },
    });
  });

  it('login de ADMIN desde la web (sin cabecera) → 200', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: adminEmail, password: adminPassword });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('ADMIN');
  });

  it('login de ADMIN desde la app móvil → 403 FORBIDDEN', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Client-App', 'mobile')
      .send({ email: adminEmail, password: adminPassword });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.data).toBeUndefined();
  });

  it('contraseña incorrecta desde móvil sigue siendo 401 (no revela qué correos son admin)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Client-App', 'mobile')
      .send({ email: adminEmail, password: 'incorrecta-123' });
    expect(res.status).toBe(401);
  });

  it('token de ADMIN emitido en la web no sirve desde la app móvil → 403', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: adminEmail, password: adminPassword });
    const token = login.body.data.accessToken as string;

    const web = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(web.status).toBe(200);

    const mobile = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).set('X-Client-App', 'mobile');
    expect(mobile.status).toBe(403);
    expect(mobile.body.error.code).toBe('FORBIDDEN');
  });

  it('refresh de ADMIN desde móvil → 403', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: adminEmail, password: adminPassword });
    const refreshToken = login.body.data.refreshToken as string;

    const res = await request(app).post('/api/auth/refresh').set('X-Client-App', 'mobile').send({ refreshToken });
    expect(res.status).toBe(403);
  });

  it('un comprador sí puede iniciar sesión desde la app móvil → 200', async () => {
    const email = uniqueEmail('cliente-movil');
    const reg = await request(app).post('/api/auth/register').send({
      email,
      password: 'password123',
      firstName: 'Ana',
      lastName: 'Mobile',
    });
    expect(reg.status).toBe(201);
    const res = await request(app).post('/api/auth/login').set('X-Client-App', 'mobile').send({ email, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('CUSTOMER');
  });
});
