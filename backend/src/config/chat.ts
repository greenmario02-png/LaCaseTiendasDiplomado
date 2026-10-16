import path from 'path';

/**
 * Chat. Limites leidos de process.env en cada llamada (se pueden ajustar sin recompilar y probar).
 * No hay flag: el chat ya existia; estas funciones solo lo amplian.
 */
const envInt = (name: string, def: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
};

export const CHAT_FILES_DIR = path.resolve(__dirname, '..', '..', 'private-uploads', 'chat');

export const chatLimits = {
  /** Imagen ya comprimida en el cliente; el servidor no recomprime. */
  maxImageBytes: () => envInt('CHAT_MAX_IMAGE_BYTES', 4 * 1024 * 1024),
  maxPdfBytes: () => envInt('CHAT_MAX_PDF_BYTES', 3 * 1024 * 1024),
  /** Lado maximo y megapixeles: evita "bombas" de descompresion para quien abre la imagen. */
  maxImageSide: () => envInt('CHAT_MAX_IMAGE_SIDE', 8000),
  maxImagePixels: () => envInt('CHAT_MAX_IMAGE_PIXELS', 40_000_000),
  /** Ventana para "eliminar para todos" (minutos). */
  deleteForAllMinutes: () => envInt('CHAT_DELETE_FOR_ALL_MINUTES', 60),
  /** Limites de tasa por usuario (por minuto, salvo indicacion). */
  messagesPerMinute: () => envInt('CHAT_MESSAGES_PER_MINUTE', 40),
  uploadsPerMinute: () => envInt('CHAT_UPLOADS_PER_MINUTE', 10),
  uploadsPerDay: () => envInt('CHAT_UPLOADS_PER_DAY', 150),
  reportsPerDay: () => envInt('CHAT_REPORTS_PER_DAY', 10),
  pageSize: () => envInt('CHAT_PAGE_SIZE', 30),
  /** Duracion de las URL firmadas de adjuntos (se redondea a la hora para que el navegador reutilice la cache). */
  fileUrlTtlMs: () => envInt('CHAT_FILE_URL_TTL_MIN', 60) * 60_000,
};
