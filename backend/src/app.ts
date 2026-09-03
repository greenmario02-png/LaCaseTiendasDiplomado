import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { corsOptions } from './config/cors';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
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
import { serveUploads } from './middlewares/upload';
import { setupSwagger } from './config/swagger';

export function createApp() {
  const app = express();

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
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(generalLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Proxy de imágenes: resuelve URLs externas (con redirects) y las sirve localmente
  // para que la app móvil (React Native) no dependa de CDNs con 302.
  app.get('/api/img/:encoded', async (req, res) => {
    // El proxy sirve imágenes cross-origin (web, Expo web, APK): estos headers se
    // setean ANTES de cualquier respuesta (éxito O error) para anular el
    // Cross-Origin-Resource-Policy: same-origin que agrega helmet y permitir el
    // acceso desde cualquier origen (las <img> no requieren credenciales). Sin
    // esto, los 502 con JSON del proxy se bloqueaban con NotSameOrigin.
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
    try {
      const url = decodeURIComponent(req.params.encoded);
      if (!/^https?:\/\//.test(url)) return res.status(400).json({ error: 'URL inválida' });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const upstream = await fetch(url, { redirect: 'follow', signal: controller.signal });
      clearTimeout(timer);
      if (!upstream.ok) return res.status(502).json({ error: 'No se pudo cargar la imagen' });
      const ct = upstream.headers.get('content-type') || 'image/jpeg';
      res.set('Content-Type', ct);
      // no-cache: revalida con el server cada vez (los headers CORS/CORP que
      // agregamos deben estar SIEMPRE frescos; un max-age largo guardaría las
      // respuestas viejas con CORP: same-origin en caché del navegador).
      res.set('Cache-Control', 'no-cache');
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.send(buffer);
    } catch {
      res.status(502).json({ error: 'Error cargando la imagen' });
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
  app.use('/api', contentRoutes);

  serveUploads(app);
  setupSwagger(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
