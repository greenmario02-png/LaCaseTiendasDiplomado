/**
 * Pruebas de CAJA BLANCA · unitarias: funciones con reglas de negocio probadas con conocimiento del código fuente
 * (envío y totales, paginación, tokens, incremento de subastas, distancias). No usan red ni base de datos, por eso este
 * archivo no ejecuta el globalSetup (que recrea el esquema de la base de pruebas): se pueden correr en cualquier equipo.
 *   npm run test:unitarias
 * Las pruebas de integración de caja blanca (Supertest + base de pruebas) usan jest.config.js: npm test
 */
const base = require('./jest.config.js');

module.exports = {
  ...base,
  globalSetup: undefined,
  testMatch: ['**/unit.test.ts', '**/auction-unit.test.ts', '**/geo.service.test.ts'],
};
