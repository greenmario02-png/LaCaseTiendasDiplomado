import path from 'path';
import fs from 'fs';

import { Request, Response, NextFunction } from 'express';
import express from 'express';
import multer from 'multer';

import { requireAdmin } from '../middlewares/roles';

const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads');
const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      return cb(new Error(`Formato no permitido. Usá: ${ALLOWED.join(', ')}`));
    }
    cb(null, true);
  },
});

// ── Upload del foro: imágenes de posts/replies (multitenant por id) ──
// 09-spec G4.1: whitelist por MIME (jpeg/png/webp/gif) + límite 8 MB.
const FORUM_ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const FORUM_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const forumStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const type = req.path.includes('posts') ? 'posts' : 'replies';
    const id = req.params.id || 'tmp';
    const dir = path.join(UPLOAD_DIR, 'forum', type, String(id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `img-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const forumUpload = multer({
  storage: forumStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB (09-spec G4.1)
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!FORUM_ALLOWED_EXT.includes(ext) || !FORUM_ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error(`Formato no permitido. Usá: ${FORUM_ALLOWED_MIME.join(', ')} (máx 8 MB)`));
    }
    cb(null, true);
  },
});

export function uploadSingle(field: string) {
  return [requireAdmin, upload.single(field), (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'No se recibió ninguna imagen' } });
    const publicUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({ data: { url: publicUrl, filename: req.file.filename, size: req.file.size } });
  }];
}

export function uploadSingleAuthenticated(field: string) {
  return [upload.single(field), (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return res.status(400).json({ error: { code: 'NO_FILE', message: 'No se recibió ninguna imagen' } });
    const publicUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({ data: { url: publicUrl, filename: req.file.filename, size: req.file.size } });
  }];
}

export function serveUploads(app: import('express').Express) {
  // CORP cross-origin + ACAO para que las <img> de la web/móvil (localhost:5173/:19006) puedan mostrar los /uploads
  app.use('/uploads', (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Allow-Origin', '*');
    next();
  }, express.static(UPLOAD_DIR, { maxAge: '7d' }));
}
