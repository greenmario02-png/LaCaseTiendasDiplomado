import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { corsOptions } from './config/cors';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import { prisma } from './config/database';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import sellerRoutes from './routes/seller.routes';
import publicRoutes from './routes/public.routes';
import adminRoutes from './routes/admin.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import accountRoutes from './routes/account.routes';
import contentRoutes from './routes/content.routes';
import buildRoutes from './routes/build.routes';
import currencyRoutes from './routes/currency.routes';
import coinsRoutes from './routes/coins.routes';
import forumRoutes from './routes/forum.routes';
import forumExtensionsRoutes from './routes/forum-extensions.routes';
import conoRoutes from './routes/cono.routes';
import botAccountRoutes from './routes/bot-account.routes';
import chatRoutes from './routes/chat.routes';
import trackingRoutes from './routes/tracking.routes';
import auctionRoutes from './routes/auction.routes';
import notificationRoutes from './routes/notification.routes';
import returnRoutes from './routes/return.routes';
import taxRoutes from './routes/tax.routes';
import affiliateRoutes from './routes/affiliate.routes';
import auditRoutes from './routes/audit.routes';
import storeTeamRoutes from './routes/storeTeam.routes';
import rbacRoutes from './routes/rbac.routes';
import jobRoutes from './routes/job.routes';
import { assertPublicHttpUrl, fetchPublicImage } from './utils/safeFetch';
import { serveUploads, serveSeedAssets } from './middlewares/upload';
import { setupSwagger } from './config/swagger';

export function createApp() {
  const app = express();

  // Desplegado detrás de un proxy inverso (Render): sin esto, express-rate-limit
  // no puede distinguir IPs reales y limita a todos los usuarios como si fueran uno solo.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", 'https:', 'http:'],
          fontSrc: ["'self'", 'https:', 'data:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(generalLimiter);

  // API versionada: /api/v1/* es un alias de /api/* (ambos siguen funcionando)
  app.use((req, _res, next) => {
    if (req.url === '/api/v1' || req.url.startsWith('/api/v1/') || req.url.startsWith('/api/v1?')) {
      req.url = '/api' + req.url.slice('/api/v1'.length);
    }
    next();
  });

  // Ruta de salud pública
  // Disponibilidad real: además de que el proceso responda, comprueba la base (SELECT 1 con tope de 4 s).
  // Es la ruta que vigilan el monitor externo y la tarea programada de calentamiento; al consultar la base
  // también evitan que el proveedor la ponga en pausa por inactividad. Render usa `/api/health` (solo proceso).
  app.get(['/api/salud', '/api/v1/salud'], async (_req, res) => {
    // `commit` (Render lo inyecta) identifica qué versión está en vivo: evidencia de despliegue verificado.
    const commit = process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null;
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('timeout')), 4000).unref()),
      ]);
      res.status(200).json({ estado: 'ok', base: 'ok', commit });
    } catch {
      res.status(503).json({ estado: 'degradado', base: 'sin respuesta', commit });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Proxy de imágenes: resuelve URLs externas (con redirects) y las sirve localmente
  // para que la app móvil (React Native) no dependa de CDNs con 302.
  app.get('/api/img/:encoded', async (req, res) => {
    // CORP cross-origin: permite que las <img> de la web/móvil (otro origen) muestren la imagen.
    // No se envía Access-Control-Allow-Origin: las <img> no lo necesitan y así ningún sitio
    // puede leer el contenido con fetch/XHR.
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    try {
      let url: string;
      try {
        url = decodeURIComponent(req.params.encoded);
      } catch {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'URL inválida' } });
      }
      try {
        await assertPublicHttpUrl(url);
      } catch {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'URL no permitida' } });
      }
      const { buffer, contentType } = await fetchPublicImage(url);
      res.set('Content-Type', contentType);
      // La URL codificada en :encoded identifica el contenido de forma estable, así que cachear
      // agresivamente es seguro (si la imagen origen cambia, cambia también su URL).
      res.set('Cache-Control', 'public, max-age=604800, immutable');
      res.send(buffer);
    } catch {
      res.status(502).json({ error: { code: 'BAD_GATEWAY', message: 'No se pudo cargar la imagen' } });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api', publicRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/seller', sellerRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/account', accountRoutes);
  app.use('/api/builds', buildRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/tracking', trackingRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/auctions', auctionRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/returns', returnRoutes);
  app.use('/api/taxes', taxRoutes);
  app.use('/api/affiliates', affiliateRoutes);
  app.use('/api/audits', auditRoutes);
  app.use('/api/seller', storeTeamRoutes);
  app.use('/api/rbac', rbacRoutes);
  app.use('/api', currencyRoutes);
  app.use('/api/coins', coinsRoutes);
  app.use('/api/forum', forumRoutes);
  app.use('/api/forum', forumExtensionsRoutes);
  app.use('/api/cono', conoRoutes);
  app.use('/api', botAccountRoutes);
  app.use('/api', contentRoutes);

  serveUploads(app);
  serveSeedAssets(app);
  setupSwagger(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
