/**
 * Firmas de Wompi (https://docs.wompi.co). Funciones puras para poder probarlas.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

const sha256 = (texto: string) => createHash('sha256').update(texto, 'utf8').digest('hex');

/**
 * Firma de integridad del checkout: demuestra a Wompi que el monto y la referencia los
 * definió nuestro servidor (el cliente no puede cambiar el precio en la URL).
 * SHA256( referencia + montoEnCentavos + moneda + [fechaExpiracion] + secretoIntegridad )
 */
export function firmaIntegridad(datos: {
  referencia: string;
  montoEnCentavos: number;
  moneda: string;
  expiracion?: string; // ISO 8601, si se usa expiration-time en el checkout
  secreto: string;
}): string {
  return sha256(`${datos.referencia}${datos.montoEnCentavos}${datos.moneda}${datos.expiracion ?? ''}${datos.secreto}`);
}

export interface EventoWompi {
  event: string;
  data: Record<string, unknown>;
  signature: { properties: string[]; checksum: string };
  timestamp: number;
}

/**
 * Verifica que un evento (webhook) lo envió Wompi y no fue alterado.
 * SHA256( valores de signature.properties dentro de data, en orden + timestamp + secretoEventos )
 * Las propiedades pueden cambiar entre eventos, por eso se leen del propio evento.
 */
export function eventoAutentico(evento: unknown, secretoEventos: string): evento is EventoWompi {
  if (!esEvento(evento)) return false;

  const valores = evento.signature.properties.map((ruta) => valorEn(evento.data, ruta));
  if (valores.some((v) => v === undefined)) return false;

  const esperado = sha256(`${valores.join('')}${evento.timestamp}${secretoEventos}`);
  return mismoHex(esperado, evento.signature.checksum);
}

/** "transaction.amount_in_cents" → data.transaction.amount_in_cents, como texto. */
function valorEn(objeto: unknown, ruta: string): string | undefined {
  let actual: unknown = objeto;
  for (const parte of ruta.split('.')) {
    if (typeof actual !== 'object' || actual === null) return undefined;
    actual = (actual as Record<string, unknown>)[parte];
  }
  // Solo valores simples: un objeto o arreglo no puede formar parte de la firma.
  return typeof actual === 'string' || typeof actual === 'number' || typeof actual === 'boolean'
    ? String(actual)
    : undefined;
}

function esEvento(valor: unknown): valor is EventoWompi {
  const e = valor as Partial<EventoWompi> | null;
  return (
    typeof e === 'object' &&
    e !== null &&
    typeof e.event === 'string' &&
    typeof e.data === 'object' &&
    e.data !== null &&
    Array.isArray(e.signature?.properties) &&
    typeof e.signature?.checksum === 'string' &&
    typeof e.timestamp === 'number'
  );
}

/** Compara dos hashes hex sin distinguir mayúsculas y en tiempo constante (evita ataques de tiempo). */
function mismoHex(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase());
  const y = Buffer.from(b.toLowerCase());
  return x.length === y.length && timingSafeEqual(x, y);
}
