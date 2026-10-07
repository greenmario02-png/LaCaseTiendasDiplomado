/**
 * Costo (factor de trabajo) de bcrypt para cifrar contraseñas: 2^12 rondas.
 * Es la recomendación actual (OWASP); antes era 10. Los hashes ya guardados siguen siendo válidos:
 * bcrypt guarda el costo dentro de cada hash, y solo las contraseñas nuevas usan el valor de aquí.
 */
export const BCRYPT_COST = 12;
