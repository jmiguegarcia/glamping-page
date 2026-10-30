import { HORARIOS, POLITICA_CANCELACION } from './negocio.js';

describe('configuración del negocio', () => {
  it('el día de sol cabe entre el check-out y el check-in', () => {
    // Las comparaciones de "HH:mm" como texto funcionan porque tienen el mismo formato.
    expect(HORARIOS.checkOut <= HORARIOS.diaDeSol.inicio).toBe(true);
    expect(HORARIOS.diaDeSol.inicio < HORARIOS.diaDeSol.fin).toBe(true);
    expect(HORARIOS.diaDeSol.fin <= HORARIOS.checkIn).toBe(true);
  });

  it('la política de cancelación va de mayor a menor anticipación', () => {
    const horas = POLITICA_CANCELACION.map((r) => r.horasMinimas);
    expect(horas).toEqual([...horas].sort((a, b) => b - a));
  });
});
