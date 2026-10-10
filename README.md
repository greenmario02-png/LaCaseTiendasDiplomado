<div align="center">

# 🏪 LaCase Multitiendas

**Marketplace multi-vendedor para Bolivia**, con foro comunitario, subastas, empleos y
cotización de moneda en tiempo real.

[**🔗 Ver demo en vivo**](https://tiendaslacase.netlify.app) · [Estado de la API](https://lacase-diplomado-api.onrender.com/api/v1/salud)

</div>

---

> [!NOTE]
> El backend gratuito de Render "duerme" tras un período de inactividad: la primera petición
> puede tardar unos 30-50 segundos en responder mientras se reactiva.

## Contenido

- [Qué es LaCase Multitiendas](#qué-es-lacase-multitiendas)
- [Roles](#roles)
- [Funcionalidades](#funcionalidades)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Cuentas de prueba](#cuentas-de-prueba)
- [Comandos de calidad](#comandos-de-calidad)
- [Tecnologías](#tecnologías)

## Qué es LaCase Multitiendas

LaCase Multitiendas reúne a distintas tiendas bolivianas en un solo catálogo: cualquier persona
puede comparar precios entre vendedores, calcular el envío según la ciudad de cada tienda y pagar
mediante comprobante de pago (QR). Además del catálogo, la plataforma incluye una comunidad activa:
un foro organizado por ciudad y por universidad, subastas con puja en tiempo real, publicación de
empleos y un espacio de entretenimiento local llamado **Rinconcito Boliviano** (rankings y torneos
de eliminatorias votados por la comunidad).

## Roles

<table>
<tr><td><b>🛒 Comprador</b></td><td>Rol por defecto de toda cuenta nueva: busca en el catálogo, arma el carrito, hace pedidos, participa del foro y de Rinconcito Boliviano.</td></tr>
<tr><td><b>🏬 Vendedor</b></td><td>Registra su tienda (queda pendiente de aprobación), publica productos, gestiona pedidos y verifica los pagos que recibe.</td></tr>
<tr><td><b>🛡️ Administrador</b></td><td>Aprueba tiendas, modera productos y contenido del foro, gestiona categorías, usuarios y la configuración general.</td></tr>
</table>

> La moderación del foro es una asignación adicional sobre una cuenta existente, no un cuarto rol.

## Funcionalidades

- 🛍️ **Catálogo multi-tienda** — categorías, atributos, variantes, carrito, pedidos y verificación de pago por QR.
- 📍 **Geolocalización** — productos "cerca de ti" según ciudad o GPS, con distancia real entre comprador y vendedor.
- 💬 **Foro comunitario** — subforos por ciudad, por universidad (con comunidades por carrera) y profesionales con verificación por cuestionario.
- 🏆 **Rinconcito Boliviano** — rankings con votos de la comunidad y torneos de eliminatorias.
- 🔨 **Subastas** — puja en tiempo real, compra inmediata opcional y cierre automático.
- 💼 **Empleos** — publicación de vacantes y postulación con currículum adjunto.
- 💱 **Cotización de moneda** — conversión Bs/USD/USDT en tiempo real.
- ✉️ **Mensajería** — chat directo entre comprador y vendedor.

## Instalación y ejecución local

### Requisitos previos

- Node.js 20+ y npm
- PostgreSQL 14+ en local
- (Opcional) Docker, Expo Go o un emulador Android/iOS para la app móvil

### Backend

```bash
createdb base_lacase

cd backend
cp .env.example .env             # completar los valores (ver tabla abajo)
npm install
npx prisma db push               # crear tablas
npm run db:seed                  # catálogo y usuarios de ejemplo
npx tsx prisma/seed-forum.ts         # categorías y ciudades del foro
npx tsx prisma/seed-professional.ts  # subforos profesionales y universidades
npm run dev                      # API + WebSocket en http://localhost:3000
```

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | `postgresql://USUARIO:CLAVE@localhost:5432/base_lacase` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Secretos de al menos 32 caracteres |
| `CORS_ORIGIN` | Origen permitido para el frontend |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Opcionales: almacenamiento de imágenes en la nube. Sin ellas, se usa disco local. |

### Frontend web

```bash
cd frontend
cp .env.example .env     # VITE_API_URL=http://localhost:3000/api
npm install
npm run dev               # http://localhost:5173
```

### Aplicación móvil

```bash
cd mobile
cp .env.example .env     # EXPO_PUBLIC_API_URL=http://localhost:3000/api
npm install
npm start
```

### Docker (opcional)

```bash
docker compose up -d
```

## Cuentas de prueba

Ninguna contraseña se guarda en este repositorio.

- **Desarrollo local** (`npm run db:seed`): el seed crea `vendedor@lacase.bo` y `comprador@lacase.bo`
  (contraseña definida con `SEED_USER_PASSWORD` o, si no se define, generada al azar y mostrada una sola vez) y un administrador `admin@lacase.bo` cuya
  contraseña se define con `SEED_ADMIN_PASSWORD` o, si no se define, se genera al azar y se muestra
  una sola vez al terminar el seed.
- **Producción**: el administrador se crea con `ADMIN_EMAIL`/`ADMIN_PASSWORD` y las cuentas ficticias
  de revisión de vendedor y de comprador (`vendedor@lacase.test`, `comprador@lacase.test`) con
  `REVIEW_PASSWORD`, todas desde variables de entorno (`backend/prisma/seed-prod.ts`). La cuenta administradora
  de moderación es de uso interno: no se documenta ni se entrega.
  Las credenciales de la revisión se entregan por el canal de la entrega, no aquí.
- **La administración es solo web**: la app móvil no permite iniciar sesión con una cuenta de
  administrador (el servidor responde 403 a las peticiones con la cabecera `X-Client-App: mobile`).

## Pruebas

- **Contra producción (Cypress, 68 casos):** `cd frontend && npm install && npm run test:e2e` con las variables
  `CYPRESS_BASE_URL`, `CYPRESS_API_URL`, `CYPRESS_REVIEW_SELLER_EMAIL/PASSWORD`, `CYPRESS_REVIEW_BUYER_EMAIL/PASSWORD` y
  `CYPRESS_REVIEW_ADMIN_EMAIL/PASSWORD`. El reporte queda en `evidencia/produccion/cypress-AAAA-MM-DD-HHMM.json` y `.html`.
  Interfaz gráfica para reproducir cada caso: `npx cypress open`.
- **API (Postman/Newman, 49 solicitudes):** colección en `postman/`; en Postman, *Run collection* con el entorno de producción
  (las contraseñas se escriben solo en el entorno).
- **Unitarias e integración:** `cd backend && npm test` (usa una base `lacase_test`; se niega a correr contra otra).
- Todo el flujo (cuentas, esquema, despliegue y Cypress) se automatiza con `scripts/produccion.ps1`.

## Comandos de calidad

```bash
# Backend / Frontend (dentro de cada carpeta)
npm run lint
npm run typecheck
npm test

# Mobile
npm test
```

## Tecnologías

Node.js · Express · TypeScript · Prisma · PostgreSQL · React · Vite · MUI · Zustand ·
Socket.IO · Expo (React Native) · Zod · Netlify · Render · Supabase

---

<div align="center">

Desarrollado por **Álvaro Díaz Vallejos** · Ver [LICENSE](LICENSE)

</div>
