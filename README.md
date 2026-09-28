# LaCase Multitiendas

Marketplace multi-vendedor para Bolivia, con foro comunitario, subastas, ofertas de empleo y
cotización de moneda en tiempo real. Esta es la versión de 3 roles (Administrador, Vendedor,
Comprador) del proyecto, desarrollada para el trabajo de diplomado.

- **Demo en vivo:** https://tiendaslacase.netlify.app
- **API:** https://lacase-diplomado-api.onrender.com/api/v1/salud
- **Autor:** Álvaro Díaz Vallejos

> El backend gratuito de Render "duerme" tras un período de inactividad: la primera petición
> después de un rato sin uso puede tardar unos 30-50 segundos en responder mientras se reactiva.

## Contenido

- [Qué es LaCase Multitiendas](#qué-es-lacase-multitiendas)
- [Roles](#roles)
- [Funcionalidades principales](#funcionalidades-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Capturas de pantalla](#capturas-de-pantalla)
- [Diagramas](#diagramas)
- [Arquitectura del repositorio](#arquitectura-del-repositorio)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Cuentas de prueba](#cuentas-de-prueba)
- [Comandos de calidad](#comandos-de-calidad)

## Qué es LaCase Multitiendas

LaCase Multitiendas reúne a distintas tiendas bolivianas en un solo catálogo: cualquier persona
puede comparar precios entre vendedores, calcular el envío según la ciudad de cada tienda y pagar
mediante comprobante de pago (QR). Además del catálogo, la plataforma incluye una comunidad activa:
un foro organizado por ciudad y por universidad, subastas con puja en tiempo real, publicación de
empleos y un espacio de entretenimiento local llamado **Rinconcito Boliviano** (rankings y torneos
de eliminatorias votados por la comunidad).

## Roles

| Rol | Descripción |
|---|---|
| **Comprador** (`CUSTOMER`) | Rol por defecto de toda cuenta nueva: busca en el catálogo, arma el carrito, hace pedidos, participa del foro y de Rinconcito Boliviano. |
| **Vendedor** (`SELLER`) | Registra su tienda (queda pendiente de aprobación), publica productos, gestiona pedidos y verifica los pagos que recibe. |
| **Administrador** (`ADMIN`) | Aprueba tiendas, modera productos y contenido del foro, gestiona categorías, usuarios y la configuración general. |

La moderación del foro es una asignación adicional (RBAC) sobre una cuenta existente, no un cuarto
rol de la plataforma.

## Funcionalidades principales

- **Catálogo multi-tienda:** categorías y subcategorías, atributos por categoría, variantes de
  producto, carrito, pedidos y verificación de pago por QR.
- **Geolocalización:** productos "cerca de ti" según la ciudad del usuario o su ubicación GPS, con
  cálculo de distancia real entre comprador y vendedor.
- **Foro comunitario:** subforos temáticos por ciudad, subforos de universidades (con comunidades
  por carrera) y subforos profesionales con verificación por cuestionario.
- **Rinconcito Boliviano:** publicaciones tipo ranking con votos de la comunidad, y torneos de
  eliminatorias (por ejemplo, lugares turísticos, comida típica o fútbol boliviano).
- **Subastas:** puja en tiempo real vía WebSocket, compra inmediata opcional y cierre automático.
- **Empleos:** publicación de vacantes por tienda y postulación con currículum adjunto.
- **Cotización de moneda:** conversión Bs/USD/USDT en tiempo real (Binance P2P) para comparar
  precios en distintas monedas.
- **Mensajería:** chat directo entre comprador y vendedor sobre un producto o pedido.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express + TypeScript + Prisma ORM + PostgreSQL |
| Frontend | React 19 + TypeScript + Vite + MUI 6 + TailwindCSS + Zustand |
| App móvil | Expo (React Native) + TypeScript |
| Tiempo real | Socket.IO (chat, subastas, notificaciones) |
| Almacenamiento de imágenes | Supabase Storage en producción (disco local en desarrollo) |
| Validación | Zod (backend y formularios) |
| Calidad | ESLint + Prettier + Jest + Vitest + GitHub Actions CI |
| Despliegue | Netlify (frontend) + Render (API) + Supabase (base de datos PostgreSQL) |

## Capturas de pantalla

> Reemplazar por capturas actuales del sitio en `docs/screenshots/` (mismos nombres de archivo).

| Inicio | Foro |
|---|---|
| ![Página de inicio](docs/screenshots/home.png) | ![Foro](docs/screenshots/foro.png) |

| Rinconcito Boliviano | Catálogo |
|---|---|
| ![Rinconcito Boliviano](docs/screenshots/rinconcito-boliviano.png) | ![Catálogo de productos](docs/screenshots/productos.png) |

## Diagramas

Diagramas UML del sistema (modelados en Enterprise Architect):

| Diagrama | Descripción |
|---|---|
| [Casos de uso — modelo general](docs/diagramas/casos-de-uso-modelo-general.png) | Interacciones principales de los 3 roles |
| [Arquitectura — componentes del sistema](docs/diagramas/arquitectura-componentes.png) | Backend, frontend, base de datos y servicios externos |
| [Clases — modelo de datos núcleo](docs/diagramas/clases-modelo-nucleo.png) | Entidades principales del catálogo y los pedidos |
| [Secuencia — realizar pedido con pago QR](docs/diagramas/secuencia-pedido-pago-qr.png) | Flujo completo de compra |

## Arquitectura del repositorio

```
backend/
  src/
    config/      # Variables de entorno, base de datos, sockets, CORS
    controllers/ # Capa HTTP
    services/    # Lógica de negocio
    middlewares/ # Autenticación, roles/RBAC, validación, errores
    routes/      # Endpoints REST
    schemas/     # Validación con Zod
    utils/       # Errores, logger, almacenamiento de imágenes, paginación
  prisma/        # Esquema de base de datos y scripts de datos iniciales
  tests/         # Pruebas de integración (Jest + Supertest)
frontend/
  src/
    pages/       # Público, cuenta, vendedor, administrador, foro
    stores/      # Estado global (Zustand)
    services/    # Cliente HTTP y Socket.IO
mobile/
  src/           # Aplicación Expo (React Native)
.github/workflows/  # Integración continua (lint + typecheck + test)
docker-compose.yml
```

## Instalación y ejecución local

### Requisitos previos

- Node.js 20 o superior y npm
- PostgreSQL 14 o superior en local
- (Opcional) Docker, Expo Go o un emulador Android/iOS para la app móvil

### 1. Base de datos

```bash
createdb base_lacase
```

### 2. Backend

```bash
cd backend
cp .env.example .env     # completar los valores (ver variables abajo)
npm install
npx prisma db push               # crear tablas
npm run db:seed                  # catálogo y usuarios de ejemplo (entorno de desarrollo)
npx tsx prisma/seed-forum.ts      # categorías y ciudades del foro
npx tsx prisma/seed-professional.ts  # subforos profesionales y universidades
npm run dev                      # API + WebSocket en http://localhost:3000
```

Variables principales de `backend/.env`:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | `postgresql://USUARIO:CLAVE@localhost:5432/base_lacase` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Secretos de al menos 32 caracteres |
| `CORS_ORIGIN` | Origen permitido para el frontend |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Opcionales: solo si se quiere usar almacenamiento en la nube en desarrollo. Sin ellas, las imágenes se guardan en `backend/uploads`. |

Para preparar una base de datos de producción vacía (sin datos de desarrollo):

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... DEMO_PASSWORD=... npm run db:seed:prod
npm run db:seed:content   # catálogo completo, foro, universidades y Rinconcito Boliviano
```

### 3. Frontend web

```bash
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:3000/api
npm install
npm run dev              # http://localhost:5173
```

### 4. Aplicación móvil

```bash
cd mobile
cp .env.example .env     # EXPO_PUBLIC_API_URL=http://localhost:3000/api
npm install
npm start
```

### 5. (Opcional) Docker

```bash
docker compose up -d
```

## Cuentas de prueba

En el entorno de **desarrollo local** (`npm run db:seed`), el catálogo de ejemplo incluye estas
cuentas ficticias:

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@lacase.bo | (definida en el entorno) |
| Vendedor | vendedor@lacase.bo | (definida en el entorno) |
| Comprador | comprador@lacase.bo | (definida en el entorno) |

En la demo en vivo, las cuentas de demostración son `vendedor.demo@lacase.bo` y
`comprador.demo@lacase.bo` (contraseña definida al desplegar). Son cuentas ficticias, solo para
demostración; ningún secreto de producción se guarda en este repositorio.

## Comandos de calidad

```bash
# Backend (cd backend)
npm run lint
npm run typecheck
npm test

# Frontend (cd frontend)
npm run lint
npm run typecheck
npm test

# Mobile (cd mobile)
npm test
```

## Licencia

Ver [LICENSE](LICENSE).
