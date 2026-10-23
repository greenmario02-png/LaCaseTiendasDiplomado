/**
 * Modismos bolivianos por región para el chat con vendedores.
 * Cada región tiene dos variantes según el rol de quien ve el chat EN ESA conversación:
 * - Comprador (campos originales, sin prefijo): frases para INICIAR la conversación con el
 *   vendedor, respuestas cuando NO se concreta la venta, y seguimientos por inactividad.
 * - Vendedor (campos `seller*`): frases para responder a un interesado -- saludo confirmando
 *   disponibilidad, respuesta amable cuando no hay stock, y seguimientos (envío, forma de pago).
 * Mismo tono cálido/regional en ambas variantes.
 */

export interface RegionModismos {
  region: string;
  aliases: string[]; // ciudades/zonas que pertenecen a esta región
  icebreakers: string[];
  noSaleReplies: string[];
  followUps: string[];
  sellerIcebreakers: string[];
  sellerNoSaleReplies: string[];
  sellerFollowUps: string[];
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
    sellerIcebreakers: [
      '¡Hola case! Sí, está disponible',
      '¿En qué le puedo ayudar, case?',
      'Todavía lo tengo, case, ¿le interesa?',
      'Dígame qué necesita, case, y le ayudo',
    ],
    sellerNoSaleReplies: [
      'Uy, ya se vendió ese, case, disculpe',
      'Por ahora no tengo stock, case, pero le aviso cuando llegue',
      'Ya no queda, case, pero tengo otros parecidos',
      'Lo siento case, ya no hay, pero puedo conseguirle otro',
    ],
    sellerFollowUps: [
      '¿Seguimos con el pedido, case?',
      '¿Cómo le va a pagar, case, QR o efectivo?',
      '¿Le envío o pasa a recogerlo, case?',
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
    sellerIcebreakers: [
      '¡Hola mi chiqui! Sí, está disponible',
      '¿En qué le ayudo, mi chiqui?',
      'Todavía lo tengo, mi chiqui, ¿le interesa?',
      'Cuénteme qué busca, mi chiqui',
    ],
    sellerNoSaleReplies: [
      'Uy, ya se vendió ese, mi chiqui, disculpe',
      'Por ahora no tengo stock, mi chiqui, pero le aviso cuando llegue',
      'Ya no queda, mi chiqui, pero tengo otros parecidos',
      'Lo siento mi chiqui, ya no hay',
    ],
    sellerFollowUps: [
      '¿Seguimos con el pedido, mi chiqui?',
      '¿Cómo prefiere pagar, QR o efectivo?',
      '¿Le mando a domicilio o pasa a verlo?',
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
    sellerIcebreakers: [
      '¡Hola pana! Sí, está disponible',
      '¿En qué le ayudo, pana?',
      'Todavía lo tengo, pana, ¿le interesa?',
      'Dígame qué necesita, pana',
    ],
    sellerNoSaleReplies: [
      'Uy, ya se vendió ese, pana, disculpe',
      'Por ahora no tengo stock, pana, pero le aviso cuando llegue',
      'Ya no queda, pana, pero tengo otros parecidos',
      'Lo siento pana, ya no hay',
    ],
    sellerFollowUps: [
      '¿Seguimos con el pedido, pana?',
      '¿Cómo le va a pagar, pana?',
      '¿Le envío o pasa a recogerlo?',
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
    sellerIcebreakers: [
      '¡Hola che! Sí, está disponible',
      '¿En qué le ayudo, che?',
      'Todavía lo tengo, che, ¿le interesa?',
      'Dígame qué necesita, che',
    ],
    sellerNoSaleReplies: [
      'Uy, ya se vendió ese, che, disculpe',
      'Por ahora no tengo stock, che, pero le aviso cuando llegue',
      'Ya no queda, che, pero tengo otros parecidos',
      'Lo siento che, ya no hay',
    ],
    sellerFollowUps: [
      '¿Seguimos con el pedido, che?',
      '¿Cómo le va a pagar, che?',
      '¿Le envío o pasa a recogerlo?',
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
    sellerIcebreakers: [
      '¡Hola! Sí, está disponible',
      '¿En qué le puedo ayudar?',
      'Todavía lo tengo, ¿le interesa?',
      'Cuénteme qué necesita',
    ],
    sellerNoSaleReplies: [
      'Uy, ya se vendió ese, disculpe',
      'Por ahora no tengo stock, pero le aviso cuando llegue',
      'Ya no queda, pero tengo otros parecidos',
      'Lo siento, ya no hay disponible',
    ],
    sellerFollowUps: [
      '¿Seguimos con el pedido?',
      '¿Cómo prefiere pagar?',
      '¿Le envío o pasa a recogerlo?',
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
    sellerIcebreakers: [
      '¡Hola! Sí, está disponible nomás',
      '¿En qué le puedo ayudar?',
      'Todavía lo tengo, ¿le interesa?',
      'Dígame qué necesita nomás',
    ],
    sellerNoSaleReplies: [
      'Uy, ya se vendió ese nomás, disculpe',
      'Por ahora no tengo stock, pero le aviso cuando llegue',
      'Ya no queda nomás, pero tengo otros parecidos',
      'Lo siento, ya no hay',
    ],
    sellerFollowUps: [
      '¿Seguimos con el pedido?',
      '¿Cómo le va a pagar?',
      '¿Le envío o pasa a recogerlo nomás?',
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
    sellerIcebreakers: [
      '¡Hola! Sí, está disponible',
      '¿En qué le ayudo?',
      'Todavía lo tengo, ¿le interesa?',
      'Cuénteme qué busca',
    ],
    sellerNoSaleReplies: [
      'Uy, ya se vendió ese, disculpe',
      'Por ahora no tengo stock, pero le aviso cuando llegue',
      'Ya no queda, pero tengo otros parecidos',
      'Lo siento, ya no hay',
    ],
    sellerFollowUps: [
      '¿Seguimos con el pedido?',
      '¿Cómo prefiere pagar?',
      '¿Le envío o pasa a recogerlo?',
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
    sellerIcebreakers: [
      '¡Hola! Sí, está disponible',
      '¿En qué le ayudo?',
      'Todavía lo tengo, ¿le interesa?',
      'Sí, hago envío hasta Trinidad',
    ],
    sellerNoSaleReplies: [
      'Uy, ya se vendió ese, disculpe',
      'Por ahora no tengo stock, pero le aviso cuando llegue',
      'Ya no queda, pero tengo otros parecidos',
      'Lo siento, ya no hay',
    ],
    sellerFollowUps: [
      '¿Seguimos con el pedido?',
      '¿Cómo le va a pagar?',
      '¿Le envío a Trinidad o pasa a recogerlo?',
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
    sellerIcebreakers: [
      '¡Hola! Sí, está disponible',
      '¿En qué le ayudo?',
      'Todavía lo tengo, ¿le interesa?',
      'Sí, envío hasta Cobija',
    ],
    sellerNoSaleReplies: [
      'Uy, ya se vendió ese, disculpe',
      'Por ahora no tengo stock, pero le aviso cuando llegue',
      'Ya no queda, pero tengo otros parecidos',
      'Lo siento, ya no hay',
    ],
    sellerFollowUps: [
      '¿Seguimos con el pedido?',
      '¿Cómo le va a pagar?',
      '¿Le envío a Cobija o pasa a recogerlo?',
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
    sellerIcebreakers: [
      '¡Hola! Sí, está disponible',
      '¿En qué le puedo ayudar?',
      'Todavía lo tengo, ¿le interesa?',
      'Cuénteme qué necesita',
    ],
    sellerNoSaleReplies: [
      'Uy, ya se vendió ese, disculpe',
      'Por ahora no tengo stock, pero le aviso cuando llegue',
      'Ya no queda, pero tengo otros parecidos',
      'Lo siento, ya no hay disponible',
    ],
    sellerFollowUps: [
      '¿Seguimos con el pedido?',
      '¿Cómo prefiere pagar?',
      '¿Le envío o pasa a recogerlo?',
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

/**
 * 3-4 oraciones para iniciar/responder la conversación según la región.
 * `isBuyer` es el rol de quien va a usar la frase EN ESA conversación puntual (default true,
 * comprador, para no romper a quien ya llamaba esta función sin el parámetro).
 */
export function getIcebreakers(city?: string | null, isBuyer = true): string[] {
  const r = detectRegion(city);
  return (isBuyer ? r.icebreakers : r.sellerIcebreakers).slice(0, 4);
}

/** Respuestas pre-programadas cuando NO se concreta la venta (comprador) o no hay stock (vendedor). */
export function getNoSaleReplies(city?: string | null, isBuyer = true): string[] {
  const r = detectRegion(city);
  return isBuyer ? r.noSaleReplies : r.sellerNoSaleReplies;
}

/** Frases de seguimiento sugeridas cuando hay inactividad. */
export function getFollowUps(city?: string | null, isBuyer = true): string[] {
  const r = detectRegion(city);
  return isBuyer ? r.followUps : r.sellerFollowUps;
}

export function getRegionName(city?: string | null): string {
  return detectRegion(city).region;
}
