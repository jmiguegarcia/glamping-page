import { createHash } from 'node:crypto';
import { eventoAutentico, firmaIntegridad } from './firmas.js';

const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');

describe('firmaIntegridad', () => {
  it('concatena referencia + monto en centavos + moneda + secreto', () => {
    const firma = firmaIntegridad({ referencia: 'CP-ABC123-1', montoEnCentavos: 32000000, moneda: 'COP', secreto: 'test_integrity_x' });
    expect(firma).toBe(sha256('CP-ABC123-132000000COPtest_integrity_x'));
    expect(firma).toMatch(/^[0-9a-f]{64}$/);
  });

  it('incluye la fecha de expiración antes del secreto cuando se usa', () => {
    const firma = firmaIntegridad({
      referencia: 'R',
      montoEnCentavos: 100,
      moneda: 'COP',
      expiracion: '2026-11-01T15:30:00.000Z',
      secreto: 's',
    });
    expect(firma).toBe(sha256('R100COP2026-11-01T15:30:00.000Zs'));
  });
});

describe('eventoAutentico', () => {
  const SECRETO = 'test_events_secreto';
  const crearEvento = (transaccion: { id: string; status: string; amount_in_cents: number }, secreto = SECRETO) => {
    const timestamp = 1761840000;
    const props = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
    const valores = `${transaccion.id}${transaccion.status}${transaccion.amount_in_cents}`;
    return {
      event: 'transaction.updated',
      data: { transaction: transaccion },
      signature: { properties: props, checksum: sha256(`${valores}${timestamp}${secreto}`).toUpperCase() },
      timestamp,
    };
  };
  const tx = { id: '1234-1610641025-49201', status: 'APPROVED', amount_in_cents: 4490000, reference: 'CP-X-1' };

  it('acepta un evento firmado con nuestro secreto (sin importar mayúsculas del checksum)', () => {
    expect(eventoAutentico(crearEvento(tx), SECRETO)).toBe(true);
  });

  it('rechaza un evento firmado con otro secreto', () => {
    expect(eventoAutentico(crearEvento(tx, 'otro'), SECRETO)).toBe(false);
  });

  it('rechaza un evento cuyo monto fue alterado después de firmarlo', () => {
    const evento = crearEvento(tx);
    (evento.data.transaction as Record<string, unknown>).amount_in_cents = 100;
    expect(eventoAutentico(evento, SECRETO)).toBe(false);
  });

  it('rechaza cuerpos que no tienen forma de evento', () => {
    expect(eventoAutentico({ hola: 'mundo' }, SECRETO)).toBe(false);
    expect(eventoAutentico(null, SECRETO)).toBe(false);
  });
});
