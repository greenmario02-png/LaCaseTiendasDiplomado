import { BOLIVIA_DEPARTMENTS, canonicalDepartment } from '../src/data/boliviaDepartments';
import { createAddressSchema, updateAddressSchema } from '../src/schemas/address.schemas';

describe('canonicalDepartment (unitaria)', () => {
  it('son exactamente los 9 departamentos de Bolivia', () => {
    expect([...BOLIVIA_DEPARTMENTS].sort()).toEqual(['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija']);
  });

  it.each([
    ['La Paz', 'La Paz'],
    ['la paz', 'La Paz'],
    ['  LA   PAZ ', 'La Paz'],
    ['potosi', 'Potosí'],
    ['Potosí', 'Potosí'],
    ['santa cruz', 'Santa Cruz'],
    ['Departamento de Tarija', 'Tarija'],
    ['Dpto. Beni', 'Beni'],
  ])('%p -> %p', (input, expected) => {
    expect(canonicalDepartment(input)).toBe(expected);
  });

  it.each(['', 'CABA', 'Santa Cruz de la Sierra', 'El Alto', 'Provincia', null, undefined, 3])('%p no es un departamento', (input) => {
    expect(canonicalDepartment(input)).toBeNull();
  });
});

describe('address.schemas (unitaria)', () => {
  const base = { street: 'Calle Sucre', number: '10', city: 'Tarija', state: 'tarija' };

  it('crear: CP ausente o vacío -> null; departamento con su nombre oficial', () => {
    expect(createAddressSchema.parse({ body: base }).body).toMatchObject({ state: 'Tarija', postalCode: null, number: '10' });
    expect(createAddressSchema.parse({ body: { ...base, postalCode: '' } }).body.postalCode).toBeNull();
    expect(createAddressSchema.parse({ body: { ...base, postalCode: ' 0001 ' } }).body.postalCode).toBe('0001');
  });

  it('crear: departamento fuera de la lista o ausente -> error; ignora campos extra como userId', () => {
    expect(createAddressSchema.safeParse({ body: { ...base, state: 'CABA' } }).success).toBe(false);
    expect(createAddressSchema.safeParse({ body: { street: 'x', number: '1', city: 'y' } }).success).toBe(false);
    expect(createAddressSchema.parse({ body: { ...base, userId: 99 } }).body).not.toHaveProperty('userId');
  });

  it('editar: CP ausente no se toca, vacío lo quita', () => {
    expect(updateAddressSchema.parse({ body: { isDefault: true } }).body.postalCode).toBeUndefined();
    expect(updateAddressSchema.parse({ body: { postalCode: '' } }).body.postalCode).toBeNull();
    expect(updateAddressSchema.safeParse({ body: { state: 'Santa Fe' } }).success).toBe(false);
  });
});
