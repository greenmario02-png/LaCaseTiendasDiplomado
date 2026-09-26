# Base LaCase Multitiendas

Marketplace multi-vendedor para Bolivia con catálogo unificado, comparación de precios entre
tiendas, subastas estilo eBay, chat en tiempo real, comisiones de plataforma, panel de
administración y un foro comunitario con moderación por subforo — backend, frontend web y app
móvil en un solo repositorio.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express + TypeScript + Prisma ORM + PostgreSQL |
| Frontend | React 19 + TypeScript + Vite + MUI 6 + TailwindCSS + Zustand + Recharts |
| App móvil | Expo (React Native) + TypeScript |
| Tiempo real | Socket.IO (chat, subastas, notificaciones) |
| Validación | Zod (backend y formularios) |
| Calidad | ESLint + Prettier + Jest + Vitest + GitHub Actions CI |

## Modelo de roles

Tres roles de plataforma:

| Rol | Descripción |
|---|---|
| **ADMIN** | Administrador global — gestiona vendedores, categorías, moderación, reportes y roles/permisos. |
| **SELLER** (vendedor) | Publica y administra su tienda y productos; puede tener un equipo (OWNER/ADMIN/EMPLOYEE) con permisos diferenciados. |
| **CUSTOMER** (cliente) | Compra, participa en subastas, chatea con vendedores y usa el foro. |

La **moderación del foro no es un cuarto rol de plataforma**: es una asignación (rol RBAC
`MODERADOR_FORO`) sobre cualquier usuario CUSTOMER o SELLER, acotada al departamento donde tiene
su perfil de foro. Un ADMIN asigna esa moderación desde el panel de «Roles y permisos».

## Funcionalidades principales

### Catálogo y tienda
- Catálogo multi-vendedor con atributos dinámicos (EAV) — sirve para cualquier rubro (ropa,
  hardware, celulares, electrodomésticos, etc.)
- Búsqueda global, filtros avanzados y paginación por cursor
- Carrito agrupado por tienda, checkout con envío calculado y pago por QR
- Reseñas post-compra, verificación de tiendas, compradores privilegiados

### Subastas (estilo eBay)
Proxy bidding, precio de reserva, Buy It Now, anti-sniping, watchlist, cierre automático con
orden de pago y relistado.

### Chat y notificaciones
Chat comprador↔vendedor en tiempo real (Socket.IO) y notificaciones con navegación al recurso.

### Panel de vendedor
Dashboard con gráficos, CRUD de productos, carga masiva, equipo de tienda, cupones,
promociones, pagos con comisión configurable.

### Panel de administración
Dashboard, moderación de productos, gestión de vendedores/usuarios, categorías, banners,
promociones, reportes económicos, moneda, roles y permisos (RBAC dinámico).

### Foro comunitario
Preguntas y respuestas por ciudad/departamento y categoría, karma y rangos, geolocalización con
subforos, moderación por departamento (ver modelo de roles arriba).

### Empleos
Las tiendas verificadas publican ofertas de empleo con categoría y período de pago
(diario, semanal o mensual); un ADMIN las modera antes de publicarlas. Los clientes se postulan
(con CV opcional PDF/DOC/DOCX de hasta 5 MB) y el vendedor gestiona el estado de cada
postulación (recibida, vista, preseleccionada, rechazada, contratada, retirada). Los CV se
guardan en almacenamiento privado y se descargan con enlaces firmados de 5 minutos. El admin
tiene una vista de todas las postulaciones. Detalle en [`docs/endpoints-empleos.md`](docs/endpoints-empleos.md).

### Geolocalización y monedas
Servicio de geolocalización unificado para tienda y foro: tiendas cercanas ordenadas de la más
cercana a la más lejana (fórmula haversine) y subforos por departamento. Cotizaciones de moneda
en vivo con caché.

### Rediseño y rendimiento
Sistema de diseño **Unified** (web) y **Silk** (móvil), con modo claro y oscuro. Optimizaciones
de carga: deduplicación de GET, stale-while-revalidate y división del bundle en chunks.

## Documentación

- [`docs/requisitos-funcionales.md`](docs/requisitos-funcionales.md)
- [`docs/requisitos-no-funcionales.md`](docs/requisitos-no-funcionales.md)
- [`docs/modelo-roles.md`](docs/modelo-roles.md)
- [`docs/endpoints-empleos.md`](docs/endpoints-empleos.md)

## Arquitectura

```
backend/
  src/
    config/      # env (validado con Zod), database, socket, cors
    controllers/ # Capa HTTP
    services/    # Lógica de negocio (comisiones, subastas, notificaciones, foro...)
    middlewares/ # auth, roles/RBAC, validación Zod, errores, rate limit
    routes/      # Definición de endpoints REST
    schemas/     # Schemas Zod de validación
    utils/       # errores, logger, paginación, envío, JWT
  prisma/        # Schema + seed
  tests/         # tests de integración (Jest + Supertest)
frontend/
  src/
    pages/       # público, account/, seller/, admin/, ForumPage/
    stores/      # Zustand (auth, cart, forum, rbac, ...)
    services/    # axios + Socket.IO client
mobile/
  src/           # App Expo (React Native), espeja los flujos del frontend
.github/workflows/  # CI (lint + typecheck + test)
docker-compose.yml
render.yaml
```

## Instalación y ejecución local

### 1. Base de datos

```bash
createdb base_lacase
```

### 2. Backend

```bash
cd backend
cp .env.example .env    # editar credenciales si es necesario
npm install
npx prisma db push       # crear tablas
npx tsx prisma/seed.ts   # poblar con datos de prueba
npx tsx prisma/seed-forum.ts        # categorías y ciudades del foro
npm run dev              # API + WebSocket en :3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev              # Vite, proxya /api y /uploads a :3000
```

### 4. App móvil

```bash
cd mobile
npm install
npm start                # Expo — escaneá el QR con Expo Go, o "a" para emulador Android
```

En desarrollo, la app apunta al backend local (`mobile/src/config/env.ts`); ajustá la IP de tu
PC ahí si probás desde un teléfono físico en la misma red.

### 5. (Opcional) Docker

```bash
docker compose up -d
```

## Credenciales de prueba

| Rol | Email | Password |
|---|---|---|
| Vendedor | vendedor@lacase.bo | password123 |
| Cliente | comprador@lacase.bo | password123 |
| Cliente + moderador de foro (La Paz) | comprador@lacase.bo | password123 |

Además de estas cuentas fijas, el seed genera vendedores y compradores adicionales con datos
aleatorios (contraseña `password123`) para poblar el catálogo, las subastas y los chats.

## Comandos de calidad

```bash
# Backend (cd backend)
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # Tests de integración (Jest + Supertest)

# Frontend (cd frontend)
npm run lint
npm run typecheck     # tsc -b
npm test              # Vitest

# Mobile (cd mobile)
npm test              # Jest
```

Ejecutar los tests requiere la base de datos PostgreSQL local levantada y las migraciones
aplicadas (`npx prisma db push`) antes de `npm test` en el backend.

## Endpoints principales

- Health: `GET /api/health`
- Productos: `GET /api/products` (filtros + cursor pagination)
- Subastas: `GET /api/auctions` / `POST /api/auctions/:id/bid`
- Chat: `GET /api/chat` / `POST /api/chat/:id/messages`
- Notificaciones: `GET /api/notifications`
- Empleos: `GET /api/jobs` / `POST /api/jobs/:id/apply` (ver `docs/endpoints-empleos.md`)
- Foro: `GET /api/forum/*`
- Roles y permisos: `GET/PUT /api/rbac/*`
- Docs OpenAPI: `http://localhost:3000/api-docs`
