/**
 * Modismos bolivianos por región para el chat con vendedores.
 * Cada región tiene:
 * - icebreakers: 3-4 oraciones sugeridas para INICIAR la conversación con el vendedor.
 * - noSaleReplies: respuestas pre-programadas sugeridas cuando NO se concreta la venta.
 * - followUps: frases de seguimiento sugeridas cuando hay inactividad en la conversación.
 */

export interface RegionModismos {
  region: string;
  aliases: string[]; // ciudades/zonas que pertenecen a esta región
  icebreakers: string[];
  noSaleReplies: string[];
  followUps: string[];
}

export const BOLIVIANISMOS: RegionModismos[] = [
  {
    region: 'La Paz',
    aliases: ['la paz', 'el alto', 'viacha', 'achocalla'],
    icebreakers: [
      'Hola case, ¿está disponible?',
      '¿Cuánto last case?',
      '¿No me hace rebaja case?',
      '¿Me lo puede guardar hasta mañana?',
    ],
    noSaleReplies: [
      'Voy a dar una vuelta primero, case',
      'Cuando vuelva me lo llevo, pues',
      'Lo estoy pensando nomás, ya te aviso',
      'Déjame ver, ¿me hace rebaja?',
    ],
    followUps: [
      '¿Sigue ahí, case? ¿Me lo guarda?',
      '¿Qué dice, se lo lleva?',
      '¿Todavía está en venta?',
    ],
  },
  {
    region: 'Santa Cruz',
    aliases: ['santa cruz', 'montero', 'warnes', 'cotoca'],
    icebreakers: [
      'Hola mi chiqui, ¿está disponible?',
      '¿Cuánto me lo deja?',
      '¿Me hace un precio?',
      '¿Puedo pasar a verlo hoy?',
    ],
    noSaleReplies: [
      'Voy a dar una vuelta primero, mi chiqui',
      'Cuando vuelva me lo llevo, ya po',
      'Lo estoy pensando, prefiero ver otras opciones',
      '¿Me hace precio por llevármelo ya?',
    ],
    followUps: [
      '¿Me lo guarda hasta el fin de semana?',
      '¿Sigue disponible? Lo estaba pensando',
      '¿Último precio?',
    ],
  },
  {
    region: 'Cochabamba',
    aliases: ['cochabamba', 'quillacollo', 'sacaba', 'vinto'],
    icebreakers: [
      'Pana, ¿está disponible?',
      '¿Cuánto es lo último?',
      '¿Me hace rebaja, pana?',
      '¿Está en oferta?',
    ],
    noSaleReplies: [
      'Voy a dar una vuelta primero, pana',
      'Cuando vuelva me lo llevo',
      'Lo estoy pensando, mañana te confirmo',
      '¿Cuál sería su mejor precio?',
    ],
    followUps: [
      '¿Sigue ahí, pana?',
      '¿Me lo puede separar?',
      '¿Cuánto me lo deja de contado?',
    ],
  },
  {
    region: 'Tarija',
    aliases: ['tarija', 'bermejo', 'yacuiba', 'villa montes'],
    icebreakers: [
      'Che, ¿está disponible?',
      '¿Cuánto me lo deja, pues?',
      '¿No me hace rebaja?',
      '¿Vendría bien pasarlo a buscar?',
    ],
    noSaleReplies: [
      'Voy a dar una vuelta primero, che',
      'Cuando vuelva me lo llevo, pues',
      'Lo estoy pensando, ya te aviso',
      '¿Me hace precio por el pago en efectivo?',
    ],
    followUps: [
      '¿Sigue ahí, che?',
      '¿Me lo guarda hasta el finde?',
      '¿Último precio, pues?',
    ],
  },
  {
    region: 'Chuquisaca',
    aliases: ['sucre', 'yotala'],
    icebreakers: [
      'Hola, ¿está disponible?',
      '¿Cuánto me lo vende?',
      '¿Me hace una rebajita?',
      '¿Me lo puede apartar?',
    ],
    noSaleReplies: [
      'Voy a dar una vuelta primero',
      'Cuando vuelva me lo llevo',
      'Lo estoy pensando, gracias',
      '¿Me deja pensarlo hasta mañana?',
    ],
    followUps: [
      '¿Sigue disponible?',
      '¿Me lo puede guardar?',
      '¿Cuál es el precio final?',
    ],
  },
  {
    region: 'Potosí',
    aliases: ['potosí', 'potosi', 'uyuni', 'villazón'],
    icebreakers: [
      'Hola, ¿está disponible?',
      '¿Cuánto me lo deja?',
      '¿No me hace rebaja?',
      '¿Me lo guarda unos días?',
    ],
    noSaleReplies: [
      'Voy a dar una vuelta primero',
      'Cuando vuelva me lo llevo',
      'Lo estoy pensando nomás',
      '¿Cuál sería su precio final?',
    ],
    followUps: [
      '¿Sigue en venta?',
      '¿Me lo aparta?',
      '¿Último precio?',
    ],
  },
  {
    region: 'Oruro',
    aliases: ['oruro', 'caracollo'],
    icebreakers: [
      'Hola, ¿está disponible?',
      '¿Cuánto me lo vende?',
      '¿Me hace una rebajita?',
      '¿Me lo puede reservar?',
    ],
    noSaleReplies: [
      'Voy a dar una vuelta primero',
      'Cuando vuelva me lo llevo',
      'Lo estoy pensando, ya te aviso',
      '¿Me hace precio por llevarlo?',
    ],
    followUps: [
      '¿Sigue ahí?',
      '¿Me lo guarda?',
      '¿Cuál es su mejor precio?',
    ],
  },
  {
    region: 'Beni',
    aliases: ['trinidad', 'riberalta', 'guayaramerín', 'beni'],
    icebreakers: [
      'Hola, ¿está disponible?',
      '¿Cuánto me lo deja?',
      '¿Me hace un precio?',
      '¿Puede enviar hasta Trinidad?',
    ],
    noSaleReplies: [
      'Voy a dar una vuelta primero',
      'Cuando vuelva me lo llevo',
      'Lo estoy pensando, gracias',
      '¿Me lo puede enviar?',
    ],
    followUps: [
      '¿Sigue disponible?',
      '¿Me lo aparta?',
      '¿Cuánto sale el envío?',
    ],
  },
  {
    region: 'Pando',
    aliases: ['cobija', 'pando'],
    icebreakers: [
      'Hola, ¿está disponible?',
      '¿Cuánto me lo vende?',
      '¿Me hace rebaja?',
      '¿Envía hasta Cobija?',
    ],
    noSaleReplies: [
      'Voy a dar una vuelta primero',
      'Cuando vuelva me lo llevo',
      'Lo estoy pensando, gracias',
      '¿Cuánto sería con envío?',
    ],
    followUps: [
      '¿Sigue en venta?',
      '¿Me lo guarda?',
      '¿El envío cuánto sale?',
    ],
  },
  {
    region: 'General',
    aliases: ['bolivia', 'general', 'otro'],
    icebreakers: [
      'Hola, ¿está disponible?',
      '¿Cuánto es el precio final?',
      '¿Me puede hacer una rebaja?',
      '¿En cuánto tiempo me lo entrega?',
    ],
    noSaleReplies: [
      'Voy a dar una vuelta primero',
      'Cuando vuelva me lo llevo',
      'Lo estoy pensando, ya te aviso',
      'Prefiero comparar precios primero',
    ],
    followUps: [
      '¿Sigue disponible?',
      '¿Me lo puede reservar?',
      '¿Cuál es el último precio?',
    ],
  },
];

/** Detecta la región a partir de una ciudad/string libre (minúsculas sin tildes). */
export function detectRegion(city?: string | null): RegionModismos {
  const cityNorm = (city ?? '').toLowerCase().trim();
  if (!cityNorm) return BOLIVIANISMOS[BOLIVIANISMOS.length - 1];
  const found = BOLIVIANISMOS.find((r) => r.aliases.some((a) => cityNorm.includes(a)));
  return found ?? BOLIVIANISMOS[BOLIVIANISMOS.length - 1];
}

/** 3-4 oraciones para iniciar la conversación según la región. */
export function getIcebreakers(city?: string | null): string[] {
  return detectRegion(city).icebreakers.slice(0, 4);
}

/** Respuestas pre-programadas cuando NO se concreta la venta. */
export function getNoSaleReplies(city?: string | null): string[] {
  return detectRegion(city).noSaleReplies;
}

/** Frases de seguimiento sugeridas cuando hay inactividad. */
export function getFollowUps(city?: string | null): string[] {
  return detectRegion(city).followUps;
}

export function getRegionName(city?: string | null): string {
  return detectRegion(city).region;
}
