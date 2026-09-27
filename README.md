# Base LaCase Multitiendas

Marketplace multi-vendedor para Bolivia. **Alcance de la monografía: tiendas, catálogo y pedido con pago
por QR manual.** Backend, frontend web y app móvil en un solo repositorio. Otros módulos (subastas, foro,
chat, empleos, geolocalización, etc.) existen en el código pero están **fuera de alcance**.

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

Dos roles funcionales y un administrador que solo existe por seed (limitación declarada):

| Rol | Descripción |
|---|---|
| **CUSTOMER** (Comprador) | Rol por defecto de toda cuenta nueva (menor privilegio): busca en el catálogo, arma el carrito, crea pedidos y envía el comprobante de pago QR. |
| **SELLER** (Vendedor) | Registra su tienda (queda pendiente de aprobación), publica productos y verifica los pagos de sus pedidos. |
| **ADMIN** (Administrador) | **Solo desde el seed**; aprueba tiendas, modera productos, gestiona categorías y usuarios. |

La moderación del foro (fuera de alcance) es una asignación RBAC, no un cuarto rol.

## Alcance real

| Prioridad | Contenido |
|---|---|
| Must (8 RF) | Registro/login, solicitud de tienda, aprobación y moderación, publicación de productos, catálogo, carrito y pedido con QR, comprobante de pago, verificación del pago por el vendedor |
| Should (4 RF) | Historial de pedidos, confirmación de recepción, categorías, gestión de usuarios |
| Could (2 RF) | Notificaciones de pedido, cotización Bs/USD (Binance P2P) |
| Won't | Subastas, foro, chat, empleos, geolocalización, eventos, afiliados, cupones, devoluciones y pagos, equipo de tienda y RBAC dinámico |

14 requisitos funcionales (Must 57,1 %) y 5 requisitos no funcionales con métrica.

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
```

## Requisitos previos

- Node.js 20 o superior y npm
- PostgreSQL 14 o superior en local
- (Opcional) Docker, Expo Go o un emulador Android/iOS para la app móvil

## Instalación y ejecución local

### 1. Base de datos

```bash
createdb base_lacase
```

### 2. Backend

```bash
cd backend
cp .env.example .env     # completar los valores (ver variables abajo)
npm install
npx prisma db push       # crear tablas
npm run db:seed          # datos de prueba
npx tsx prisma/seed-forum.ts   # categorías y ciudades del foro
npm run dev              # API + WebSocket en http://localhost:3000
```

Variables de `backend/.env` (por nombre):

| Variable | Ejemplo / descripción |
|---|---|
| `DATABASE_URL` | `postgresql://USUARIO:CLAVE@localhost:5432/base_lacase` |
| `JWT_SECRET` | secreto de al menos 32 caracteres |
| `JWT_REFRESH_SECRET` | secreto de al menos 32 caracteres |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | `15m` / `7d` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `http://localhost:5173` |
| `NODE_ENV` | `development` |
| `CURRENCY_REFRESH_MIN_MINUTES` / `CURRENCY_REFRESH_MAX_MINUTES` | `8` / `14` |

Seed mínimo (sin datos de demostración): `ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed:prod`
crea el administrador y el árbol de categorías; si además se define `DEMO_PASSWORD`, crea dos
cuentas ficticias (`vendedor.demo@lacase.bo`, `comprador.demo@lacase.bo`). Es idempotente.

### 3. Frontend web

```bash
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:3000/api
npm install
npm run dev              # Vite en http://localhost:5173
```

`VITE_API_URL` es la URL de la API; `VITE_SOCKET_URL` (opcional) es la URL de Socket.IO y por defecto
se deriva del origen de `VITE_API_URL`.

### 4. App móvil

```bash
cd mobile
cp .env.example .env     # EXPO_PUBLIC_API_URL=http://localhost:3000/api
npm install
npm start                # Expo: QR con Expo Go, o "a" para emulador Android
```

Sin `EXPO_PUBLIC_API_URL` la app usa `http://localhost:3000/api` (web/iOS) o `http://10.0.2.2:3000/api`
(emulador Android). Desde un teléfono físico, usar la IP de tu PC en la red local.

### 5. (Opcional) Docker

```bash
docker compose up -d
```

## Cuentas de prueba (datos ficticios del seed)

| Rol | Email | Password |
|---|---|---|
| Administrador | admin@lacase.bo | (definida en el entorno) |
| Vendedor | vendedor@lacase.bo | (definida en el entorno) |
| Comprador | comprador@lacase.bo | (definida en el entorno) |

Son cuentas ficticias, solo para desarrollo y demostración. Los secretos (`DATABASE_URL`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`) van en variables de entorno y nunca en el repositorio.

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

### Cómo correr las pruebas

```bash
cd backend
npm test                # Jest + Supertest; recrea la base de test con `prisma db push --force-reset` y el seed
npm run test:coverage   # cobertura de líneas
```

Requiere PostgreSQL local levantado (usuario y base de test configurables por `DATABASE_URL`, ver
`backend/tests/globalSetup.ts`).

## Endpoints principales (alcance Must)

- Salud: `GET /api/v1/salud` → `{"estado":"ok"}` (toda la API también responde bajo `/api/v1`; `/api/health` sigue vigente)
- Autenticación: `POST /api/auth/register`, `/api/auth/sellers/register`, `/api/auth/login`
- Catálogo: `GET /api/products`, `GET /api/products/:id`
- Carrito y pedidos: `/api/cart`, `POST /api/orders`, `POST /api/orders/:id/payment-proof`,
  `PUT /api/orders/seller/:id/payment-status`
- Vendedor y administrador: `/api/seller/products`, `/api/admin/products/:id/moderate`
- Docs OpenAPI: `http://localhost:3000/api-docs`
