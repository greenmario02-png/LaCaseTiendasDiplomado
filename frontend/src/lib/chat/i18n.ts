import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import es from '../../locales/chat/es.json';
import { relativeDay } from './chatModel';

const dateLocale = () => 'es-BO';

/**
 * Chat mejorado (chat mejorado): textos en el espacio de nombres propio `chatx` (solo es; los demas idiomas caen a
 * espanol por fallbackLng), para no tocar los JSON principales.
 */
export const CHAT_NS = 'chatx';
i18n.addResourceBundle('es', CHAT_NS, es, true, true);

export type CFn = (key: string, vars?: Record<string, unknown>) => string;

export function useC(): CFn {
  const { t } = useTranslation(CHAT_NS);
  return useCallback<CFn>((key, vars) => (t as unknown as (k: string, o?: Record<string, unknown>) => string)(key, vars), [t]);
}

export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });

/** Hora corta para la lista: hoy HH:mm, ayer "Ayer", si no dd/mm. */
export function listTime(iso: string, c: CFn, now = new Date()): string {
  const rel = relativeDay(iso, now);
  if (rel === 'today') return timeOf(iso);
  if (rel === 'yesterday') return c('yesterday');
  return new Date(iso).toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit' });
}

export function dayLabel(iso: string, c: CFn, now = new Date()): string {
  const rel = relativeDay(iso, now);
  if (rel) return c(rel);
  return new Date(iso).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function presenceLabel(p: { visible: boolean; online: boolean; lastSeenAt: string | null } | null, c: CFn, now = new Date()): string | null {
  if (!p?.visible) return null;
  if (p.online) return c('online');
  if (!p.lastSeenAt) return null;
  const rel = relativeDay(p.lastSeenAt, now);
  if (rel === 'today') return c('lastSeenToday', { time: timeOf(p.lastSeenAt) });
  if (rel === 'yesterday') return c('lastSeenYesterday', { time: timeOf(p.lastSeenAt) });
  return c('lastSeenDate', { date: new Date(p.lastSeenAt).toLocaleDateString(dateLocale(), { day: '2-digit', month: '2-digit' }) });
}

/** Texto corto de un mensaje para la lista y las citas. */
export function previewOf(m: { kind?: string; content?: string; deleted?: boolean; meta?: { event?: string; orderId?: number | null; status?: string | null } | null }, c: CFn): string {
  if (m.deleted) return c('deleted');
  const kind = m.kind ?? 'TEXT';
  if (kind === 'TEXT') return m.content ?? '';
  if (kind === 'SYSTEM') return systemText(m.meta, m.content ?? '', c);
  const caption = (m.content ?? '').trim();
  const label = c(`kind.${kind}`);
  return caption && (kind === 'IMAGE' || kind === 'FILE') ? `${label}: ${caption}` : label;
}

export function systemText(meta: { event?: string; orderId?: number | null; status?: string | null } | null | undefined, fallback: string, c: CFn): string {
  const ev = meta?.event;
  if (!ev) return fallback;
  const status = meta?.status ? c(`order.status.${meta.status}`) : '';
  const txt = c(`system.${ev}`, { id: meta?.orderId ?? '', status, defaultValue: '' });
  return txt || fallback;
}
