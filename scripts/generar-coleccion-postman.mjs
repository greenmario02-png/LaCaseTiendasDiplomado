// Genera la colección de Postman (v2.1) con aserciones para la Entrega 3 y su entorno SIN secretos.
//   postman/LaCase-E3.postman_collection.json
//   postman/LaCase-produccion.postman_environment.json
// Las contraseñas NO van en ningún archivo: Newman las recibe de variables de entorno (scripts/produccion.ps1 -Newman)
// y en Postman se escriben en la variable de entorno (tipo secret) al importar el entorno.
//
// Uso: node scripts/generar-coleccion-postman.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(raiz, 'postman');
fs.mkdirSync(dir, { recursive: true });

const ORIGEN = 'https://lacase-diplomado-api.onrender.com';
const base = `${ORIGEN}/api/v1`; // URL completa y visible en cada solicitud (sin variable baseUrl)
const tests = (lineas) => [{ listen: 'test', script: { type: 'text/javascript', exec: lineas } }];
const guardaError = 'const j = (()=>{ try { return pm.response.json(); } catch(e) { return {}; } })();';

function req(nombre, metodo, ruta, { token, body, query, test, pre } = {}) {
  const item = {
    name: nombre,
    event: [...(pre ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: pre } }] : []), ...tests(test)],
    request: {
      method: metodo,
      header: [...(token ? [{ key: 'Authorization', value: `Bearer {{${token}}}` }] : []), ...(body ? [{ key: 'Content-Type', value: 'application/json' }] : [])],
      url: { raw: `${base}${ruta}${query ? '?' + query : ''}`, host: [ORIGEN.replace('https://', '')], path: ruta.split('/').filter(Boolean), ...(query ? { query: query.split('&').map((q) => ({ key: q.split('=')[0], value: q.split('=')[1] })) } : {}) },
    },
  };
  if (body) item.request.body = { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
  return item;
}

const login = (nombre, email, pass, tokenVar, extra = []) =>
  req(nombre, 'POST', '/auth/login', {
    body: `{"email":"{{${email}}}","password":"{{${pass}}}"}`,
    test: [
      guardaError,
      `pm.test('${nombre}: HTTP 200', () => pm.response.to.have.status(200));`,
      `pm.test('El token vence en 900 s (15 min)', () => { const p = JSON.parse(atob(j.data.accessToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); pm.expect(p.exp - p.iat).to.eql(900); });`,
      `pm.test('La respuesta no expone passwordHash', () => pm.expect(JSON.stringify(j)).to.not.match(/passwordHash/));`,
      `pm.collectionVariables.set('${tokenVar}', j.data.accessToken);`,
      ...extra,
    ],
  });

const estado = (n, codigo, extra = []) => [guardaError, `pm.test('HTTP ${codigo}', () => pm.response.to.have.status(${codigo}));`, ...extra];
const errorCode = (c) => `pm.test('Formato de error único: error.code = ${c}', () => pm.expect(j.error.code).to.eql('${c}'));`;

const carpeta = (name, item) => ({ name, item });

const coleccion = {
  info: {
    name: 'LaCase Multitiendas · E3 · Pruebas de API en producción',
    description: 'Colección con aserciones del flujo Must, 401/403 y validaciones. Se ejecuta con Newman (scripts/produccion.ps1 -Newman) o desde Postman (Run collection). Cada solicitud lleva su URL completa de producción. Variables de entorno: credenciales de las cuentas ficticias *.test (las contraseñas se escriben en el entorno, nunca en la colección).',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [...['sellerToken', 'buyerToken', 'adminToken', 'categoryId', 'productA', 'productB', 'orderId'].map((key) => ({ key, value: '' })), { key: 'stamp', value: '' }],
  event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: [
    "if (!pm.collectionVariables.get('stamp')) pm.collectionVariables.set('stamp', String(Math.floor(Date.now() / 60000) % 100000));",
    "const marcadores = { 'ID-PRODUCTO-A': 'productA', 'ID-PRODUCTO-B': 'productB', 'ID-PEDIDO': 'orderId' };",
    "let destino = pm.request.url.toString();",
    "Object.keys(marcadores).forEach((m) => { destino = destino.split(m).join(String(pm.collectionVariables.get(marcadores[m]))); });",
    "pm.request.url.update(destino);",
  ] } }],
  item: [
    carpeta('1 · Disponibilidad', [
      req('CP-10 · Salud 200', 'GET', '/salud', { test: estado('', 200, [`pm.test('Informa el commit en vivo', () => pm.expect(j).to.have.property('commit'));`, `pm.test('Responde en menos de 3 s', () => pm.expect(pm.response.responseTime).to.be.below(3000));`]) }),
    ]),
    carpeta('2 · Autenticación y roles', [
      login('CP-11 · Login válido (vendedor)', 'sellerEmail', 'sellerPassword', 'sellerToken'),
      login('Login válido (comprador)', 'buyerEmail', 'buyerPassword', 'buyerToken'),
      login('Login válido (administrador, solo web)', 'adminEmail', 'adminPassword', 'adminToken'),
      req('CP-12 · Login inválido 401', 'POST', '/auth/login', { body: '{"email":"{{sellerEmail}}","password":"clave-incorrecta-123"}', test: estado('', 401, [errorCode('UNAUTHORIZED')]) }),
      req('CP-13 · Ruta protegida sin token 401', 'GET', '/seller/products', { test: estado('', 401, [errorCode('UNAUTHORIZED')]) }),
      req('CP-15 · Comprador en ruta de vendedor 403', 'GET', '/seller/products', { token: 'buyerToken', test: estado('', 403, [errorCode('FORBIDDEN')]) }),
      req('CP-18 · Registro inválido 400', 'POST', '/auth/register', { body: '{"email":"no-es-correo","password":"123","firstName":"X","lastName":"Y"}', test: estado('', 400, [errorCode('BAD_REQUEST'), `pm.test('Detalle por campo', () => pm.expect(j.error.details).to.be.an('array').that.is.not.empty);`]) }),
      req('CP-21 · Admin desde la app móvil 403', 'POST', '/auth/login', { body: '{"email":"{{adminEmail}}","password":"{{adminPassword}}"}', test: estado('', 403, [errorCode('FORBIDDEN')]) }),
    ]),
    carpeta('3 · Publicación y catálogo', [
      req('Categorías (elige una hoja)', 'GET', '/products/categories', { test: estado('', 200, [`const hojas = (n) => n.flatMap((x) => (x.children && x.children.length ? hojas(x.children) : [x]));`, `const bar = j.data.filter((c) => c.slug === 'bar-y-bebidas'); pm.collectionVariables.set('categoryId', hojas(bar.length ? bar : j.data)[0].id);`]) }),
      req('CP-22 · Vendedor publica un producto 201', 'POST', '/seller/products', { token: 'sellerToken', body: '{"name":"Singani Rujero Doble Destilado 750 ml (prueba: publicar producto)","categoryId":{{categoryId}},"description":"Singani de altura de los valles de Tarija. Dato ficticio de la revisión.","condition":"NEW","price":150,"stock":5,"images":[{"url":"https://picsum.photos/seed/singani-tarija/800/800","isPrimary":true}]}', test: estado('', 201, [`pm.collectionVariables.set('productA', j.data.id);`]) }),
      req('CP-23 · Producto inválido 400', 'POST', '/seller/products', { token: 'sellerToken', body: '{"name":"ab","categoryId":{{categoryId}},"condition":"NEW","price":-5,"stock":1}', test: estado('', 400, [errorCode('BAD_REQUEST')]) }),
      req('CP-24 · Comprador no publica 403', 'POST', '/seller/products', { token: 'buyerToken', body: '{"name":"Chicha Morada Artesanal de Tarija (prueba: comprador sin permiso)","categoryId":{{categoryId}},"condition":"NEW","price":10,"stock":1}', test: estado('', 403, [errorCode('FORBIDDEN')]) }),
      req('CP-25 · Sin aprobar no se lista', 'GET', '/products', { query: 'search=Singani Rujero', test: estado('', 200, [`pm.test('El producto nuevo NO aparece', () => pm.expect(j.data.map((p) => p.id)).to.not.include(Number(pm.collectionVariables.get('productA'))));`]) }),
      req('Preparación · la moderación aprueba el producto', 'PUT', '/admin/products/{{productA}}/moderate', { token: 'adminToken', body: '{"approve":true}', test: estado('', 200) }),
      req('CP-28 · Aprobado aparece en el catálogo', 'GET', '/products', { query: 'search=Singani Rujero', test: estado('', 200, [`pm.test('El producto aparece', () => pm.expect(j.data.map((p) => p.id)).to.include(Number(pm.collectionVariables.get('productA'))));`]) }),
      req('CP-29 · Editar precio 200', 'PUT', '/seller/products/{{productA}}', { token: 'sellerToken', body: '{"price":175}', test: estado('', 200, [`pm.test('Precio 175', () => pm.expect(Number(j.data.price)).to.eql(175));`]) }),
      req('CP-30 · Comprador no edita 403', 'PUT', '/seller/products/{{productA}}', { token: 'buyerToken', body: '{"price":1}', test: estado('', 403, [errorCode('FORBIDDEN')]) }),
      req('CP-31 · Baja lógica 200', 'DELETE', '/seller/products/{{productA}}', { token: 'sellerToken', test: estado('', 200) }),
      req('CP-20 · Recurso inexistente 404', 'GET', '/products/999999999', { test: estado('', 404) }),
    ]),
    carpeta('4 · Carrito, pedido y pago QR', [
      req('CP-32a · Publica producto B 201', 'POST', '/seller/products', { token: 'sellerToken', body: '{"name":"Vino Tinto Reserva de Tarija 750 ml (prueba: flujo de compra)","categoryId":{{categoryId}},"description":"Vino tinto de los viñedos de Santa Ana, Tarija. Dato ficticio de la revisión.","condition":"NEW","price":99,"stock":3,"images":[{"url":"https://picsum.photos/seed/vino-tarija/800/800","isPrimary":true}]}', test: estado('', 201, [`pm.collectionVariables.set('productB', j.data.id);`]) }),
      req('Preparación · la moderación aprueba el producto B', 'PUT', '/admin/products/{{productB}}/moderate', { token: 'adminToken', body: '{"approve":true}', test: estado('', 200) }),
      req('Vaciar carrito', 'DELETE', '/cart', { token: 'buyerToken', test: [`pm.test('Carrito vaciado', () => pm.expect(pm.response.code).to.be.oneOf([200, 204]));`] }),
      req('CP-33 · Agregar al carrito 201', 'POST', '/cart/items', { token: 'buyerToken', body: '{"productId":{{productB}},"quantity":2}', test: estado('', 201) }),
      req('CP-34 · Cantidad negativa 400', 'POST', '/cart/items', { token: 'buyerToken', body: '{"productId":{{productB}},"quantity":-5}', test: estado('', 400, [errorCode('BAD_REQUEST')]) }),
      req('CP-35 · Stock insuficiente 400', 'POST', '/cart/items', { token: 'buyerToken', body: '{"productId":{{productB}},"quantity":50}', test: estado('', 400) }),
      req('CP-36 · Crear pedido 201', 'POST', '/orders', { token: 'buyerToken', body: '{"fulfillmentType":"PICKUP","pickupAddress":"Retiro en tienda: calle Bolívar esquina Sucre, Tarija","notes":"Pedido ficticio para entrega cerca de la plaza Luis de Fuentes, Tarija"}', test: estado('', 201, [`pm.collectionVariables.set('orderId', j.data[0].id);`, `pm.test('Estado PENDING y pago PENDING', () => { pm.expect(j.data[0].status).to.eql('PENDING'); pm.expect(j.data[0].paymentStatus).to.eql('PENDING'); });`]) }),
      req('CP-37 · Pedido con carrito vacío 400', 'POST', '/orders', { token: 'buyerToken', body: '{"fulfillmentType":"PICKUP","pickupAddress":"Retiro en tienda: calle Ingavi, Tarija"}', test: estado('', 400) }),
      req('CP-38 · Comprobante QR 200', 'POST', '/orders/{{orderId}}/payment-proof', { token: 'buyerToken', body: '{"proofUrl":"https://tiendaslacase.netlify.app/comprobante-revision.png"}', test: [guardaError, `pm.test('HTTP 200/201', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));`, `pm.test('Pago en PROOF_SUBMITTED', () => pm.expect(j.data.paymentStatus).to.eql('PROOF_SUBMITTED'));`] }),
      req('CP-39 · Comprobante javascript: 400', 'POST', '/orders/{{orderId}}/payment-proof', { token: 'buyerToken', body: '{"proofUrl":"javascript:alert(1)"}', test: estado('', 400) }),
    ]),
    carpeta('5 · Gestión del pedido por el vendedor', [
      req('CP-40 · El vendedor ve el pedido 200', 'GET', '/orders/seller', { token: 'sellerToken', test: estado('', 200, [`pm.test('Pedido presente', () => pm.expect(j.data.map((o) => o.id)).to.include(Number(pm.collectionVariables.get('orderId'))));`]) }),
      req('CP-41 · Comprador no cambia estado 403', 'PUT', '/orders/seller/{{orderId}}/status', { token: 'buyerToken', body: '{"status":"CONFIRMED"}', test: estado('', 403, [errorCode('FORBIDDEN')]) }),
      req('CP-42 · Estado fuera del dominio 400', 'PUT', '/orders/seller/{{orderId}}/status', { token: 'sellerToken', body: '{"status":"ENVIADO_A_MARTE"}', test: estado('', 400) }),
      req('CP-43 · Vendedor confirma 200', 'PUT', '/orders/seller/{{orderId}}/status', { token: 'sellerToken', body: '{"status":"CONFIRMED"}', test: estado('', 200, [`pm.test('Estado CONFIRMED', () => pm.expect(j.data.status).to.eql('CONFIRMED'));`]) }),
      req('CP-44 · Comprador ve CONFIRMED 200', 'GET', '/orders/buyer/{{orderId}}', { token: 'buyerToken', test: estado('', 200, [`pm.test('Estado CONFIRMED', () => pm.expect(j.data.status).to.eql('CONFIRMED'));`]) }),
    ]),
    carpeta('6 · Limpieza', [
      req('Cancelar el pedido de prueba', 'PUT', '/orders/seller/{{orderId}}/status', { token: 'sellerToken', body: '{"status":"CANCELLED"}', test: [`pm.test('Pedido cancelado', () => pm.expect(pm.response.code).to.eql(200));`] }),
      req('Baja del producto B', 'DELETE', '/seller/products/{{productB}}', { token: 'sellerToken', test: [`pm.test('Producto B dado de baja', () => pm.expect(pm.response.code).to.eql(200));`] }),
    ]),
  ],
};

// El login de admin con la cabecera móvil necesita el header; se agrega al caso CP-21.
const cp21 = coleccion.item[1].item.find((i) => i.name.startsWith('CP-21'));
cp21.request.header.push({ key: 'X-Client-App', value: 'mobile' });

// Las aserciones viven en scripts de CARPETA (la API de Postman no admite eventos en las solicitudes anidadas):
// cada carpeta elige el bloque de su solicitud por pm.info.requestName. Funciona igual en Postman y en Newman.
for (const carp of coleccion.item) {
  const tests = {};
  const pres = {};
  for (const it of carp.item) {
    for (const ev of it.event ?? []) (ev.listen === 'test' ? tests : pres)[it.name] = ev.script.exec.filter((l) => l !== guardaError);
    delete it.event;
    if (it.request && it.request.url && it.request.url.raw) it.request.url = it.request.url.raw; // Postman interpreta la URL cruda
    if (it.request && typeof it.request.url === 'string') {
      // Sin variables en las URLs: los IDs dinámicos se escriben como texto legible y un script previo los sustituye por el número real.
      it.request.url = it.request.url
        .split('{{productA}}').join('ID-PRODUCTO-A')
        .split('{{productB}}').join('ID-PRODUCTO-B')
        .split('{{orderId}}').join('ID-PEDIDO')
        .split(' {{stamp}}').join('');
    }
  }
  const NL = String.fromCharCode(10);
  const bloque = (mapa, conJson) => [...(conJson ? [guardaError] : []), 'const __m = {', ...Object.entries(mapa).map(([n, lineas]) => JSON.stringify(n) + ': () => {' + NL + lineas.join(NL) + NL + '},'), '};', '(__m[pm.info.requestName] || (() => {}))();'];
  carp.event = [];
  if (Object.keys(pres).length) carp.event.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: bloque(pres) } });
  if (Object.keys(tests).length) carp.event.push({ listen: 'test', script: { type: 'text/javascript', exec: bloque(tests, true) } });
}

const entorno = {
  name: 'LaCase · producción',
  values: [
    { key: 'sellerEmail', value: 'vendedor@lacase.test', type: 'default', enabled: true },
    { key: 'buyerEmail', value: 'comprador@lacase.test', type: 'default', enabled: true },
    { key: 'adminEmail', value: 'admin@lacase.test', type: 'default', enabled: true },
    { key: 'sellerPassword', value: '', type: 'secret', enabled: true },
    { key: 'buyerPassword', value: '', type: 'secret', enabled: true },
    { key: 'adminPassword', value: '', type: 'secret', enabled: true },
  ],
  _postman_variable_scope: 'environment',
};

// Las solicitudes solo observan entradas y salidas de la versión publicada: son pruebas de CAJA NEGRA. Se agrupan en una carpeta raíz con sus siete subcarpetas.
const subcarpetas = coleccion.item;
const n = subcarpetas.reduce((a, c) => a + c.item.length, 0);
coleccion.item = [{ name: 'Caja negra · API en producción', description: 'Pruebas funcionales, de autenticación y de validación de la API publicada: solo observan entradas y salidas. Las pruebas de caja blanca (Jest) están en backend/tests.', item: subcarpetas }];
fs.writeFileSync(path.join(dir, 'LaCase-E3.postman_collection.json'), JSON.stringify(coleccion, null, 2), 'utf8');
fs.writeFileSync(path.join(dir, 'LaCase-produccion.postman_environment.json'), JSON.stringify(entorno, null, 2), 'utf8');
console.log(`Colección generada: ${n} solicitudes en ${subcarpetas.length} subcarpetas dentro de «${coleccion.item[0].name}».`);
