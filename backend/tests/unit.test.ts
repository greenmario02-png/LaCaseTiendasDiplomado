import { calculateShipping } from '../src/utils/shipping';
import { parsePagination } from '../src/utils/pagination';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken } from '../src/utils/jwt';
import { ApiError } from '../src/utils/errors';

describe('Unit — calculateShipping', () => {
  it('misma zona (CP cercanos) = envío barato', () => {
    expect(calculateShipping('1000', '1004')).toBe(15);
  });

  it('zona cercana = envío medio', () => {
    expect(calculateShipping('1000', '1400')).toBe(25);
  });

  it('provincia media = envío 40', () => {
    expect(calculateShipping('1000', '2000')).toBe(40);
  });

  it('provincia lejana = envío caro', () => {
    expect(calculateShipping('1000', '8300')).toBe(60);
  });

  it('CP inválido = default 25', () => {
    expect(calculateShipping('abc', '1000')).toBe(25);
  });

  it('CP faltante = default 25', () => {
    expect(calculateShipping(undefined, '1000')).toBe(25);
    expect(calculateShipping('1000', null)).toBe(25);
  });

  it('es simétrico', () => {
    expect(calculateShipping('1000', '8300')).toBe(calculateShipping('8300', '1000'));
  });
});

describe('Unit — parsePagination', () => {
  it('defaults: page 1, limit 20', () => {
    const p = parsePagination({});
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
    expect(p.skip).toBe(0);
  });

  it('parsea page y limit', () => {
    const p = parsePagination({ page: '3', limit: '50' });
    expect(p.page).toBe(3);
    expect(p.limit).toBe(50);
    expect(p.skip).toBe(100);
  });

  it('limita a max 100', () => {
    const p = parsePagination({ limit: '9999' });
    expect(p.limit).toBe(100);
  });

  it('nunca deja page < 1', () => {
    const p = parsePagination({ page: '0' });
    expect(p.page).toBe(1);
  });

  it('detecta cursor', () => {
    const p = parsePagination({ cursor: '25' });
    expect(p.cursor).toBe(25);
  });
});

describe('Unit — JWT utils', () => {
  it('firma y verifica access token con payload', () => {
    const token = signAccessToken({ userId: 1, role: 'CUSTOMER' });
    const payload = verifyAccessToken(token);
    expect(payload.userId).toBe(1);
    expect(payload.role).toBe('CUSTOMER');
  });

  it('firma y verifica refresh token', () => {
    const token = signRefreshToken(42);
    const payload = verifyRefreshToken(token);
    expect(payload.userId).toBe(42);
  });

  it('hashToken produce sha256 hex de 64 chars', () => {
    const hash = hashToken('refresh-token-value');
    expect(hash).toHaveLength(64);
    expect(hashToken('refresh-token-value')).toBe(hash);
  });
});

describe('Unit — ApiError', () => {
  it('badRequest: 400 BAD_REQUEST', () => {
    const err = ApiError.badRequest('mensaje');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
  });

  it('unauthorized: 401', () => {
    expect(ApiError.unauthorized().statusCode).toBe(401);
  });

  it('forbidden: 403', () => {
    expect(ApiError.forbidden().statusCode).toBe(403);
  });

  it('notFound: 404', () => {
    expect(ApiError.notFound().statusCode).toBe(404);
  });

  it('conflict: 409', () => {
    expect(ApiError.conflict('dup').statusCode).toBe(409);
  });
});
