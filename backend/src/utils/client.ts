import { Request } from 'express';

/** Cabecera que envía la aplicación móvil en cada petición (ver mobile/src/services/api.ts). */
export const CLIENT_HEADER = 'x-client-app';

export const ADMIN_WEB_ONLY_MESSAGE = 'La administración solo está disponible en la versión web';

export function isMobileClient(req: Pick<Request, 'headers'>): boolean {
  return String(req.headers[CLIENT_HEADER] ?? '').toLowerCase() === 'mobile';
}
