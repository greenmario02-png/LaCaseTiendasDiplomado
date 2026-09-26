# Base LaCase Multitiendas

Marketplace multi-vendedor para Bolivia. **Alcance de la monografía: tiendas, catálogo y pedido con pago
por QR manual.** Backend, frontend web y app móvil en un solo repositorio. Otros módulos (subastas, foro,
chat, empleos, geolocalización, etc.) existen en el código pero están **fuera de alcance**
(ver [`docs/fuera-de-alcance.md`](docs/fuera-de-alcance.md)).

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

La moderación del foro (fuera de alcance) es una asignación RBAC, no un cuarto rol. Detalle en
[`docs/modelo-roles.md`](docs/modelo-roles.md).

## Alcance real

| Prioridad | Contenido |
|---|---|
| Must (8 RF) | Registro/login, solicitud de tienda, aprobación y moderación, publicación de productos, catálogo, carrito y pedido con QR, comprobante de pago, verificación del pago por el vendedor |
| Should (4 RF) | Historial de pedidos, confirmación de recepción, categorías, gestión de usuarios |
| Could (2 RF) | Notificaciones de pedido, cotización Bs/USD (Binance P2P) |
| Won't | Subastas, foro, chat, empleos, geolocalización, eventos, afiliados, cupones, devoluciones y pagos, equipo de tienda y RBAC dinámico |

14 requisitos funcionales (Must 57,1 %) y 5 requisitos no funcionales con métrica.

## Documentación

- [`docs/requisitos-funcionales.md`](docs/requisitos-funcionales.md) — 14 RF, criterios Dado/Cuando/Entonces, MoSCoW
- [`docs/requisitos-no-funcionales.md`](docs/requisitos-no-funcionales.md) — 5 RNF con métrica
- [`docs/fuera-de-alcance.md`](docs/fuera-de-alcance.md) — Won't have
- [`docs/casos-de-uso.md`](docs/casos-de-uso.md)
- [`docs/modelo-roles.md`](docs/modelo-roles.md)
- [`docs/modelo-datos.md`](docs/modelo-datos.md) — entidades y diccionario de datos
- [`docs/arquitectura.md`](docs/arquitectura.md) — monolito modular, flechas, despliegue, riesgos
- [`docs/contrato-api.md`](docs/contrato-api.md) — rutas Must, errores, dominios
- [`docs/seguridad-y-pruebas.md`](docs/seguridad-y-pruebas.md) — controles, casos de prueba y brechas
- [`docs/despliegue.md`](docs/despliegue.md) — plan de despliegue en producción (pendiente, E4)
- [`docs/endpoints-empleos.md`](docs/endpoints-empleos.md) — módulo Empleos (fuera de alcance)

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

## Cuentas de prueba (datos ficticios del seed)

| Rol | Email | Password |
|---|---|---|
| Administrador | admin@lacase.bo | admin123 |
| Vendedor | vendedor@lacase.bo | password123 |
| Comprador | comprador@lacase.bo | password123 |

Son solo para desarrollo y demostración; cambiar la contraseña del administrador antes de cualquier
despliegue público. Los secretos reales (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`) van en
variables de entorno y nunca en el repositorio.

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
`backend/tests/globalSetup.ts`). La tabla de casos está en
[`docs/seguridad-y-pruebas.md`](docs/seguridad-y-pruebas.md).

## Endpoints principales (alcance Must)

- Salud: `GET /api/v1/salud` → `{"estado":"ok"}` (toda la API también responde bajo `/api/v1`; `/api/health` sigue vigente)
- Autenticación: `POST /api/auth/register`, `/api/auth/sellers/register`, `/api/auth/login`
- Catálogo: `GET /api/products`, `GET /api/products/:id`
- Carrito y pedidos: `/api/cart`, `POST /api/orders`, `POST /api/orders/:id/payment-proof`,
  `PUT /api/orders/seller/:id/payment-status`
- Vendedor y administrador: `/api/seller/products`, `/api/admin/products/:id/moderate`
- Contrato completo: [`docs/contrato-api.md`](docs/contrato-api.md)
- Docs OpenAPI: `http://localhost:3000/api-docs`
