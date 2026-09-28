# Locales — i18n

`i18next`/`react-i18next` está conectado (`frontend/src/i18n/index.ts`, `<LanguageSwitcher />` en
el navbar global) — este directorio es la fuente de las traducciones que usa. Misma convención que
el proyecto de 5 roles (`LaCase multitiendas/frontend/src/locales/README.md`), para que el proceso
sea transferible entre ambos.

## Estructura

- `languages.json` — catálogo de idiomas soportados. `status: "stable"` (traducido) vs `"stub"`
  (todavía es una copia 1:1 de `es.json`, pendiente de traducción real).
- `es.json` — idioma fuente. **Toda clave nueva se agrega acá primero**, organizada por namespace
  (`common`, `nav`, `home`, `product`, `cart`, `checkout`, `auth`, `account`, `seller`, `forum`,
  `cono`, `auctions`, `jobs`, `admin`, etc.) — un namespace por feature/sección grande, no un
  archivo plano.
- `qu.json` (Runasimi/Quechua), `ay.json` (Aymar aru/Aymara), `gn.json` (Avañe'ẽ/Guaraní), `pt.json`
  (Português) — traducidos. **Aviso importante**: qu/ay/gn son traducciones de primera pasada,
  hechas por un asistente de IA sin ser hablante nativo de ninguno de los tres idiomas — cubren el
  vocabulario y la estructura de forma genuina (no son copias de `es.json` ni texto placeholder),
  pero **necesitan revisión de un hablante nativo antes de presentarse como definitivas** en
  producción. `pt.json` sigue el mismo criterio de honestidad aunque el portugués tiene mucha más
  cercanía estructural con el español. `status: "stable"` en `languages.json` refleja "traducido de
  verdad", no "revisado por un hablante nativo" — son cosas distintas.
- `en.json` — sigue como stub (copia literal de `es.json`) mientras no se priorice.
- `partials/` — carpeta de trabajo (no se referencia desde el código): cada tanda de migración deja
  ahí su fragmento de `es.json` (`{"namespace": {...}}`) antes de fusionarse al archivo final, para
  poder migrar varias secciones en paralelo sin pisarse entre sí.

## Convención de claves

`namespace.subseccion.clave`, siempre en `camelCase`, valores con interpolación estilo
`{{variable}}` (compatible con i18next). Ejemplo: `cart.errors.outOfStock`.

## Pendiente

- Revisión por hablante nativo de qu/ay/gn (y pt) antes de presentarlas como definitivas.
- Traducción real de `en.json` (hoy stub) — sin priorizar.
- Seguir migrando strings hardcodeados página por página, no una migración masiva de una sola vez.
