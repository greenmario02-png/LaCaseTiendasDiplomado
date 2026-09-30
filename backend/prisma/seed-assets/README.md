# Imágenes del seed

Fotos reales, curadas y reutilizables para los datos de ejemplo (`prisma/seed.ts`) — una por
categoría de nivel superior (`categories/`) y un pequeño set de avatares genéricos (`avatars/`).
Reemplazan al servicio externo de fotos aleatorias (LoremFlickr) que se usaba antes, poco
confiable y sin relación real con la categoría.

Se sirven desde el propio backend en `/seed-assets/...` (ver `serveSeedAssets` en
`src/middlewares/upload.ts`), tanto en desarrollo local como en producción.

**Origen y licencia**: todas descargadas de [Wikimedia Commons](https://commons.wikimedia.org),
contenido de licencia libre (dominio público o Creative Commons). Son datos de ejemplo para un
proyecto académico, no material de marketing final — si esta tienda pasa a producción real con
catálogo propio, reemplazar por fotos reales de cada vendedor.
