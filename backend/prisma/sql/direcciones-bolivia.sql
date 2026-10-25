-- Direcciones con formato de Bolivia: no existe código postal y la división administrativa es el DEPARTAMENTO.
--  1) "addresses"."postalCode" pasa a NULLABLE (opcional; sirve si algún día se abre a otros países). Los datos
--     existentes se conservan; solo los CP vacíos/en blanco pasan a NULL.
--  2) La columna "state" se mantiene con ese nombre (la usan API, web y móvil) y guarda el departamento: los valores
--     que ya son uno de los 9 escritos de otra forma ("la paz", "POTOSI", " Santa cruz ") se guardan con el nombre
--     oficial. Los que no son un departamento se dejan tal cual (el usuario los corrige al editar la dirección).
-- Equivale a `postalCode String?` del modelo Address en schema.prisma. IDEMPOTENTE (repetible). Este proyecto no usa
-- un runner de SQL de despliegue (ver README: el flujo normal es `npx prisma db push`); este script es de referencia
-- para normalizar datos existentes en una base con filas antiguas, por ejemplo:
--   psql "$DATABASE_URL" -f prisma/sql/direcciones-bolivia.sql   y después: npx prisma generate
BEGIN;

ALTER TABLE "addresses" ALTER COLUMN "postalCode" DROP NOT NULL;

UPDATE "addresses" SET "postalCode" = NULL WHERE "postalCode" IS NOT NULL AND btrim("postalCode") = '';

UPDATE "addresses" a
   SET "state" = d.nombre
  FROM (VALUES
    ('beni', 'Beni'),
    ('chuquisaca', 'Chuquisaca'),
    ('cochabamba', 'Cochabamba'),
    ('la paz', 'La Paz'),
    ('oruro', 'Oruro'),
    ('pando', 'Pando'),
    ('potosi', 'Potosí'),
    ('santa cruz', 'Santa Cruz'),
    ('tarija', 'Tarija')
  ) AS d(clave, nombre)
 WHERE regexp_replace(lower(btrim(translate(a."state", 'ÁÉÍÓÚáéíóúÜü', 'AEIOUaeiouUu'))), '\s+', ' ', 'g') = d.clave
   AND a."state" <> d.nombre;

COMMIT;
