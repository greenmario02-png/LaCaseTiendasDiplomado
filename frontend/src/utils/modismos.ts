import { useEffect } from 'react';
import { useForumStore } from '../stores/forumStore';

/** Textos base (español neutro) de las etiquetas que admiten variante regional. */
const BASE: Record<string, string> = {
  'comments.credibility.fake': 'Está mamando',
  'cono.vote.positive': 'Positivo',
  'cono.vote.negative': 'Nica',
  'cono.tournament.vote': 'Votar',
};

/** Modismos por departamento del usuario (ForumGeoSession.department); "default" aplica a toda Bolivia. */
const MODISMOS: Record<string, Record<string, string>> = {
  default: { 'comments.credibility.fake': 'Está mamando', 'cono.vote.negative': 'Nica' },
  'La Paz': { 'comments.credibility.fake': '¿A casooo?', 'cono.vote.negative': 'Nica' },
  'Santa Cruz': { 'comments.credibility.fake': 'Es cuento no más', 'cono.vote.negative': 'Nica' },
  Cochabamba: { 'comments.credibility.fake': 'No seas taleguero', 'cono.vote.negative': 'Nica' },
};

export function resolveModismo(key: string, department?: string | null): string {
  const byDept = (department && MODISMOS[department]) || MODISMOS.default;
  return byDept[key] ?? BASE[key] ?? key;
}

/** Devuelve la etiqueta con el modismo de la zona configurada por el usuario en el foro. */
export function useModismo(key: string): string {
  const geo = useForumStore((s) => s.geo);
  const geoLoaded = useForumStore((s) => s.geoLoaded);
  const fetchGeoSession = useForumStore((s) => s.fetchGeoSession);
  useEffect(() => {
    if (!geoLoaded) fetchGeoSession();
  }, [geoLoaded, fetchGeoSession]);
  return resolveModismo(key, geo?.department);
}
