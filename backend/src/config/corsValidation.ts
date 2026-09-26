/**
 * En producción, CORS_ORIGIN debe listar solo orígenes reales: nunca '*' ni localhost/loopback.
 * Devuelve la lista de problemas (vacía si es válida).
 */
export function findInsecureCorsOrigins(origins: string[], nodeEnv: string): string[] {
  if (nodeEnv !== 'production') return [];
  return origins.filter((o) => {
    const v = o.trim().toLowerCase();
    if (v.includes('*')) return true;
    let host = v;
    try {
      host = new URL(v).hostname.replace(/^\[|\]$/g, '');
    } catch {
      // no es una URL válida: se evalúa el texto completo
    }
    return host === 'localhost' || host.endsWith('.localhost') || host === '::1' || host === '0.0.0.0' || /^127\./.test(host) || host.includes('localhost');
  });
}

export function assertSecureCorsConfig(origins: string[], nodeEnv: string): void {
  const bad = findInsecureCorsOrigins(origins, nodeEnv);
  if (bad.length > 0) {
    throw new Error(`CORS_ORIGIN inválido en producción (no se permite '*' ni localhost): ${bad.join(', ')}`);
  }
}
