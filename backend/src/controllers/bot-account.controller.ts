import { Response } from 'express';

import { AuthRequest } from '../middlewares/auth';
import { ok, created } from '../utils/response';
import * as BS from '../services/bot-account.service';

// ─── Admin ────────────────────────────────────────────────────────────

export async function adminCreateBot(req: AuthRequest, res: Response) {
  const bot = await BS.createBotAccount({
    operatedByUserId: req.user!.id,
    displayName: req.body.displayName,
    declaredStance: req.body.declaredStance,
  });
  return created(res, bot);
}

export async function adminSanctionBot(req: AuthRequest, res: Response) {
  const bot = await BS.sanctionBotAccount({
    botAccountId: Number(req.params.id),
    issuedByUserId: req.user!.id,
    severity: req.body.severity,
    reason: req.body.reason,
  });
  return ok(res, bot);
}

// ─── Público / usuario autenticado ─────────────────────────────────────

export async function listBots(_req: AuthRequest, res: Response) {
  return ok(res, await BS.listBotAccounts());
}

export async function startConversation(req: AuthRequest, res: Response) {
  const conversation = await BS.getOrStartConversation(Number(req.params.id), req.user!.id);
  return ok(res, conversation);
}

export async function sendMessage(req: AuthRequest, res: Response) {
  const result = await BS.sendMessage({
    conversationId: Number(req.params.conversationId),
    userId: req.user!.id,
    body: req.body.body,
  });
  return created(res, result);
}

export async function endConversation(req: AuthRequest, res: Response) {
  const conversation = await BS.endConversation(Number(req.params.conversationId), req.user!.id);
  return ok(res, conversation);
}
