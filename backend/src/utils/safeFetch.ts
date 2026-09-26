import dns from 'dns';
import net from 'net';

/** Protección SSRF para el proxy de imágenes: solo http/https y solo IPs públicas. */

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    // IPv4 mapeada (::ffff:a.b.c.d o ::ffff:7f00:1)
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    if (v.startsWith('::ffff:')) return true;
    if (v.startsWith('fc') || v.startsWith('fd')) return true; // ULA fc00::/7
    if (/^fe[89ab]/.test(v)) return true; // link-local fe80::/10
    return false;
  }
  if (!net.isIPv4(ip)) return true;
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local / metadata cloud
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast y reservadas
  );
}

/** Bloqueo por nombre de host o IP literal (sin resolver DNS). */
export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (net.isIP(h)) return isPrivateIp(h);
  return false;
}

/** Valida la URL: protocolo http/https, sin credenciales, host no bloqueado y DNS resuelto a IPs públicas. */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('URL inválida');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Protocolo no permitido');
  if (url.username || url.password) throw new Error('URL con credenciales no permitida');
  if (isBlockedHostname(url.hostname)) throw new Error('Host no permitido');
  if (!net.isIP(url.hostname.replace(/^\[|\]$/g, ''))) {
    const addrs = await dns.promises.lookup(url.hostname, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) throw new Error('Host no permitido');
  }
  return url;
}

export const IMAGE_PROXY_MAX_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;

/** Descarga una imagen pública validando cada salto de redirección, con timeout y tope de tamaño. */
export async function fetchPublicImage(
  raw: string,
  opts: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<{ buffer: Buffer; contentType: string }> {
  const timeoutMs = opts.timeoutMs ?? 10000;
  const maxBytes = opts.maxBytes ?? IMAGE_PROXY_MAX_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = raw;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = await assertPublicHttpUrl(current);
      const res = await fetch(url, { redirect: 'manual', signal: controller.signal });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        current = new URL(res.headers.get('location')!, url).toString();
        continue;
      }
      if (!res.ok) throw new Error('Respuesta no exitosa');
      const contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      // SVG excluido: puede contener scripts
      if (!contentType.startsWith('image/') || contentType === 'image/svg+xml') throw new Error('El recurso no es una imagen permitida');
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > maxBytes) throw new Error('Imagen demasiado grande');
      const chunks: Buffer[] = [];
      let size = 0;
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Respuesta vacía');
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
          controller.abort();
          throw new Error('Imagen demasiado grande');
        }
        chunks.push(Buffer.from(value));
      }
      return { buffer: Buffer.concat(chunks), contentType };
    }
    throw new Error('Demasiadas redirecciones');
  } finally {
    clearTimeout(timer);
  }
}
