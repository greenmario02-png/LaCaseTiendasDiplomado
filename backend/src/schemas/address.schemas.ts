import { z } from 'zod';

import { BOLIVIA_DEPARTMENTS, canonicalDepartment } from '../data/boliviaDepartments';

/**
 * Direcciones con formato de Bolivia: no hay código postal (queda OPCIONAL, útil si algún día se abre a otros
 * países) y la columna `state` guarda el DEPARTAMENTO, validado contra la lista cerrada de los 9 y guardado con su
 * nombre oficial (p. ej. "potosi" -> "Potosí").
 */
const DEPARTMENT_MESSAGE = `Elige un departamento de Bolivia: ${BOLIVIA_DEPARTMENTS.join(', ')}`;

const text = (max: number) => z.string().trim().max(max);

const department = z
  .string({ required_error: 'El departamento es obligatorio' })
  .transform((v, ctx) => {
    const dep = canonicalDepartment(v);
    if (!dep) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: DEPARTMENT_MESSAGE });
      return z.NEVER;
    }
    return dep;
  });

/** Vacío o ausente -> null (Bolivia no usa código postal). */
const postalCode = z
  .union([text(20), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

const fields = {
  street: text(200).min(1, 'La calle es obligatoria'),
  number: text(20),
  floor: z.union([text(50), z.null()]),
  city: text(120).min(1, 'La ciudad es obligatoria'),
  state: department,
  postalCode,
  isDefault: z.boolean(),
};

export const createAddressSchema = z.object({
  body: z.object({
    ...fields,
    number: fields.number.default(''),
    floor: fields.floor.optional(),
    isDefault: fields.isDefault.optional(),
  }),
});

export const updateAddressSchema = z.object({
  body: z.object({
    street: fields.street.optional(),
    number: fields.number.optional(),
    floor: fields.floor.optional(),
    city: fields.city.optional(),
    state: fields.state.optional(),
    // En la edición, ausente = no tocar; vacío o null = quitar el código postal.
    postalCode: z.union([text(20), z.null()]).optional().transform((v) => (v === undefined ? undefined : v || null)),
    isDefault: fields.isDefault.optional(),
  }),
});
