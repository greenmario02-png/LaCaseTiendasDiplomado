import request from 'supertest';
import { app, registerUser } from './helpers';
import { prisma } from '../src/config/database';

/** Direcciones con formato de Bolivia: sin código postal obligatorio y con departamento de la lista cerrada de 9. */
async function buyerAuth() {
  const reg = await registerUser();
  const login = await request(app).post('/api/auth/login').send({ email: reg.body.data.email, password: 'password123' });
  const user = await prisma.user.findUniqueOrThrow({ where: { email: reg.body.data.email }, select: { id: true } });
  return { userId: user.id, auth: { Authorization: `Bearer ${login.body.data.accessToken}` } };
}

describe('Direcciones de Bolivia (CP opcional + departamento)', () => {
  it('crea una dirección SIN código postal y la guarda como null', async () => {
    const { auth } = await buyerAuth();
    const res = await request(app).post('/api/account/addresses').set(auth).send({ street: 'Calle Sucre', number: '10', city: 'Tarija', state: 'Tarija' });
    expect(res.status).toBe(201);
    expect(res.body.data.postalCode).toBeNull();
    expect(res.body.data.state).toBe('Tarija');
  });

  it('un código postal vacío también queda como null', async () => {
    const { auth } = await buyerAuth();
    const res = await request(app).post('/api/account/addresses').set(auth).send({ street: 'Av. Blanco Galindo', number: '5', city: 'Quillacollo', state: 'Cochabamba', postalCode: '  ' });
    expect(res.status).toBe(201);
    expect(res.body.data.postalCode).toBeNull();
  });

  it('guarda el departamento con su nombre oficial aunque se escriba sin tildes ni mayúsculas', async () => {
    const { auth } = await buyerAuth();
    const res = await request(app).post('/api/account/addresses').set(auth).send({ street: 'Calle Bolívar', number: '1', city: 'Potosí', state: 'potosi' });
    expect(res.status).toBe(201);
    expect(res.body.data.state).toBe('Potosí');
  });

  it('rechaza un departamento que no es de Bolivia y no guarda nada', async () => {
    const { userId, auth } = await buyerAuth();
    const res = await request(app).post('/api/account/addresses').set(auth).send({ street: 'Av. Libertador', number: '1500', city: 'Buenos Aires', state: 'CABA' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('departamento');
    expect(await prisma.address.count({ where: { userId } })).toBe(0);
  });

  it('el departamento es obligatorio al crear', async () => {
    const { auth } = await buyerAuth();
    const res = await request(app).post('/api/account/addresses').set(auth).send({ street: 'Calle 1', number: '1', city: 'Oruro' });
    expect(res.status).toBe(400);
  });

  it('editar: se puede quitar el CP, se valida el departamento y marcar como principal no exige campos', async () => {
    const { userId, auth } = await buyerAuth();
    const created = await request(app).post('/api/account/addresses').set(auth).send({ street: 'Calle 1', number: '1', city: 'Sucre', state: 'Chuquisaca', postalCode: '0001' });
    const id = created.body.data.id;

    const cleared = await request(app).put(`/api/account/addresses/${id}`).set(auth).send({ postalCode: '' });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.postalCode).toBeNull();

    const bad = await request(app).put(`/api/account/addresses/${id}`).set(auth).send({ state: 'Santa Fe' });
    expect(bad.status).toBe(400);

    const dep = await request(app).put(`/api/account/addresses/${id}`).set(auth).send({ state: 'santa cruz' });
    expect(dep.status).toBe(200);
    expect(dep.body.data.state).toBe('Santa Cruz');

    // Dirección antigua con un "state" fuera del catálogo: marcarla como principal sigue funcionando.
    const legacy = await prisma.address.create({ data: { userId, street: 'Vieja', number: '1', city: 'X', state: 'Provincia vieja', postalCode: null } });
    const def = await request(app).put(`/api/account/addresses/${legacy.id}`).set(auth).send({ isDefault: true });
    expect(def.status).toBe(200);
    expect(def.body.data.isDefault).toBe(true);
  });

  it('una dirección sin CP sirve para comprar: el envío usa el costo base', async () => {
    const { auth } = await buyerAuth();
    const addr = await request(app).post('/api/account/addresses').set(auth).send({ street: 'Calle Sucre', number: '10', city: 'Tarija', state: 'Tarija', isDefault: true });
    const products = await request(app).get('/api/products').query({ limit: 50 });
    const p = products.body.data.find((x: any) => x.stock >= 1);
    await request(app).post('/api/cart/items').set(auth).send({ productId: p.id, quantity: 1 });
    const orders = await request(app).post('/api/orders').set(auth).send({ shippingAddressId: addr.body.data.id });
    expect(orders.status).toBe(201);
    const detail = await request(app).get(`/api/account/orders/${orders.body.data[0].id}`).set(auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.shippingAddress?.postalCode ?? null).toBeNull();
  });
});
