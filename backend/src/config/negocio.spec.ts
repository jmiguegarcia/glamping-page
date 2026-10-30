import { DIA_DE_SOL, ESTADIA, OCASIONAL, POLITICA_CANCELACION } from './negocio.js';

/** "HH:mm" → minutos desde medianoche ("24:00" = 1440). */
const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

describe('configuración del negocio', () => {
  it('el check-out es antes del check-in (la cabaña queda libre entre estadías)', () => {
    expect(minutos(ESTADIA.checkOut)).toBeLessThan(minutos(ESTADIA.checkIn));
  });

  it('el día de sol empieza antes de terminar', () => {
    expect(minutos(DIA_DE_SOL.inicio)).toBeLessThan(minutos(DIA_DE_SOL.fin));
  });

  it('el bloque ocasional cabe en su rango permitido', () => {
    const rango = minutos(OCASIONAL.finMasTardio) - minutos(OCASIONAL.inicioMasTemprano);
    expect(OCASIONAL.duracionHoras * 60).toBeLessThanOrEqual(rango);
  });

  it('los días configurados son válidos (0–6)', () => {
    for (const dia of [...ESTADIA.diasTarifaFinDeSemana, ...DIA_DE_SOL.dias, ...OCASIONAL.dias]) {
      expect(dia).toBeGreaterThanOrEqual(0);
      expect(dia).toBeLessThanOrEqual(6);
    }
  });

  it('la política de cancelación va de mayor a menor anticipación', () => {
    const horas = POLITICA_CANCELACION.map((r) => r.horasMinimas);
    expect(horas).toEqual([...horas].sort((a, b) => b - a));
  });
});
