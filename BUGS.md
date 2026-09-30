# Bugs y errores encontrados por pruebas (y su solución)

Registro de errores encontrados en rondas de pruebas/auditoría de calidad, con la solución
aplicada. Se actualiza cada vez que una ronda de pruebas (rendimiento, funcional, o tests
automáticos) encuentra algo real. No documenta deuda técnica cosmética (warnings de lint de
estilo) — solo bugs y problemas de rendimiento con impacto real.

## Ronda 2026-09-30 — Auditoría de rendimiento y fallos (rol de tester)

Se hizo un audit de solo lectura (backend Express/Prisma + frontend React/Vite) enfocado en tres
preguntas: ¿la comunicación backend↔frontend es rápida?, ¿la página carga rápido?, ¿hay fallos
funcionales? — más un diagnóstico del estado de testing (sin escribir tests nuevos todavía; eso
queda para la fase final, previa a la documentación de la monografía). Después de la auditoría se
corrigió lo más importante, verificando con `npm run typecheck`, `npm run lint` y
`npx vitest run` en cada paso.

### Bugs funcionales

| # | Severidad | Descripción | Archivo | Solución |
|---|---|---|---|---|
| 1 | **Alto (riesgo de producción)** | El backend no tenía `app.set('trust proxy', ...)` pese a estar desplegado detrás de Render (proxy inverso). `express-rate-limit` v7 valida esto explícitamente: sin él, el rate limiting puede romperse o terminar limitando a todos los usuarios como si fueran una sola IP. | `backend/src/app.ts` | `app.set('trust proxy', 1)` agregado al inicio de `createApp()`. |
| 2 | **Crítico** | `cart.service.ts` (`addItem`) no validaba `quantity`: un valor negativo (ej. `-5`) no era rechazado porque el único guard era `quantity \|\| 1` (falsy check), que no atrapa negativos. Permitía reducir el total de una orden en checkout. | `backend/src/services/cart.service.ts` | Se agregó `if (!Number.isInteger(quantity) \|\| quantity <= 0) throw ApiError.badRequest(...)` al inicio de `addItem`, igual que ya tenía `updateItemQuantity`. |
| 3 | Alto | Checkout (`POST /orders`) y carrito (`POST/PUT /cart/items`) sin validación Zod — a diferencia de `payment-proof`/`updateOrderStatus`, que sí la tenían. Solo ~38% de los endpoints de escritura del proyecto usan `validate(schema)`. | `backend/src/routes/order.routes.ts`, `backend/src/routes/cart.routes.ts` | Nuevo `createOrderSchema` en `order.schemas.ts` y nuevo `backend/src/schemas/cart.schemas.ts` (`addCartItemSchema`, `updateCartItemSchema`), aplicados con `validate(...)` en ambas rutas. Queda pendiente el resto de rutas de admin sin Zod (categorías, banners, cupones, etc.) — ver "Pendiente" abajo. |
| 4 | Medio | Harness de tests del frontend roto por una regresión posterior, no por falta de tests: el rollout de i18n (2026-09-28) nunca actualizó `src/test/setup.ts`, que no inicializaba i18next. 20 de 67 tests fallaban (13 de 25 archivos) con `NO_I18NEXT_INSTANCE`, renderizando claves crudas (`"returns.title"`) en vez del texto. | `frontend/src/test/setup.ts` | Se agregó `import "../i18n"` (jsdom trae `localStorage`/`navigator`, suficiente para el `LanguageDetector`). Pasó de 47/67 a **67/67 tests verdes, 25/25 archivos**. |
| 5 | Bajo | `pendingSellers` (admin) y `getWishlist` sin límite de resultados — sin problema hoy, pero sin cota de diseño. | `backend/src/controllers/admin.controller.ts`, `backend/src/controllers/public.controller.ts` | `take: 200` agregado a ambos `findMany`. |

### Rendimiento

| # | Severidad | Descripción | Archivo | Solución |
|---|---|---|---|---|
| 6 | **Crítico** | N+1 en dashboards de admin/vendedor: loops `for (const t of ...) { await prisma.X.findUnique(...) }` — hasta 20-30 queries secuenciales por carga de dashboard, en vez de un solo `findMany` con `id: { in: [...] }`. | `backend/src/controllers/admin.controller.ts` (top productos/tiendas/categorías), `backend/src/controllers/seller.controller.ts` (top productos del vendedor) | Reemplazado por `findMany({ where: { id: { in: [...] } } })` + `Map` para reconstruir el orden original. |
| 7 | Alto | Feed personalizado de la home (`personalizedFeed`): candidatos de "cerca de ti" traían **300 productos con include completo** (seller+category+imagen) solo para calcular distancia en JS y quedarse con los 10 más cercanos. Además, los 4 bloques del feed (cerca de ti, carruseles, para ti, tendencias) corrían uno detrás del otro en vez de en paralelo. | `backend/src/controllers/tracking.controller.ts` | Paso 1 ahora trae solo `id` + coords (`select` mínimo); el include completo se paga solo sobre los 10 ganadores. Los 4 bloques se reestructuraron para correr con `Promise.all`. |
| 8 | Alto | `PRODUCT_INCLUDE` (con `attributes`+`attributeDefinition` y `variants`) se reusaba entre catálogo/carruseles/relacionados **y** detalle — cada página de 20 productos traía atributos y variantes que la grilla nunca renderiza (confirmado: `ProductCard.tsx` no los usa, solo `tags`). | `backend/src/services/product.service.ts` | Nuevo `PRODUCT_LIST_INCLUDE` (sin `attributes`/`variants`) para `listProducts`/`getFeaturedProducts`/`getRelatedProducts`; el include completo queda reservado para `getProductById`. |
| 9 | Alto | Sin índices en `Order` (`status`+`createdAt`) ni `Product` (`isActive`+`createdAt`), pese a ser los campos más filtrados en reportes/catálogo. `User` no tenía ningún índice pese a filtrar `role`/`isApproved` en ~25 lugares. | `backend/prisma/schema.prisma` | `@@index([status, createdAt])` en `Order`, `@@index([isActive, createdAt])` en `Product`, `@@index([role, isApproved])` en `User`. Aplicado con `prisma db push` contra la base local (`base_lacase`). |
| 10 | Alto | Sin middleware de compresión HTTP — todo el JSON de catálogo/foro/admin viajaba sin comprimir. | `backend/src/app.ts` | `compression()` agregado (paquete `compression` + `@types/compression` instalados). |
| 11 | Medio | El rate limiter general (100 req/min/IP) cubría también el proxy de imágenes — una sola página de catálogo con varias imágenes podía agotar el cupo con tráfico legítimo. | `backend/src/middlewares/rateLimiter.ts` | `skip: (req) => req.path.startsWith('/api/img')` agregado a `generalLimiter`. |
| 12 | Medio | El proxy de imágenes servía con `Cache-Control: no-cache` — cada imagen externa se re-descargaba en cada carga, para cada usuario. | `backend/src/app.ts` | Cambiado a `public, max-age=604800, immutable` (la URL codificada identifica el contenido de forma estable). |
| 13 | Medio | `ProductCard.tsx` se suscribía al array completo de wishlist (`useWishlistStore((s) => s.wishlist)`) — togglear un favorito re-renderizaba toda la grilla de productos. Además, 0 usos de `React.memo` en 168 componentes. | `frontend/src/components/ui/ProductCard.tsx` | Selector puntual `s.wishlist.includes(product.id)` + componente envuelto en `React.memo`. |
| 14 | Medio | `NotificationBell.tsx` pesaba con un `setInterval(loadUnread, 60000)` indefinido en paralelo a un socket que ya mantenía el badge al día — trabajo duplicado en cada pestaña logueada. | `frontend/src/components/layout/NotificationBell.tsx` | Reemplazado por reconciliación en reconexión del socket (`connect`) y al volver a la pestaña (`visibilitychange`); ya no pollea a intervalos fijos. |
| 15 | Medio | `ProductDetailPage.tsx`: 3 llamadas (`/offers`, `/related`, `/reviews`) encadenadas detrás de la respuesta del detalle, aunque ninguna necesita esos datos — solo el `id` de la URL. | `frontend/src/pages/ProductDetailPage.tsx` | Las 4 llamadas ahora salen en paralelo desde el mismo efecto (reviews queda en un efecto aparte, solo para poder re-disparar tras publicar una reseña). |
| 16 | Bajo | Imágenes sin `loading="lazy"` en la grilla de subastas y en miniaturas de admin/vendedor de productos. | `frontend/src/pages/AuctionsPage.tsx`, `frontend/src/pages/admin/AdminProducts.tsx`, `frontend/src/pages/seller/SellerProducts.tsx` | `loading="lazy"` agregado. |

### Estado de testing (diagnóstico)

- **Backend**: Jest + Supertest configurados, 37 archivos / 398 casos declarados (`describe`/`it`)
  cubriendo auth, productos, carrito, órdenes, cupones, devoluciones, subastas, foro, afiliados,
  comisiones, RBAC, etc. No se pudo confirmar cuántos pasan hoy: `tests/globalSetup.ts` corre
  `prisma db push --force-reset` contra la base de test, y Prisma bloquea esa acción cuando la
  invoca un agente de IA sin consentimiento explícito corrido manualmente por el usuario. Correr
  `npm test` manualmente para tener el conteo real.
- **Frontend**: Vitest + Testing Library, 25 archivos / 67 tests — **100% verdes** tras el fix
  del harness de i18n (#4 arriba).
- **Mobile**: tiene `jest.config.js` y `npm test`, no se auditó en profundidad.
- **Falta para una suite presentable en la monografía**: confirmar pass/fail real del backend;
  no hay tests E2E (Playwright/Cypress) en ningún paquete — valdría la pena al menos login →
  catálogo → carrito → checkout; no se corrió `test:coverage`, no hay métrica de cobertura citable.

### Pendiente (no crítico, próxima ronda)

- Virtualización de listas largas (catálogo, foro) — requiere agregar `react-window` y
  refactorizar los listados (hoy usan scroll infinito sin desmontar ítems ya vistos).
- Completar validación Zod en el resto de rutas de admin (categorías, atributos, banners,
  promociones, tags, cupones, FAQs, warranties) que todavía no la tienen.
- Memoizar `Zustand` en componentes de listas del foro (`PostCard`, `ReplyCard`) que hoy hacen
  `const { user } = useAuthStore()` sin selector.
