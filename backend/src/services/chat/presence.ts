import { prisma } from '../../config/database';

/**
 * Presencia del chat: "en linea" se sabe en memoria por los sockets abiertos; "ultima vez" se guarda
 * al cerrarse el ultimo socket del usuario. Privacidad reciproca como en WhatsApp: si una persona oculta su ultima vez,
 * nadie la ve y ella tampoco ve la de los demas. Sin servicios externos.
 */
const sockets = new Map<number, number>();

export function markConnected(userId: number): boolean {
  const n = (sockets.get(userId) ?? 0) + 1;
  sockets.set(userId, n);
  return n === 1;
}

/** Devuelve true si el usuario quedo sin sockets (paso a "desconectado"). */
export function markDisconnected(userId: number): boolean {
  const n = (sockets.get(userId) ?? 1) - 1;
  if (n <= 0) {
    sockets.delete(userId);
    return true;
  }
  sockets.set(userId, n);
  return false;
}

export function isOnline(userId: number): boolean {
  return (sockets.get(userId) ?? 0) > 0;
}

export async function recordLastSeen(userId: number, at = new Date()): Promise<void> {
  await prisma.chatUserSetting.upsert({
    where: { userId },
    create: { userId, lastSeenAt: at },
    update: { lastSeenAt: at },
  });
}

export async function hidesLastSeen(userId: number): Promise<boolean> {
  const s = await prisma.chatUserSetting.findUnique({ where: { userId }, select: { hideLastSeen: true } });
  return !!s?.hideLastSeen;
}

export interface PresenceDto {
  /** false: alguno de los dos oculta su presencia; entonces no se informa nada. */
  visible: boolean;
  online: boolean;
  lastSeenAt: string | null;
}

export async function presenceFor(viewerId: number, otherId: number): Promise<PresenceDto> {
  const rows = await prisma.chatUserSetting.findMany({ where: { userId: { in: [viewerId, otherId] } } });
  const mine = rows.find((r) => r.userId === viewerId);
  const theirs = rows.find((r) => r.userId === otherId);
  if (mine?.hideLastSeen || theirs?.hideLastSeen) return { visible: false, online: false, lastSeenAt: null };
  const online = isOnline(otherId);
  return { visible: true, online, lastSeenAt: online ? null : theirs?.lastSeenAt?.toISOString() ?? null };
}

/** Solo para pruebas. */
export function __resetPresence() {
  sockets.clear();
}
