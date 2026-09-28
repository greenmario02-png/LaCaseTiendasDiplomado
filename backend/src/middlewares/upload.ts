import path from 'path';
import fs from 'fs';

import { Request, Response, NextFunction } from 'express';
import express from 'express';
import multer from 'multer';

import { requireAdmin } from '../middlewares/roles';
import { ApiError } from '../utils/errors';
import { uploadBuffer } from '../utils/storage';

const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads');
const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif']; // SVG excluido: puede contener scripts (XSS)
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Los archivos se reciben en memoria y se suben al almacenamiento configurado
// (Supabase Storage en producción, disco local en desarrollo — ver utils/storage.ts).
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      return cb(ApiError.badRequest(`Formato no permitido. Usa: ${ALLOWED.join(', ')}`));
    }
    cb(null, true);
  },
});

// ── Upload del foro: imágenes de posts/replies (multitenant por id) ──
// 09-spec G4.1: whitelist por MIME (jpeg/png/webp/gif) + límite 8 MB.
const FORUM_ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const FORUM_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export const forumUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB (09-spec G4.1)
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!FORUM_ALLOWED_EXT.includes(ext) || !FORUM_ALLOWED_MIME.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Formato no permitido. Usa: ${FORUM_ALLOWED_MIME.join(', ')} (máx 8 MB)`));
    }
    cb(null, true);
  },
});

export function uploadSingle(field: string) {
  return [requireAdmin, upload.single(field), async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'No se recibió ninguna imagen' } });
    try {
      const publicUrl = await uploadBuffer(req.file.buffer, 'general', req.file.originalname, req.file.mimetype);
      return res.status(201).json({ data: { url: publicUrl, filename: path.basename(publicUrl), size: req.file.size } });
    } catch (err) {
      return next(err);
    }
  }];
}

export function uploadSingleAuthenticated(field: string) {
  return [upload.single(field), async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'No se recibió ninguna imagen' } });
    try {
      const publicUrl = await uploadBuffer(req.file.buffer, 'general', req.file.originalname, req.file.mimetype);
      return res.status(201).json({ data: { url: publicUrl, filename: path.basename(publicUrl), size: req.file.size } });
    } catch (err) {
      return next(err);
    }
  }];
}

export function serveUploads(app: import('express').Express) {
  // CORP cross-origin + ACAO para que las <img> de la web/móvil (localhost:5173/:19006) puedan mostrar los /uploads
  app.use('/uploads', (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
    next();
  }, express.static(UPLOAD_DIR, {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      // SVG antiguos ya subidos: se sirven sin permitir la ejecución de scripts
      if (filePath.toLowerCase().endsWith('.svg')) res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    },
  }));
}

// ── CV de postulaciones: carpeta PRIVADA (fuera de /uploads, que es público). Solo se descarga
// con un enlace firmado de corta duración emitido a la persona autorizada. ──
export const CV_DIR = path.resolve(__dirname, '..', '..', 'private-uploads', 'cv');
export const CV_ALLOWED_EXT = ['.pdf', '.doc', '.docx'];
export const CV_MAX_SIZE = 5 * 1024 * 1024;
fs.mkdirSync(CV_DIR, { recursive: true });

export const cvUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, CV_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: CV_MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!CV_ALLOWED_EXT.includes(ext)) return cb(ApiError.badRequest('El CV debe ser un archivo PDF, DOC o DOCX'));
    cb(null, true);
  },
});
