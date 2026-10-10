/// <reference types="cypress" />
import { Caso, iniciarCaso, cerrarCaso } from './evidencia';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      caso(c: Caso): Chainable<void>;
    }
  }
}

Cypress.Commands.add('caso', (c: Caso) => {
  iniciarCaso(c);
});

afterEach(function () {
  const t = this.currentTest;
  if (!t) return;
  const estado = (t as { state?: string }).state;
  cerrarCaso(estado === 'passed' ? 'Aprobado' : estado === 'pending' ? 'No aplica en este entorno' : 'Fallido', t.err?.message, t.title);
});
