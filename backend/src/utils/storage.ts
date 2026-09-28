import path from 'path';
import fs from 'fs';

import { createClient } from '@supabase/supabase-js';

/**
 * Almacenamiento de imágenes subidas por usuarios (avatar, logo de tienda, fotos de
 * producto, imágenes de foro). En producción usa Supabase Storage (bucket público);
 * si no hay credenciales configuradas (desarrollo local), cae a disco local bajo
 * backend/uploads, servido por serveUploads() en upload.ts.
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'lacase-uploads';

export const isRemoteStorageEnabled = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const supabase = isRemoteStorageEnabled ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!) : null;

const LOCAL_UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads');

function randomName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

/**
 * Sube un archivo en memoria (buffer de multer) al almacenamiento configurado y
 * devuelve la URL pública para guardar en la base de datos.
 * `folder` agrupa los archivos dentro del bucket/carpeta local (ej. "avatars", "products",
 * "forum/posts/123").
 */
export async function uploadBuffer(buffer: Buffer, folder: string, originalName: string, contentType: string): Promise<string> {
  const filename = randomName(originalName);
  const objectPath = `${folder}/${filename}`;

  if (supabase) {
    const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(objectPath, buffer, {
      contentType,
      upsert: false,
    });
    if (error) throw new Error(`Error al subir la imagen a Supabase Storage: ${error.message}`);
    const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(objectPath);
    return data.publicUrl;
  }

  const dir = path.join(LOCAL_UPLOAD_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}
