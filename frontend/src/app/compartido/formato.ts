/** Formatos para mostrar datos al cliente en español de Colombia. */

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** 320000 → "$ 320.000" */
export function formatearPesos(valor: number): string {
  return pesos.format(valor);
}

/** "16:00" → "4 p. m.", "08:30" → "8:30 a. m.", "24:00" → "12 a. m." */
export function horaLegible(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const sufijo = h < 12 || h === 24 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${sufijo}` : `${h12} ${sufijo}`;
}

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/**
 * Describe días de la semana (0 = domingo) en lenguaje natural.
 * [1,2,3,4,5] → "de lunes a viernes", [5,6,0] → "de viernes a domingo",
 * los 7 → "todos los días", [1,3] → "lunes y miércoles".
 */
export function describirDias(dias: readonly number[]): string {
  if (dias.length === 7) return 'todos los días';
  if (dias.length === 0) return '';

  // ¿Forman una racha consecutiva (dando la vuelta de sábado a domingo)?
  const conjunto = new Set(dias);
  const inicio = dias.find((d) => !conjunto.has((d + 6) % 7));
  if (inicio !== undefined && dias.length > 2) {
    let fin = inicio;
    while (conjunto.has((fin + 1) % 7) && (fin + 1) % 7 !== inicio) fin = (fin + 1) % 7;
    const largo = ((fin - inicio + 7) % 7) + 1;
    if (largo === dias.length) return `de ${NOMBRES_DIAS[inicio]} a ${NOMBRES_DIAS[fin]}`;
  }

  const nombres = dias.map((d) => NOMBRES_DIAS[d]);
  return nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}
