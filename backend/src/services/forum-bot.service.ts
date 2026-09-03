import { prisma } from '../config/database';
import { getIO } from '../config/socket';

export const forumBotService = {
  async respond(postId: number, query: string, type: 'PRECIO' | 'EXISTENCIA') {
    // Extraer palabras clave (palabras ≥ 3 chars, excluir stopwords)
    const STOP = ['del','de','la','el','que','en','un','una','los','las','hay','existe','cuesta'];
    const keywords = query.toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.includes(w))
      .slice(0, 5);

    if (!keywords.length) {
      await this.createBotReply(postId,
        '🤖 No pude extraer palabras clave para buscar. Por favor sé más específico en tu pregunta.');
      return;
    }

    // Búsqueda en productos
    const whereConditions = keywords.map((kw) => ({
      name: { contains: kw, mode: 'insensitive' as const },
    }));

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isApproved: true,
        ...(type === 'EXISTENCIA' ? { stock: { gt: 0 } } : {}),
        OR: whereConditions,
      },
      select: {
        name: true,
        price: true,
        stock: true,
        seller: { select: { storeName: true, locationCity: true } },
      },
      take: 5,
      orderBy: { saleCount: 'desc' },
    });

    let body: string;
    if (products.length === 0) {
      body = `🤖 **Bot LaCASE Multitienda** — No encontré "${keywords.join(', ')}" en la multitienda.\n\n`
        + 'Quizás algún miembro de la comunidad lo sepa 🙏\n\n'
        + '*[Respuesta automática — puedes reportarla si no es útil]*';
    } else {
      const lines = products.map((p) =>
        `• **${p.name}** — Bs ${Number(p.price).toFixed(2)} | `
        + `Stock: ${p.stock} | Tienda: ${p.seller?.storeName ?? 'Desconocida'}`
        + (p.seller?.locationCity ? ` (${p.seller.locationCity})` : ''),
      );
      const header = type === 'PRECIO'
        ? '🤖 **Bot LaCASE** — Encontré estos precios en la multitienda:\n\n'
        : '🤖 **Bot LaCASE** — Estos productos tienen stock disponible:\n\n';
      body = header + lines.join('\n')
        + '\n\n*[Respuesta automática del sistema — puede no estar actualizada]*';
    }

    const reply = await this.createBotReply(postId, body);

    // Emitir por socket para que el hilo se actualice en tiempo real
    try {
      const io = getIO();
      if (io) {
        io.to(`forum:${postId}`).emit('forum:reply:new', { reply, postId });
      }
    } catch (e) {
      console.error('[ForumBot] socket emit error:', (e as Error).message);
    }
  },

  async createBotReply(postId: number, body: string) {
    const reply = await prisma.forumReply.create({
      data: { postId, authorId: null, body, isBotReply: true },
    });
    // Incrementar replyCount del post
    await prisma.forumPost.update({
      where: { id: postId },
      data: { replyCount: { increment: 1 } },
    });
    return reply;
  },
};
