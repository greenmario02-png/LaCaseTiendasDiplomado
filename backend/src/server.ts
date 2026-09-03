import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { initSocket } from './config/socket';
import { logger } from './utils/logger';
import { expireProducts } from './services/expiration.service';
import { processAuctionClosures } from './services/auction-closure.service';
import { processForumTopPost } from './services/forum-daily.service';
import cron from 'node-cron';

async function main() {
  const app = createApp();
  const httpServer = createServer(app);

  try {
    await prisma.$connect();
    logger.info('PostgreSQL conectado');
  } catch (error) {
    logger.error('No se pudo conectar a PostgreSQL', { message: (error as Error).message });
    process.exit(1);
  }

  initSocket(httpServer);

  // Job de expiración: desactiva productos sin vender tras 30 días (cada 6 horas)
  await expireProducts().catch((e) => logger.warn(`[expiration] inicial: ${(e as Error).message}`));
  setInterval(() => {
    expireProducts().catch((e) => logger.warn(`[expiration] periódico: ${(e as Error).message}`));
  }, 6 * 60 * 60 * 1000);

  // Job de subastas: cierra expiradas, crea orden de pago al ganador (48h) y relista si no paga
  await processAuctionClosures().catch((e) => logger.warn(`[auctions] inicial: ${(e as Error).message}`));
  setInterval(() => {
    processAuctionClosures().catch((e) => logger.warn(`[auctions] periódico: ${(e as Error).message}`));
  }, 60 * 1000);

  // Job del foro: acredita +5 karma/+5 monedas al post más votado del día (23:55 hora boliviana = 03:55 UTC)
  cron.schedule('55 3 * * *', async () => {
    await processForumTopPost().catch((e) => logger.warn(`[forum-top-post] error: ${(e as Error).message}`));
  });

  httpServer.listen(env.PORT, () => {
    logger.info(`API + WebSocket escuchando en http://localhost:${env.PORT}/api`);
  });
}

main().catch((error) => {
  logger.error('Fatal', { message: (error as Error).message });
  process.exit(1);
});
